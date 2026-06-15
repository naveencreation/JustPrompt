# Code-Level Execution Analysis

---

## 1. Complete Call Graph

### Layer 0: `lib/config.ts` — Bootstrap (runs once at import time)

```
parseEnv()                             [lib/config.ts:48-63]
  ├── inputs: process.env
  ├── outputs: typed Config object
  ├── side effects: THROWS on startup if REVALIDATE_SECRET, SUPABASE_SERVICE_ROLE_KEY, etc. are missing
  ├── exceptions: Error("Environment validation failed:\n...") — UNHANDLED, crashes startup
  │   - Caught: no
  │   - Logged: no (just thrown)
  │   - Retry: no
  └── test mode: returns partial schema (allows missing vars)
      browser mode: returns partial schema (server-only vars not exposed to client)
```

---

### Layer 1: `lib/db/client.ts` — Supabase Client Factories

```
createBrowserClient()                  [client.ts:10-12]
  ├── called by: client components (useModels.ts via SWR, etc.)
  ├── inputs: (none)
  ├── calls: _createBrowserClient(config.supabase.url, config.supabase.anonKey)
  ├── outputs: SupabaseClient (anon key — RLS enforced)
  ├── side effects: none
  └── exceptions: none (no validation)

createRouteClient()                    [client.ts:15-33]
  ├── called by: lib/auth/index.ts (all 3 guards), authService.signIn/signOut
  ├── inputs: (none, reads cookies from next/headers)
  ├── calls: _createServerClient(url, anonKey, { cookies: { getAll, setAll } })
  ├── outputs: SupabaseClient (anon key, reads auth cookies)
  ├── side effects: cookieStore.set() — BUT catch{} silently ignores errors
  │                 (setAll called from Server Components where cookies are read-only)
  └── exceptions: none (silent catch in setAll)

createAdminClient()                    [client.ts:36-39]
  ├── called by: EVERY repo method (40+ call sites), /api/health
  ├── inputs: (none)
  ├── calls: createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  ├── outputs: SupabaseClient (SERVICE ROLE — RLS BYPASSED)
  └── exceptions: none (runtime only if env vars missing, caught at parseEnv)
```

---

### Layer 2: `lib/auth/index.ts` — Auth Guards

```
AuthError                              [auth/index.ts:8-16]
  ├── extends Error
  ├── properties: status (number), message (string)
  └── NOT a Zod schema — free-form thrown in guards

requireAdminSession()                  [auth/index.ts:18-27]
  ├── called by: requireAdminMutation(), GET handlers (settings), admin layout
  ├── inputs: (none — reads cookies from request)
  ├── calls: createRouteClient() → supabase.auth.getUser()
  ├── outputs: User | throws AuthError(401)
  ├── exceptions:
  │   AuthError(401, "Authentication required") — HANDLED by route handlers (catch → NextResponse 401)
  │   Supabase SDK errors (network, etc.) — NOT HANDLED here, propagates up
  └── concurrency note: no shared state, safe for parallel calls

requireAdminMutation()                 [auth/index.ts:34-45]
  ├── called by: POST/PUT/DELETE admin API routes
  ├── inputs: (none)
  ├── calls: requireAdminSession() → rateLimit.check(`admin:${user.id}`, 60, 60s)
  ├── outputs: User | throws AuthError(401) or AuthError(429)
  ├── exceptions:
  │   AuthError(401) — no session
  │   AuthError(429) — rate limited
  │   errors.capture() NOT called for these (intentional — expected failures)
  └── race condition: rateLimit.check() and session may be from different instances (memory mode)

getOptionalSession()                   [auth/index.ts:47-55]
  ├── called by: admin/(authenticated)/layout.tsx
  ├── inputs: (none)
  ├── calls: createRouteClient() → supabase.auth.getUser()
  ├── outputs: User | null (NEVER throws)
  ├── exceptions: caught internally → returns null
  └── IS logged? NO — intentional silent failure
```

---

### Layer 3: `lib/repos/` — Data Access Objects (7 files)

#### 3a. `imageRepo` [lib/repos/imageRepo.ts]

```
fromRow(row: ImageRow): Image          [line 47-61]
  ├── pure data mapper: snake_case → camelCase
  └── NO validation — assumes DB returns correct shape

toSnakeCase(input: CreateImageInput)   [line 6-18]
  ├── pure data mapper: camelCase → snake_case

imageRepo.findById(id: ImageId)        [line 72-76]
  ├── called by: imageService.getById(), adminService (get mostLiked), imageService.delete()
  ├── calls: createAdminClient() → supabase.from("images").select("*").eq("id", id).single()
  ├── outputs: Image | null
  ├── DB table: images
  ├── exceptions: none caught here — Supabase errors propagate
  └── cache: NO

imageRepo.findBySlug(slug: string)     [line 78-82]
  ├── called by: imageService.getBySlug()
  ├── calls: createAdminClient() → supabase.from("images").select("*").eq("slug", slug).maybeSingle()
  ├── outputs: Image | null
  ├── DB table: images (images_slug_idx)
  └── cache: NO (service layer caches)

imageRepo.listPublished(opts)          [line 84-136]
  ├── called by: imageService.listGallery(), imageService.getRelated() (fallback), tagService.listPopularWithPreviews()
  ├── input: { before?: Cursor, limit?: number (default 24), sort?: Sort (default "new"), tagSlug?: string, excludeId?: ImageId }
  ├── calls:
  │   createAdminClient()
  │   supabase.from("tags").select("id").eq("slug", tagSlug).single()  — if tagSlug provided
  │   supabase.from("image_tags").select("image_id").eq("tag_id", id)   — if tag found
  │   supabase.from("images").select("*")
  │     .eq("is_published", true)
  │     .neq("id", excludeId)             — if excludeId
  │     .or(`created_at.lt.${cursor.createdAt},and(...)`) — cursor pagination
  │     .in("id", [...ids])               — if tag filtering
  │     .order("created_at", { ascending: false })
  │     .order("id", { ascending: false })
  │     .limit(limit)
  │   encodeCursor(last.createdAt, last.id)
  ├── outputs: { items: Image[], nextCursor: string | null }
  ├── DB tables: images, tags, image_tags
  ├── indexes touched: images_created_idx (partial, published only), images_slug_idx (unique)
  ├── exceptions:
  │   Error(`imageRepo.listPublished failed: ${error.message}`) — NOT caught here
  │   Tag sub-query: `.single()` may throw if tag doesn't exist — handled silently (empty items)
  └── concurrency: tag sub-query runs SEQUENTIALLY (not parallel with main query)

imageRepo.listAll(opts)                [line 138-165]
  ├── called by: adminService.getDashboardStats(), admin/manage page.tsx
  ├── inputs: { limit?: number (default 50), status?: "published"|"draft", tagSlug?: string }
  ├── calls: same pattern as listPublished WITHOUT cursor pagination, ordered by display_order ASC + created_at DESC
  ├── outputs: Image[]
  ├── DB tables: images, tags, image_tags
  └── exceptions: Error(`imageRepo.listAll failed: ${error.message}`)

imageRepo.create(input)                [line 167-175]
  ├── called by: imageService.create()
  ├── input: CreateImageInput
  ├── calls: createAdminClient() → supabase.from("images").insert(toSnakeCase(input)).select().single()
  ├── outputs: Image
  ├── DB table: images (INSERT)
  ├── side effects: triggers fire — on_image_update() builds search_vector
  └── exceptions: Error(`imageRepo.create failed: ${error?.message}`)

imageRepo.update(id, input)            [line 177-195]
  ├── called by: imageService.update()
  ├── calls: createAdminClient() → supabase.from("images").update(patch).eq("id", id).select().single()
  ├── outputs: Image
  ├── DB table: images (UPDATE)
  ├── side effects: trigger on_image_update() rebuilds search_vector if search_tags or model changed
  ├── NOTE: patch only includes specific fields (prompt, description, model, isPublished, imageUrl, slug)
  │         — NOT width/height/storageKey/storageProvider (immutable)
  └── exceptions: Error(`imageRepo.update failed: ${error?.message}`)

imageRepo.updateOrder(updates[])       [line 197-202]
  ├── called by: imageService.updateOrder()
  ├── input: { id: ImageId, displayOrder: number }[]
  ├── calls: Promise.all(updates.map(u => supabase.from("images").update({display_order}).eq("id", u.id)))
  ├── outputs: void
  ├── DB table: images (N individual UPDATEs in parallel)
  ├── concurrency: N parallel writes — NO transaction, partial failure possible
  │                If one update fails, the rest still succeed
  └── exceptions: supabase errors propagate (silently swallowed — NO throw, NO error capture)

imageRepo.delete(id)                   [line 204-208]
  ├── called by: imageService.delete()
  ├── calls: createAdminClient() → supabase.from("images").delete().eq("id", id)
  ├── outputs: void
  ├── DB table: images (DELETE, CASCADE to like_counts, copy_counts, view_counts, image_tags)
  ├── side effects: storage object NOT deleted here — imageService.delete() handles it
  └── exceptions: Error(`imageRepo.delete failed: ${error.message}`)

imageRepo.listRelated(opts)            [line 210-240]
  ├── called by: imageService.getRelated()
  ├── calls: image_tags JOIN → deduplicate IDs → images SELECT with .eq("is_published", true)
  ├── outputs: Image[]
  ├── DB tables: image_tags, images
  └── exceptions: Error(`imageRepo.listRelated join query failed: ...`) + Error(`imageRepo.listRelated failed: ...`)

imageRepo.count()                      [line 242-249]
  ├── called by: adminService.getDashboardStats(), imageService.getAdminStats()
  ├── calls: createAdminClient() → supabase.from("images").select("*", { count: "exact", head: true })
  ├── outputs: number (count of ALL images, not just published)
  └── exceptions: Error(`imageRepo.count failed: ${error.message}`)
```

#### 3b. `likeRepo` [lib/repos/likeRepo.ts]

```
likeRepo.getCount(imageId)             [line 6-14]
  ├── calls: createAdminClient() → supabase.from("like_counts").select("count").eq("image_id", imageId).maybeSingle()
  ├── outputs: number (defaults to 0)
  ├── DB table: like_counts
  └── exceptions: none (defaults to 0 — returns count ?? 0)

likeRepo.upsertCount(imageId, count)   [line 16-22]
  ├── calls: createAdminClient() → supabase.from("like_counts").upsert({image_id, count}, {onConflict: "image_id"})
  ├── outputs: void
  ├── DB table: like_counts (UPSERT)
  ├── side effects: trigger set_updated_at() fires
  └── exceptions: Error(`likeRepo.upsertCount failed: ${error.message}`)

likeRepo.incrementBy(imageId, delta)   [line 24-43]
  ├── called by: likeService.like() (memory mode), likeService.flushAll()
  ├── calls:
  │   1. upsert { count: 0 } with ignoreDuplicates: true (ensure row exists)
  │   2. supabase.rpc("increment_like_count", { p_image_id, p_delta })
  │   3. FALLBACK (if RPC fails): getCount() → upsertCount(count + delta)
  ├── outputs: void
  ├── DB table: like_counts (UPSERT + RPC or read-then-write)
  ├── exceptions:
  │   RPC error → caught, fallback to read-then-write
  │   Fallback error → NOT caught (propagates)
  ├── RETRY: implicit via fallback pattern (if RPC doesn't exist, uses direct write)
  └── race condition: READ-then-WRITE is NOT atomic — two concurrent increments may lose counts
                       (only used when RPC fails, which should be rare)

likeRepo.getBatch(imageIds[])          [line 45-57]
  ├── called by: likeService.getBatch()
  ├── calls: createAdminClient() → supabase.from("like_counts").select("image_id, count").in("image_id", imageIds)
  ├── outputs: Record<string, number>
  └── exceptions: none (defaults to {} for empty input, data ?? {} for DB)

likeRepo.totalLikes()                  [line 59-64]
  ├── called by: likeService.totalLikes()
  ├── calls: createAdminClient() → supabase.from("like_counts").select("count")
  ├── outputs: number (reduce sum)
  ├── DB table: like_counts (ALL ROWS SCAN — no WHERE clause)
  └── exceptions: none (defaults to 0)

```

#### 3c. `metricRepo` [lib/repos/metricRepo.ts]

```
metricRepo.getCopyCount(imageId)       [mirrors likeRepo.getCount]
  ├── DB table: copy_counts
  └── exceptions: none (defaults to 0)

metricRepo.upsertCopyCount(id, count)  [mirrors likeRepo.upsertCount]
  ├── DB table: copy_counts
  └── exceptions: Error(`metricRepo.upsertCopyCount failed: ...`)

metricRepo.incrementCopyBy(id, delta)  [mirrors likeRepo.incrementBy — RPC + fallback]
  ├── DB table: copy_counts
  ├── RPC: "increment_copy_count"
  └── same race-condition risk on fallback

metricRepo.totalCopies()               [mirrors likeRepo.totalLikes]
  ├── DB table: copy_counts (ALL ROWS SCAN)
  └── exceptions: none (defaults to 0)

metricRepo.getViewCount(imageId)       [mirrors getCopyCount]
  ├── DB table: view_counts

metricRepo.incrementViewBy(id, delta)  [mirrors incrementCopyBy but fallback creates NEW admin client]
  ├── DB table: view_counts
  ├── RPC: "increment_view_count"
  ├── NOTE: fallback creates supabase2 (new createAdminClient()) — unlike copy/like which reuse this.getCount

metricRepo.totalViews()                [mirrors totalCopies]
  ├── DB table: view_counts (ALL ROWS SCAN)

metricRepo.topCopied(limit=10)         [line 105-115]
  ├── called by: adminService.getDashboardStats()
  ├── calls: createAdminClient() → supabase.from("copy_counts").select("image_id, count").order("count", {asc:false}).limit(limit)
  ├── outputs: { imageId, count }[]
  ├── DB table: copy_counts
  └── exceptions: none (returns [])
```

#### 3d. `tagRepo` [lib/repos/tagRepo.ts]

```
tagRepo.findOrCreate(name: string)     [line 8-27]
  ├── called by: imageService.create(), imageService.update()
  ├── calls:
  │   1. supabase.from("tags").select("*").eq("slug", slugify(name)).maybeSingle()
  │   2. if not found: supabase.from("tags").insert({name, slug}).select().single()
  ├── outputs: Tag
  ├── DB table: tags (SELECT + conditional INSERT)
  ├── exceptions: Error(`tagRepo.findOrCreate failed: ${error?.message}`)
  └── race condition: BETWEEN check and insert, another request could insert the same tag
                       (protected by UNIQUE constraint on slug — second insert would fail, not handled)

tagRepo.attachToImage(id, tagIds[])    [line 29-36]
  ├── called by: imageService.create(), imageService.update()
  ├── calls: supabase.from("image_tags").upsert(rows, {onConflict: "image_id,tag_id"})
  ├── DB table: image_tags (UPSERT, composite PK)
  ├── side effects: trigger on_image_tag_change() → updates images.search_tags → rebuilds search_vector
  └── exceptions: Error(`tagRepo.attachToImage failed: ${error.message}`)

tagRepo.detachAllFromImage(id)         [line 38-42]
  ├── called by: imageService.update()
  ├── calls: supabase.from("image_tags").delete().eq("image_id", id)
  ├── DB table: image_tags (DELETE)
  ├── side effects: same trigger chain as attach (rebuilds FTS)
  └── exceptions: Error(`tagRepo.detachAllFromImage failed: ${error.message}`)

tagRepo.findBySlug(slug)               [line 44-48]
  ├── called by: tagService.findBySlug()
  ├── outputs: Tag | null
  └── exceptions: none (returns null)

tagRepo.listByImage(imageId)           [line 50-57]
  ├── called by: tagService.listByImage(), /api/images/[id] GET
  ├── calls: supabase.from("image_tags").select("tags(*)").eq("image_id", imageId)
  ├── outputs: Tag[]
  └── exceptions: Error(`tagRepo.listByImage failed: ${error.message}`)

tagRepo.popular(limit=20)             [line 59-81]
  ├── called by: tagService.listPopular(), tagService.listPopularWithPreviews()
  ├── calls: supabase.from("image_tags").select("tag_id, tags(id, name, slug)").limit(500)
  ├── outputs: Array<Tag & { count: number }>
  ├── STRATEGY: fetches last 500 image_tags → in-memory Map count → sort → slice(limit)
  ├── limitations: only last 500 rows → recent bias, not truly "all-time popular"
  └── exceptions: Error(`tagRepo.popular failed: ${error.message}`)
```

#### 3e. `modelRepo` [lib/repos/modelRepo.ts]

```
modelRepo.listAll()                    [line 7-21]
  ├── called by: modelService.listAll()
  ├── calls: createAdminClient() → supabase.from("models").select("*").order("name", {asc: true})
  ├── outputs: ModelEntity[] (snake→camel mapped in-app)
  └── exceptions: Error(`modelRepo.listAll failed: ${error.message}`)

modelRepo.create(name, shortName)      [line 23-39]
  ├── called by: modelService.create()
  ├── calls: createAdminClient() → supabase.from("models").insert({slug, name, short_name}).select().single()
  ├── outputs: ModelEntity
  └── exceptions: Error(`modelRepo.create failed: ${error?.message}`)
```

#### 3f. `settingsRepo` [lib/repos/settingsRepo.ts]

```
settingsRepo.getSettings()              [line 22-30]
  ├── called by: adminService.getSettings(), admin dashboard pages
  ├── calls: createAdminClient() → supabase.from("settings").select("*").eq("id", 1).single()
  ├── outputs: Settings | null
  └── exceptions: none (returns null if not found)

settingsRepo.setFeaturedImage(id|null) [line 32-39]
  ├── calls: supabase.from("settings").update({featured_image_id}).eq("id", 1)
  ├── DB table: settings (UPDATE singleton)
  └── exceptions: Error(`settingsRepo.setFeaturedImage failed: ...`)

settingsRepo.setMaintenanceMode(bool)  [line 41-48]
  ├── calls: same pattern as setFeaturedImage
  └── exceptions: Error(`settingsRepo.setMaintenanceMode failed: ...`)

settingsRepo.getMostLikedImageId()     [line 50-57]
  ├── called by: adminService.getDashboardStats()
  ├── calls: supabase.from("like_counts").select("image_id, count").order("count", {asc: false}).limit(1)
  ├── outputs: ImageId | null
  └── exceptions: none (returns null)
```

#### 3g. `searchLogRepo` [lib/repos/searchLogRepo.ts]

```
searchLogRepo.logSearch(q, count)      [line 13-19]
  ├── called by: searchService.query() (fire-and-forget — .catch() only)
  ├── calls: createAdminClient() → supabase.from("search_logs").insert({query: q.trim().toLowerCase(), results_count: count})
  ├── DB table: search_logs (INSERT, append-only)
  └── exceptions: Error(`searchLogRepo.logSearch failed: ...`) — caught in searchService via .catch()

searchLogRepo.getTopQueries(limit=10)  [line 25-48]
  ├── called by: adminService.getDashboardStats()
  ├── calls: supabase.from("search_logs").select("query").order("created_at", {asc:false}).limit(500)
  ├── outputs: TopQueryRow[]
  ├── strategy: in-memory GROUP BY on last 500 rows
  └── exceptions: none (data ?? [])

searchLogRepo.getZeroResultQueries(limit=10) [line 55-72]
  ├── same pattern as getTopQueries but .eq("results_count", 0)
  └── exceptions: none (data ?? [])
```

---

### Layer 4: `lib/services/` — Business Logic (8 files)

#### 4a. `imageService` [lib/services/imageService.ts]

```
invalidateGalleryCache()               [line 22-25]
  ├── called by: imageService.create(), update(), delete(), updateOrder()
  ├── calls: cache.keys("gallery:*") → Promise.all(cache.del for each key)
  ├── output: void
  ├── cache keys touched: ALL gallery:* keys
  ├── exceptions: cache.keys() may return [] on error (Redis: caught, returns []; Memory: no errors)
  └── concurrency: all cache.del() calls in parallel — OK (independent keys)

imageService.listGallery(opts)         [line 28-39]
  ├── called by: app/page.tsx (SSR), /p/[slug], /t/[slug], /api/images GET
  ├── inputs: { cursor?: string, sort?: Sort, tagSlug?: string, limit?: number }
  ├── calls:
  │   1. decodeCursor(cursorStr) → Cursor | null
  │   2. cache.get(cacheKey) → check in-memory/Redis
  │   3. if miss: imageRepo.listPublished({ before, sort, tagSlug, limit })
  │   4. cache.set(cacheKey, result, CACHE_TTL.GALLERY = 60s)
  ├── outputs: { items: Image[], nextCursor: string | null }
  ├── cache keys: `gallery:${sort}:${tagSlug ?? ""}:${cursorStr ?? "start"}`
  ├── exceptions: imageRepo.listPublished() may throw → propagates, NOT caught
  └── concurrency: cache.get() and cache.set() are safe (Map for memory, Redis for distributed)

imageService.getBySlug(slug)            [line 41-49]
  ├── called by: app/(public)/p/[slug]/page.tsx
  ├── calls: cache.get(`image:slug:${slug}`) → if miss: imageRepo.findBySlug(slug) → cache.set(..., CACHE_TTL.IMAGE=3600s)
  ├── outputs: Image | null
  └── exceptions: imageRepo error propagates

imageService.getById(id)                [line 51-53]
  ├── called by: /api/images/[id] GET, adminService (mostLiked resolution)
  ├── calls: imageRepo.findById(id) — NO caching
  └── exceptions: imageRepo error propagates

imageService.listAll(opts)              [line 55-57]
  ├── called by: admin/manage page, admin dashboard
  ├── calls: imageRepo.listAll(opts) — NO caching
  └── exceptions: imageRepo error propagates

imageService.create(input)              [line 59-83]
  ├── called by: POST /api/images
  ├── calls:
  │   1. generateSlug(input.prompt) if slug not provided
  │   2. imageRepo.create(fullInput) → DB INSERT
  │   3. tagRepo.findOrCreate() × N → Promise.all  [PARALLEL]
  │   4. tagRepo.attachToImage()
  │   5. searchSync.index(image) → .catch(errors.capture)  [FIRE-AND-FORGET, non-blocking]
  │   6. if published: revalidateTag(CACHE_TAG.GALLERY) + invalidateGalleryCache()
  │   7. logger.info("image.created")
  ├── DB tables: images (INSERT), tags (INSERT if new), image_tags (INSERT)
  ├── side effects:
  │   - Postgres trigger rebuilds search_vector (immediate)
  │   - searchSync.index() → NoOp (Postgres) or Meilisearch REST
  │   - Next.js revalidateTag() busts ISR cache
  │   - cache.del() busts adapter cache
  ├── exceptions:
  │   - tagRepo.findOrCreate() failure → propagates, image exists with no tags
  │   - tagRepo.attachToImage() failure → propagates, tags created but not attached
  │   - searchSync.index() failure → CAUGHT via .catch(), errors.capture() logged, image created anyway
  │   - revalidateTag/cacheDel failure → NOT caught (assumed reliable)
  └── NO TRANSACTION: image can be created without tags if tags step fails

imageService.update(id, input)          [line 85-107]
  ├── called by: PUT /api/images/[id]
  ├── calls:
  │   1. imageRepo.update(id, input) → DB UPDATE
  │   2. if tags provided: tagRepo.detachAllFromImage(id) → tagRepo.attachToImage()
  │   3. searchSync.index(image).catch() [fire-and-forget]
  │   4. cache.del(`image:slug:${image.slug}`)
  │   5. revalidateTag(CACHE_TAG.GALLERY) + revalidateTag(CACHE_TAG.IMAGE(slug))
  ├── side effects: old tags deleted, new tags attached, FTS rebuilt by triggers
  ├── exceptions:
  │   - tagRepo.detachAll fails → tags not detached, old tags remain → inconsistent state
  │   - tagRepo.attachToImage fails → images exist with NO tags
  │   - searchSync failure → caught, logged, update proceeds
  └── NO TRANSACTION across tag operations

imageService.updateOrder(updates[])     [line 109-114]
  ├── called by: POST /api/images/reorder
  ├── calls: imageRepo.updateOrder(updates) → Promise.all of N separate UPDATEs
  ├── exceptions: individual update failures NOT caught in imageRepo.updateOrder, NOT logged
  └── partial failure risk: some images get reordered, others don't

imageService.delete(id)                 [line 116-134]
  ├── called by: DELETE /api/images/[id]
  ├── calls:
  │   1. imageRepo.findById(id) → get storageKey + slug for cleanup
  │   2. storage.delete(storageKey) → TRY/CATCH: failure logged but DB delete proceeds
  │   3. imageRepo.delete(id) → CASCADE DB delete
  │   4. searchSync.remove(id).catch() [fire-and-forget]
  │   5. cache.del(`image:slug:${slug}`) + revalidateTags + invalidateGalleryCache
  ├── exceptions:
  │   - storage.delete() failure → CAUGHT, errors.capture(), then DB delete proceeds
  │   - imageRepo.delete() failure → propagates
  │   - searchSync.remove() failure → CAUGHT via .catch()
  └── side effect: storage might still have the file even though DB record is gone
                   (if delete succeeds at storage level but DB fails later — but delete order prevents this)

imageService.getRelated(imageId, tagIds) [line 136-150]
  ├── called by: /p/[slug] page.tsx
  ├── calls: cache.get → if miss: imageRepo.listRelated() → fallback to listPublished if empty → cache.set
  ├── outputs: Image[]
  ├── cache key: `related:${imageId}`
  └── exceptions: listRelated error propagates

imageService.getAdminStats()            [line 152-155]
  ├── returns { totalImages, totalLikes: 0 } — PARTIAL, unused by dashboard (adminService has full version)
```

#### 4b. `likeService` [lib/services/likeService.ts]

```
likeService.like(imageId, ip)          [line 11-33]
  ├── called by: POST /api/like/[id]
  ├── calls:
  │   1. rateLimit.check(`like:${ip}:${imageId}`, 10, 3600s)
  │   2. if rate-limited: return { ok: false, count: getCount() }
  │   3. cache.incr(`like:${imageId}`) → delta counter
  │   4. if delta === 1: cache.set(`like:dirty:${imageId}`, "1", 86400s)
  │   5. if memory mode: likeRepo.incrementBy(imageId, 1) + cache.del(`like:${imageId}`)
  │   6. getCount() → persisted + cache delta
  │   7. logger.info("image.liked")
  ├── outputs: { ok: boolean, count: number }
  ├── DB touched: like_counts (incrementBy in memory mode; none in Redis mode)
  ├── cache keys: `like:${imageId}`, `like:dirty:${imageId}`
  ├── exceptions:
  │   - rateLimit.check() failure → propagates (network/Redis error returns false? no — redis.ts returns 0 on catch)
  │   - cache.incr failure → Redis: errors.capture(), returns 0; Memory: never fails
  │   - likeRepo.incrementBy failure → propagates (memory mode)
  └── race condition in Redis mode: cache.incr succeeds but cached delta not flushed until cron
                                    → getCount() returns persisted + delta (immediately visible)

likeService.getCount(imageId)           [line 35-39]
  ├── returns: likeRepo.getCount() + (cache.get(`like:${imageId}`) ?? 0)
  ├── Redis mode: returns immediate count including unflushed deltas
  └── exceptions: none (defaults to 0)

likeService.flushAll()                  [line 42-54]
  ├── called by: /api/cron/flush-likes, adminService.flushLikes()
  ├── calls:
  │   1. cache.keys("like:dirty:*") → find all dirty images
  │   2. for each: cache.get(`like:${imageId}`) → likeRepo.incrementBy(imageId, delta)
  │   3. cache.del(`like:${imageId}`) + cache.del(dirtyKey)
  │   4. logger.info("like.flushed")
  ├── SEQUENTIAL flush — not parallel (for...of loop)
  ├── exceptions: incrementBy failure → propagates, remaining images NOT flushed
  └── idempotent? YES — if cron runs twice, redundant increment may double-count
                        (dirtyKey is only deleted AFTER successful increment)

likeService.getBatch(imageIds[])        [line 56-65]
  ├── called by: /api/images GET (returns likeCounts), GalleryGrid initial render
  ├── calls: likeRepo.getBatch(imageIds) + Promise.all(cache.get for each id)
  ├── outputs: Record<string, number>
  └── exceptions: none (defaults to 0 for missing)

likeService.totalLikes()               [line 67-75]
  ├── called by: adminService.getDashboardStats()
  ├── calls: likeRepo.totalLikes() + sum of deltas from dirty keys
  └── exceptions: none (defaults to 0)

likeService.setLikeCount(imageId, count) [line 77-81]
  ├── called by: PUT /api/images/[id] (admin manually sets like count)
  ├── calls: cache.del(`like:${imageId}`), cache.del(`like:dirty:${imageId}`), likeRepo.upsertCount()
  └── exceptions: upsertCount error propagates
```

#### 4c. `metricService` [lib/services/metricService.ts]

```
metricService.recordCopy(imageId)       [line 17-32]
  ├── called by: POST /api/metrics/copy/[id]
  ├── calls:
  │   1. cache.incr(`copy:${imageId}`)
  │   2. if delta === 1: cache.set(`copy:dirty:${imageId}`, "1", 86400s)
  │   3. ALWAYS: metricRepo.incrementCopyBy(imageId, 1)  ← IMMEDIATE DB write
  │   4. if memory mode: cache.del(`copy:${imageId}`)
  │   5. logger.info("image.copied")
  ├── NOTE: unlike likeService, copy ALWAYS writes to DB immediately even in Redis mode
  │         (the comment says "Always write to DB" — intentional)
  ├── exceptions: incrementCopyBy failure → propagates
  └── cache keys: `copy:${imageId}`, `copy:dirty:${imageId}`

metricService.getCopyCount(imageId)     [line 34-38]
  ├── same pattern as likeService.getCount()

metricService.flushAllCopies()          [line 41-57]
  ├── called by: /api/cron/flush-likes (Promise.all with flushLikes)
  ├── same SEQUENTIAL pattern as likeService.flushAll()
  └── idempotent? YES — same risk as likeService if cron runs twice

metricService.totalCopies()             [line 59-61]
  ├── calls: metricRepo.totalCopies() — NO delta addition (copies always write to DB)
  └── output: number

metricService.recordView(imageId)       [line 65-68]
  ├── called by: POST /api/metrics/view/[id]
  ├── calls: metricRepo.incrementViewBy(imageId, 1) — DIRECT write, no cache
  ├── NO rate limiting, NO caching
  └── exceptions: incrementViewBy failure → propagates

metricService.totalViews()              [line 70-72]
  ├── calls: metricRepo.totalViews() — ALL ROWS SCAN
  └── output: number
```

#### 4d. `adminService` [lib/services/adminService.ts]

```
adminService.getDashboardStats()        [line 46-92]
  ├── called by: /admin/dashboard page.tsx
  ├── calls (PARALLEL — Promise.all):
  │   1. imageRepo.count()                 → totalImages
  │   2. likeService.totalLikes()          → totalLikes  (inc. deltas)
  │   3. metricService.totalCopies()       → totalCopies
  │   4. metricService.totalViews()        → totalViews
  │   5. imageRepo.listAll({limit:5})      → recentImages
  │   6. metricRepo.topCopied(10)          → copiedRows
  │   7. searchLogRepo.getTopQueries(5)    → topSearches (in-memory agg from 500 rows)
  │   8. searchLogRepo.getZeroResultQueries(5) → failedSearches
  │   9. settingsRepo.getMostLikedImageId() → mostLikedImageId (against like_counts)
  ├── SEQUENTIAL after parallel:
  │   10. imageRepo.findById(mostLikedImageId) → mostLiked
  │   11. for each topCopied: imageRepo.findById(row.imageId) + likeRepo.getCount() [SEQUENTIAL for...of]
  ├── outputs: DashboardStats
  ├── exceptions:
  │   - ANY of the 9 parallel queries fails → Promise.all rejects → ENTIRE dashboard fails
  │   - if mostLikedImageId is null → mostLiked = null (not an error)
  │   - imageRepo.findById() in topCopied loop → if null, skipped (not an error)
  └── concurrency: 9 parallel DB queries + then N sequential queries for topCopied hydration
                    (topCopied loop is NOT parallel — each iteration awaits)

adminService.getSettings()              [line 94-96]
  ├── returns settingsRepo.getSettings() — could be null if singleton row missing

adminService.setFeaturedImage(id|null)  [line 98-102]
  ├── calls: settingsRepo.setFeaturedImage() → revalidateTag(GALLERY) + revalidateTag(SETTINGS)
  └── exceptions: settingsRepo error propagates

adminService.toggleMaintenanceMode(bool) [line 104-108]
  ├── calls: settingsRepo.setMaintenanceMode() → revalidateTag(SETTINGS)
  └── exceptions: settingsRepo error propagates

adminService.flushLikes()               [line 110-113]
  ├── calls: likeService.flushAll() (SEQUENTIAL per-image loop)
  └── exceptions: propagates
```

#### 4e. `authService` [lib/services/authService.ts]

```
authService.signIn(email, password)     [line 9-20]
  ├── called by: POST /api/admin/auth
  ├── calls: createRouteClient() → supabase.auth.signInWithPassword({email, password})
  ├── outputs: AuthSession | null
  ├── side effects: Supabase sets httpOnly session cookies via createRouteClient's setAll
  ├── exceptions: error → logger.warn("admin.login_failed") → returns null (NOT thrown)
  └── NO errors.capture() for failed login (intentional — expected user error)

authService.signOut()                   [line 22-26]
  ├── called by: DELETE /api/admin/auth, AdminSidebar handleSignOut
  ├── calls: createRouteClient() → supabase.auth.signOut()
  ├── side effects: Supabase clears session cookies
  ├── exceptions: NOT caught → propagates to route handler → catch → 500
  └── logger.info("admin.logout") always called (even if signOut throws? no — would crash before)

  Wait — logger.info is BEFORE any throw. signOut() doesn't throw if successful.
  If supabase.auth.signOut() throws, logger.info never runs. OK.
```

#### 4f. `searchService` [lib/services/searchService.ts]

```
searchService.query(q, opts)           [line 16-29]
  ├── called by: GET /api/search
  ├── calls:
  │   1. decodeCursor(cursorStr)
  │   2. search.query(q, {cursor, limit}) → Postgres FTS or Meilisearch
  │   3. searchLogRepo.logSearch(q, items.length).catch(errors.capture)  [FIRE-AND-FORGET]
  ├── outputs: { items: Image[], nextCursor: string | null }
  ├── exceptions:
  │   - search.query() failure → PostgresSearch throws Error(`Search query failed: ...`)
  │   - searchLogRepo failure → CAUGHT via .catch(), errors.capture() logged
  │   - decodeCursor failure → returns null → cursor = null (fresh search)
  └── search log is UNawaited — response sent to client BEFORE log completes
```

#### 4g. `modelService` [lib/services/modelService.ts]

```
modelService.listAll()                  [line 9-15]
  ├── calls: cache.get("models:all") → if miss: modelRepo.listAll() → cache.set(3600s)
  ├── outputs: ModelEntity[]
  └── exceptions: modelRepo error propagates

modelService.create(name, shortName)    [line 17-21]
  ├── calls: modelRepo.create() → cache.del("models:all")
  └── exceptions: modelRepo error propagates
```

#### 4h. `tagService` [lib/services/tagService.ts]

```
tagService.listPopular(limit=16)        [line 15-22]
  ├── calls: cache.get(`tags:popular:${limit}`) → tagRepo.popular(limit) → cache.set(300s)
  ├── outputs: Array<Tag & { count: number }>
  └── exceptions: tagRepo error propagates

tagService.listPopularWithPreviews(limit=16) [line 24-42]
  ├── called by: /explore page.tsx
  ├── calls:
  │   1. cache.get
  │   2. if miss: tagRepo.popular(limit)
  │   3. for each tag: imageRepo.listPublished({tagSlug, limit: 1}) [PARALLEL — Promise.all]
  │   4. cache.set(300s)
  ├── outputs: TagWithPreview[]
  ├── concurrency: N parallel imageRepo.listPublished() calls (where N = up to 16 tags)
  │                each does a sub-query to find tag → image_tags → images
  └── exceptions: any listPublished failure → Promise.all rejects → ENTIRE function fails

tagService.listByImage(imageId)         [line 44-46]
  ├── calls: tagRepo.listByImage(imageId) — NO caching
  └── exceptions: tagRepo error propagates

tagService.findBySlug(slug)             [line 48-56]
  ├── calls: cache.get → tagRepo.findBySlug → cache.set(300s)
  └── exceptions: tagRepo error propagates
```

---

### Layer 5: Adapter Implementations

#### 5a. `lib/cache/` — Cache Adapters

```
MemoryCache.get(key)                   [memory.ts:26-33]
  ├── reads internal Map<string, Entry>
  ├── evicts expired entries on read
  └── returns T | null

MemoryCache.set(key, value, ttl?)      [memory.ts:35-44]
  ├── evicts oldest if Map.size >= maxSize (1000)
  └── stores { value, expiresAt }

MemoryCache.incr(key)                  [memory.ts:51-56]
  ├── get+1+set — NOT atomic
  └── race condition: two concurrent incr() on same key → counted twice (one might lose the value)

MemoryCache.keys(pattern)              [memory.ts:58-68]
  ├── iterates Map, tests regex, skips expired
  └── returns string[]

RedisCache.get(key)                    [redis.ts:54-62]
  ├── REST: POST {url} ["GET", key]
  ├── try/catch → errors.capture() on failure → returns null
  └── JSON.parse(result) — if bad JSON → throws → caught → returns null

RedisCache.set(key, value, ttl?)       [redis.ts:64-75]
  ├── REST: ["SET", key, JSON.stringify(value)] + optional ["EX", ttl]
  ├── try/catch → errors.capture() → silently fails
  └── NO confirmation — value may not be stored

RedisCache.incr(key)                   [redis.ts:77-85]
  ├── REST: ["INCR", key]
  ├── try/catch → errors.capture() → returns 0
  └── returns 0 if any error — indistinguishable from actual count of 0

RedisCache.keys(pattern)               [redis.ts:87-107]
  ├── REST: SCAN loop (cursor-based)
  ├── try/catch → errors.capture() → returns []
  └── returns [] if any error — indistinguishable from no keys
```

#### 5b. `lib/storage/` — Storage Adapters

```
SupabaseStorage.signedUploadUrl(filename) [supabase.ts:9-22]
  ├── calls: supabase.storage.from("images").createSignedUploadUrl(storageKey)
  ├── exceptions: error → logger.error → throw Error(...)
  └── outputs: SignedUploadResult (method: "PUT")

SupabaseStorage.delete(storageKey)      [supabase.ts:24-32]
  ├── calls: supabase.storage.from("images").remove([storageKey])
  ├── exceptions: error → logger.error → throw Error(...)
  └── outputs: void

SupabaseStorage.deleteMultiple(keys[])  [supabase.ts:34-43]
  ├── early return if keys.length === 0
  └── exceptions: error → logger.error → throw Error(...)

SupabaseStorage.publicUrl(storageKey)   [supabase.ts:45-49]
  ├── calls: supabase.storage.from("images").getPublicUrl(storageKey)
  └── outputs: string (URL)

CloudinaryStorage.signedUploadUrl(filename) [cloudinary.ts:52-72]
  ├── calls: sanitizePublicId(filename), signParams({public_id, timestamp}, secret)
  ├── outputs: SignedUploadResult (method: "POST", with fields)
  ├── uploadUrl: https://api.cloudinary.com/v1_1/${cloud}/image/upload
  └── exceptions: none (pure computation, no network)

CloudinaryStorage.delete(storageKey)    [cloudinary.ts:74-92]
  ├── REST: POST cloudinary destroy API
  ├── exceptions: !res.ok → logger.error → throw Error(...)
  └── 200 response with {result: "ok"|"not found"} both treated as success

CloudinaryStorage.deleteMultiple(keys[]) [cloudinary.ts:94-114]
  ├── REST: POST cloudinary delete_by_token
  └── exceptions: !res.ok → logger.error → throw Error(...)

CloudinaryStorage.publicUrl(storageKey) [cloudinary.ts:116-120]
  ├── no network — pure string computation
  └── returns: https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${key}
```

#### 5c. `lib/ratelimit/` — Rate Limit Adapters

```
MemoryRateLimit.check(key, limit, windowSec) [memory.ts:16-30]
  ├── reads/writes internal Map<string, Bucket>
  ├── sliding window: reset if expired, increment if under limit
  ├── outputs: boolean
  ├── race condition: NOT atomic — two concurrent checks on same key may both pass
  └── exceptions: none (synchronous operations)

RedisRateLimit.check(key, limit, windowSec) [redis.ts:52-78]
  ├── calls: pipeline([ZREMRANGEBYSCORE, ZCARD]) → count
  ├── if count >= limit: return false
  ├── if count < limit: pipeline([ZADD, EXPIRE]) → return true
  ├── exceptions: REST → Error("Upstash Redis error ...") — NOT caught in check() itself
  └── caller (likeService, auth) does NOT catch — if Redis network fails, rate limit check crashes
```

#### 5d. `lib/search/` — Search Adapters

```
PostgresSearch.query(q, opts)          [postgres.ts:14-41]
  ├── calls: createAdminClient() → supabase.from("images")
  │     .select("*").eq("is_published", true)
  │     .textSearch("search_vector", q, { type: "websearch", config: "english" })
  │     .order("created_at", {asc: false}).order("id", {asc: false}).limit(limit)
  ├── uses cursor pagination for subsequent pages
  ├── outputs: { items: Image[], nextCursor: string | null }
  ├── DB index: images_fts_idx (GIN on search_vector)
  └── exceptions: Error("Search query failed: ...")

MeilisearchSearch                     [meilisearch.ts:20-30]
  ├── CONSTRUCTOR THROWS Error("MeilisearchSearch is not implemented yet")
  └── query() throws Error("MeilisearchSearch.query not implemented")
```

#### 5e. `lib/search/sync.ts` — Search Index Sync

```
NoOpSearchSync.index(image)            [sync.ts:22-24]
  └── async no-op

NoOpSearchSync.remove(id)              [sync.ts:26-28]
  └── async no-op

MeilisearchSync.index(image)           [sync.ts:40-54]
  ├── REST: PUT /indexes/images/documents
  └── no error handling

MeilisearchSync.remove(imageId)        [sync.ts:56-62]
  ├── REST: DELETE /indexes/images/documents/${id}
  └── no error handling
```

#### 5f. `lib/observability/` — Logging & Errors

```
ConsoleLogger.log(level, event, meta)  [logger.ts:13-25]
  ├── outputs: JSON.stringify({level, event, ...meta, ts}) to console
  └── exceptions: none

AxiomLogger.send(level, event, meta)   [axiom.ts:28-50]
  ├── REST: POST https://api.axiom.co/v1/datasets/${dataset}/ingest
  ├── try/catch → silently fail
  └── NO return value — fire-and-forget

ConsoleErrorReporter.capture(err, ctx) [errors.ts:9-19]
  ├── outputs: console.error(JSON.stringify({level:"error", event:"error.captured", message, stack, ...ctx, ts}))
  └── exceptions: none

SentryErrorReporter.capture(err, ctx)  [sentry.ts:20-39]
  ├── outputs: console.error — SAME FORMAT as ConsoleErrorReporter but with source: "sentry"
  ├── TODO: integrate @sentry/nextjs
  └── exceptions: none

ConsoleClientErrorReporter.capture()   [clientErrors.ts:5-16]
  ├── same format, console.error
  └── exceptions: none
```

---

### Layer 6: `proxy.ts` — Next.js Middleware Logic

```
isMaintenanceMode()                    [proxy.ts:10-29]
  ├── called by: proxy() [every non-admin, non-API request]
  ├── calls: fetch(Supabase REST API: settings?id=eq.1&select=maintenance_mode)
  ├── cache: in-memory with expiry (60s TTL from TIMING.MAINTENANCE_CACHE_MS)
  ├── exceptions: try/catch → returns false (default to NOT in maintenance)
  └── outputs: boolean

proxy(request: NextRequest)            [proxy.ts:31-86]
  ├── called by: Next.js middleware (every request matching the matcher)
  ├── calls:
  │   1. supabase.auth.getUser() → check session
  │   2. if public route + not /maintenance: isMaintenanceMode() → rewrite to /maintenance
  │   3. if /admin/login + already logged in → redirect to /admin/dashboard
  │   4. if /admin/* + not logged in → redirect to /admin/login
  ├── matcher: all routes EXCEPT static files
  ├── side effects: session cookies synced between request and response
  └── exceptions: isMaintenanceMode() caught internally (defaults to false)
```

---

### Layer 7: API Route Handlers (17 endpoints)

All route handlers follow the same pattern:
```
try { validate → auth → service → response }
catch { if AuthError → appropriate status; else errors.capture → 500 }
```

| Endpoint | Auth | Zod Schema | Service Call | DB Touched |
|---|---|---|---|---|
| GET /api/images | none | ListQuerySchema | imageService.listGallery() + likeService.getBatch() | images, like_counts (read) |
| POST /api/images | requireAdminMutation | CreateImageInputSchema | imageService.create() | images (INSERT), tags (INSERT), image_tags (INSERT) |
| GET /api/images/[id] | none | ImageId.parse(id) | imageService.getById() + tagService.listByImage() + likeService.getCount() | images, image_tags, tags, like_counts |
| PUT /api/images/[id] | requireAdminMutation | UpdatePayloadSchema | imageService.update() + likeService.setLikeCount() | images (UPDATE), tags, image_tags |
| DELETE /api/images/[id] | requireAdminMutation | ImageId.parse(id) | imageService.delete() | images (DELETE), storage |
| POST /api/images/reorder | requireAdminMutation | BodySchema | imageService.updateOrder() | images (N UPDATEs) |
| GET /api/search | none | SearchQuerySchema | searchService.query() | images, search_logs |
| POST /api/like/[id] | none (rate-limited by IP) | ImageId.parse(id) | likeService.like(id, ip) | like_counts (in memory mode) |
| POST /api/metrics/view/[id] | none | ImageId.parse(id) | metricService.recordView() | view_counts |
| POST /api/metrics/copy/[id] | none | ImageId.parse(id) | metricService.recordCopy() | copy_counts |
| GET /api/models | none | (none) | modelService.listAll() | models |
| POST /api/models | requireAdminMutation | CreateModelSchema | modelService.create() | models (INSERT) |
| GET /api/tags/popular | none | (none) | tagService.listPopular() | image_tags, tags |
| POST /api/admin/auth | none | LoginSchema | authService.signIn() | Supabase Auth |
| DELETE /api/admin/auth | none | (none) | authService.signOut() | Supabase Auth |
| GET /api/admin/settings/featured | requireAdminSession | (none) | adminService.getSettings() | settings |
| POST /api/admin/settings/featured | requireAdminMutation | BodySchema | adminService.setFeaturedImage() | settings |
| GET /api/admin/settings/maintenance | requireAdminSession | (none) | adminService.getSettings() | settings |
| POST /api/admin/settings/maintenance | requireAdminMutation | BodySchema | adminService.toggleMaintenanceMode() | settings |
| POST /api/admin/upload-signature | requireAdminMutation | BodySchema | storage.signedUploadUrl() | storage provider |
| GET /api/cron/flush-likes | none | (none) | Promise.all([flushLikes, flushCopies]) | like_counts, copy_counts |
| GET /api/cron/refresh-trending | none | (none) | revalidateTag(GALLERY) | Next.js ISR cache |
| GET /api/health | none | (none) | createAdminClient().from("settings").select() | settings (ping) |
| POST /api/revalidate | x-revalidate-secret header | BodySchema | revalidateTag() | Next.js ISR cache |

---

## 2. Exception Surface Map

Every throw site in the codebase:

| File | Line | What Throws | Trigger | Caught? | Logged? |
|---|---|---|---|---|---|
| `lib/config.ts` | 61 | `Error("Environment validation failed:\n...")` | Missing required env vars | NO — startup crash | NO |
| `lib/auth/index.ts` | 24 | `AuthError(401, "Authentication required")` | No session | Route handlers — 401 response | NO (expected) |
| `lib/auth/index.ts` | 42 | `AuthError(429, "Too many admin requests")` | Admin rate limited | Route handlers — 429 response | NO (expected) |
| `lib/repos/imageRepo.ts` | 128 | `Error("imageRepo.listPublished failed: ...")` | DB error | NO — propagates to route → 500 | Via route catch → errors.capture |
| `lib/repos/imageRepo.ts` | 158 | `Error("imageRepo.listAll failed: ...")` | DB error | NO | Via caller → 500 |
| `lib/repos/imageRepo.ts` | 173 | `Error("imageRepo.create failed: ...")` | DB insert error | NO | Via route catch |
| `lib/repos/imageRepo.ts` | 194 | `Error("imageRepo.update failed: ...")` | DB update error | NO | Via route catch |
| `lib/repos/imageRepo.ts` | 207 | `Error("imageRepo.delete failed: ...")` | DB delete error | NO | Via route catch |
| `lib/repos/imageRepo.ts` | 225,236 | `Error("imageRepo.listRelated ... failed: ...")` | DB join error | NO | Via caller |
| `lib/repos/imageRepo.ts` | 248 | `Error("imageRepo.count failed: ...")` | DB count error | NO | Via caller → dashboard 500 |
| `lib/repos/likeRepo.ts` | 20 | `Error("likeRepo.upsertCount failed: ...")` | DB upsert error | NO | Via caller |
| `lib/repos/likeRepo.ts` | 33-34 | RPC error | increment_like_count RPC missing | YES — fallback to read-then-write | NOT logged |
| `lib/repos/likeRepo.ts` | 38 | Fallback read-then-write error | Fallback DB error | NO | Propagates |
| `lib/repos/tagRepo.ts` | 24 | `Error("tagRepo.findOrCreate failed: ...")` | DB insert error | NO | Via caller |
| `lib/repos/tagRepo.ts` | 36,42,57,78 | Error (attach/detach/listByImage/popular) | DB error | NO | Via caller |
| `lib/repos/modelRepo.ts` | 13,35 | Error (listAll/create) | DB error | NO | Via caller → route catch |
| `lib/repos/settingsRepo.ts` | 38,47 | Error (setFeatured/setMaintenance) | DB error | NO | Via caller |
| `lib/repos/searchLogRepo.ts` | 18 | `Error("searchLogRepo.logSearch failed: ...")` | DB insert error | YES — .catch() in searchService | Via errors.capture |
| `lib/storage/supabase.ts` | 18 | `Error("Failed to create signed upload URL: ...")` | Supabase storage error | NO | logger.error BEFORE throw |
| `lib/storage/supabase.ts` | 28 | `Error("Failed to delete storage object: ...")` | Supabase storage error | YES — imageService.delete() catches | logger.error BEFORE throw |
| `lib/storage/supabase.ts` | 41 | `Error("Failed to delete storage objects: ...")` | Supabase bulk delete error | NO | logger.error BEFORE throw |
| `lib/storage/cloudinary.ts` | 87 | `Error("Cloudinary delete failed (${status}): ...")` | Cloudinary API error | YES — imageService.delete() catches | logger.error BEFORE throw |
| `lib/storage/cloudinary.ts` | 111 | `Error("Cloudinary batch delete failed (${status}): ...")` | Cloudinary API error | NO | logger.error BEFORE throw |
| `lib/cache/redis.ts` | 32 | `Error("RedisCache requires UPSTASH_REDIS_REST_URL...")` | Missing env vars | NO — startup crash | NO |
| `lib/cache/redis.ts` | 46 | `Error("Upstash Redis error ${status}: ...")` | Upstash REST error | YES — get/set/incr wrap in try/catch | errors.capture |
| `lib/ratelimit/redis.ts` | 57 | `Error("Upstash Redis error ${status}: ...")` | Upstash REST error | NO — callers DON'T catch | NOT logged |
| `lib/search/postgres.ts` | 36 | `Error("Search query failed: ...")` | DB FTS error | NO | Via route catch → errors.capture |
| `lib/search/meilisearch.ts` | 22 | `Error("MeilisearchSearch is not implemented yet")` | constructor | NO — startup crash if meili selected | NO |
| `lib/search/meilisearch.ts` | 28 | `Error("MeilisearchSearch.query not implemented")` | query call | NO | NO |

### Uncaught Exception Paths (Production Risk)

1. **Redis rate limit network failure**: `RedisRateLimit.check()` throws → `requireAdminMutation()` does NOT catch → crashes the API route with 500
2. **imageRepo.updateOrder() partial failure**: N parallel UPDATEs with no transaction — some succeed, some fail, NO error captured
3. **imageService.delete() storage failure → DB delete proceeds**: Files may be orphaned in storage
4. **tagRepo.findOrCreate() race**: Two concurrent calls for same tag name — first creates, second fails on UNIQUE constraint → error propagates → imageService.create() fails
5. **MemoryCache.incr() race**: Two concurrent incr() read-then-write → one may overwrite the other's count

---

## 3. Concurrency Map

### Parallel execution (Promise.all)

| Location | What runs in parallel | Risk |
|---|---|---|
| `adminService.getDashboardStats()` | 9 independent DB queries (count, totalLikes, totalCopies, totalViews, listAll, topCopied, topQueries, failedQueries, mostLikedId) | ANY one fails → entire dashboard 500 |
| `imageService.create()` | N × `tagRepo.findOrCreate()` for each tag | ANY fails → image created without tags |
| `imageService.invalidateGalleryCache()` | N × `cache.del()` for all matching keys | Individual failures silently ignored (Redis: errors.capture) |
| `imageService.updateOrder()` | N × `supabase.from("images").update()` per image | NO TRANSACTION — partial reorder possible |
| `likeService.getBatch()` | N × `cache.get(`like:${id}`)` for each image | All fire in parallel |
| `likeService.flushAll()` | NOT parallel — SEQUENTIAL for...of loop | If one fails, remaining NOT flushed |
| `tagService.listPopularWithPreviews()` | N × `imageRepo.listPublished()` (one per tag) | Up to 16 concurrent tag-lookup + image queries — heavy DB load |
| `/api/images/[id] GET` | tagService.listByImage() + likeService.getCount() | Both lightweight, safe |

### Race Conditions

| Location | Description | Impact |
|---|---|---|
| `MemoryCache.incr()` | get+1+set is non-atomic | Like/copy counts may be off by 1 in multi-instance deployments |
| `tagRepo.findOrCreate()` | Check-then-insert window | Duplicate tag insert attempt → UNIQUE constraint error → propagate crash |
| `likeRepo.incrementBy()` fallback | getCount + upsertCount non-atomic | Concurrent increments may lose counts (RPC not available) |
| `metricRepo.incrementViewBy()` fallback | Same issue | View counts may be undercounted |
| `likeService.flushAll()` | Flushes then deletes dirty key | If cron runs twice, double-counting possible (dirty key deleted AFTER increment) |
| `imageService.updateOrder()` | N parallel UPDATEs without ORDER BY/LOCK | Last-write-wins ordering among concurrent orders |
| `MemoryRateLimit.check()` | read-then-write non-atomic | Two concurrent checks may both pass (over-limit allowed) |

### Shared Resources

| Resource | Access Pattern | Thread-Safe? |
|---|---|---|
| `MemoryCache.store` | Map read/write (sync operations in async method) | No — Node.js event loop means no true parallelism, but interleaved async may cause issues |
| `MemoryRateLimit.buckets` | Map read/write | Same |
| `proxy.ts` maintenance cache | Single global `maintenanceCacheValue` + `maintenanceCacheExpiry` | Yes — Vercel runs one middleware per request, no shared memory between instances |
| Redis (Upstash) | REST API calls | Yes — each operation is atomic via REST |
| Postgres (Supabase) | SQL queries via service role | Yes — Postgres ACID for single queries, NO app-level transactions |

---

## 4. State Transition Map

### Image lifecycle

```
CREATE:
  POST /api/images → imageService.create()
    ├── imageRepo.create() → INSERT images (is_published=false)
    ├── tagRepo.findOrCreate() × N → INSERT/READ tags
    ├── tagRepo.attachToImage() → UPSERT image_tags
    ├── (trigger) on_image_tag_change → updates images.search_tags → on_image_update → rebuilds search_vector
    ├── searchSync.index() → Meilisearch PUT (if enabled) or no-op
    ├── if published: revalidateTag(GALLERY) + invalidateGalleryCache()
    └── logger.info

UPDATE (publish/draft toggle):
  PUT /api/images/[id] → imageService.update()
    ├── imageRepo.update() → UPDATE images (is_published field)
    ├── revalidateTag(GALLERY) + revalidateTag(IMAGE(slug))
    ├── cache.del(`image:slug:${slug}`)
    └── searchSync.index() (updates index with new published status)

UPDATE (content):
  PUT /api/images/[id] → imageService.update()
    ├── imageRepo.update() → UPDATE images (prompt, description, model)
    ├── tagRepo.detachAllFromImage() → DELETE image_tags
    ├── tagRepo.attachToImage() → UPSERT new tags
    ├── (trigger) on_image_tag_change + on_image_update → rebuild search_vector
    ├── cache.del(`image:slug:${slug}`) + revalidateTags + invalidateGalleryCache
    └── searchSync.index()

DELETE:
  DELETE /api/images/[id] → imageService.delete()
    ├── imageRepo.findById() → get storageKey + slug
    ├── storage.delete(storageKey) → [CASCADE: storage file deleted]
    ├── imageRepo.delete(id) → DELETE images → CASCADE DELETE like_counts, copy_counts, view_counts, image_tags
    ├── searchSync.remove(id) → Meilisearch DELETE (if enabled)
    ├── cache.del(`image:slug:${slug}`) + revalidateTags + invalidateGalleryCache
    └── logger.info

REORDER:
  POST /api/images/reorder → imageService.updateOrder()
    ├── imageRepo.updateOrder([{id, displayOrder}]) → N × UPDATE images SET display_order = ?
    ├── revalidateTag(GALLERY) + invalidateGalleryCache()
    └── logger.info
```

### Like lifecycle

```
LIKE:
  POST /api/like/[id] → likeService.like(id, ip)
    ├── rateLimit.check(`like:${ip}:${id}`) → 429 if over limit
    ├── cache.incr(`like:${imageId}`) → delta counter
    ├── cache.set(`like:dirty:${imageId}`, "1") if first like
    ├── if memory: likeRepo.incrementBy(id, 1) + cache.del(delta)
    ├── if redis: LIKE NOT WRITTEN TO DB YET (cached delta only)
    └── logger.info

FLUSH (cron daily):
  GET /api/cron/flush-likes → likeService.flushAll() + metricService.flushAllCopies()
    ├── cache.keys("like:dirty:*") → find all dirty images
    ├── for each: cache.get(`like:${id}`) → likeRepo.incrementBy(id, delta)
    ├── cache.del(`like:${id}`) + cache.del(`like:dirty:${id}`)
    └── logger.info("like.flushed")
```

### Cache invalidation chain

When an image is created/updated/deleted with isPublished=true:

```
imageService.create/update/delete()
  ├── revalidateTag("gallery")         → Next.js ISR: busts all gallery pages
  ├── revalidateTag(`image:${slug}`)   → Next.js ISR: busts that image's detail page
  ├── revalidateTag("settings")        → Next.js ISR: busts settings (featured image changes)
  ├── cache.del(`image:slug:${slug}`)  → Adapter cache: busts getBySlug cache
  └── invalidateGalleryCache()         → Adapter cache: busts ALL gallery:* query caches
```

### FTS search index maintenance (Postgres)

All via DB triggers — no application code needed:

```
INSERT/UPDATE/DELETE on image_tags
  → trigger: on_image_tag_change()
  → calls: update_image_search_tags(image_id)
    → UPDATE images SET search_tags = (SELECT array_agg(tags.name) FROM image_tags JOIN tags)
      → trigger: on_image_update()
      → rebuilds search_vector = setweight(to_tsvector('english', array_to_string(search_tags, ' ')), 'A')
                               || setweight(to_tsvector('english', coalesce(model, '')), 'B')


UPDATE on tags (name change)
  → trigger: on_tag_change()
  → for ALL images linked to that tag:
      calls: update_image_search_tags(image_id) → same chain as above
```

---

## 5. Error Handling Matrix

| Error Source | Handled At | Strategy | Logged? | Retry? | User Sees |
|---|---|---|---|---|---|
| Missing env vars | config.ts bootstrap | Throw on startup | NO | NO | App won't start |
| Auth session missing | auth/index.ts → route handler | Throw AuthError → catch → 401 | authService: warn | NO | { error: "unauthorized" } |
| Admin rate limited | auth/index.ts → route handler | Throw AuthError → catch → 429 | NO | NO | { error: "rate_limited" } |
| Supabase DB error | repo → propagates → route catch | catch → errors.capture → 500 | errors.capture | NO | { error: "internal_error" } |
| Supabase RPC missing | likeRepo/metricRepo fallback | RPC error → read-then-write fallback | NO (silent fallback) | YES (fallback) | Transparent |
| Supabase storage error (upload signature) | route handler | catch → errors.capture → 500 | errors.capture | NO | { error: "internal_error" } |
| Supabase storage error (delete in image delete) | imageService.delete() | try/catch → errors.capture → continue | errors.capture | NO | Transparent (DB deleted anyway) |
| Cloudinary API error | CloudinaryStorage.delete() | throw → imageService.delete() catch → errors.capture | errors.capture | NO | Transparent |
| Redis network error (cache.get) | RedisCache.get() | try/catch → errors.capture → return null | errors.capture | NO | Cache miss → fresh DB query |
| Redis network error (rate limit check) | RedisRateLimit.check() | NOT caught — propagates | NO | NO | 500 Internal Error |
| Redis network error (cache.set) | RedisCache.set() | try/catch → errors.capture → silent | errors.capture | NO | Value not cached |
| Zod validation error (API input) | route handler | Zod safeParse → 400/422 | NO | NO | { error: fields } |
| Upstash REST error | RedisCache.send() / RedisRateLimit.pipeline() | throw Error | Depends on caller | NO | Varies |
| Search log insert error | searchService.query() | .catch(errors.capture) | errors.capture | NO | Transparent (search works) |
| Search index sync error | imageService.create/update | .catch(errors.capture) | errors.capture | NO | Transparent |
| Supabase auth API error | authService.signIn() | error → return null, warn log | logger.warn | NO | { error: "invalid_credentials" } |
| Supabase auth signOut error | AdminSidebar handleSignOut | catch → clientErrors.capture | clientErrors | NO | 500 (admin sidebar) |
| Axiom ingest error | AxiomLogger.send() | .catch(() => {}) — silent | NO | NO | Transparent |
| Maintenance mode check error | proxy.ts isMaintenanceMode() | try/catch → return false | NO | NO | Normal mode (site not blocked) |
| isMaintenanceMode network error | proxy.ts | try/catch → return false | NO | NO | Normal mode |

---

## 6. Production Failure Map

### What breaks if DB (Supabase Postgres) fails?

| Component | Impact | Severity |
|---|---|---|
| All pages | 500 errors (server components call services → repos → DB) | **CRITICAL** — site down |
| All API routes | 500 errors (all repos use createAdminClient) | **CRITICAL** — API down |
| Auth (login/logout) | authService uses Supabase Auth REST API, NOT the Postgres DB | **STILL WORKS** — auth is separate |
| proxy.ts (middleware) | getUser() works (Auth API), isMaintenanceMode() → catches error → returns false | **STILL WORKS** — bypasses maintenance check |
| ISR cached pages | Already cached pages may serve from Vercel CDN | **PARTIAL** — stale content |
| FTS triggers | Postgres triggers not firing — search_vector won't update on writes | **N/A** — no writes happening anyway |
| RLS | Not relevant — all data access is via service role | **N/A** |

### What breaks if Redis (Upstash) fails?

| Component | Impact | Severity |
|---|---|---|
| Cache (RedisCache) | Every get/set/incr returns null/0/void, errors.capture logged | **LOW** — functional degradation, cache misses → DB queries |
| Rate limiting (RedisRateLimit) | `check()` throws uncaught Error → **admin mutation routes CRASH with 500** | **HIGH** — admin mutations broken |
| Like rate limiting (RedisRateLimit) | Same — `check()` throws → **POST /api/like/[id] CRASHES with 500** | **HIGH** — likes broken |
| Like delta caching | cache.incr() returns 0, delta never cached → getCount() shows stale DB count | **LOW** — like counts stale until next cron |
| Copy delta caching | Same — copy counts stale | **LOW** |
| Cron flush | cache.keys() returns [] → flush is no-op | **LOW** — no crash |

### What breaks if Storage (Supabase Storage / Cloudinary) fails?

| Component | Impact | Severity |
|---|---|---|
| Admin upload | signedUploadUrl() throws → POST /api/admin/upload-signature returns 500 | **HIGH** — uploads broken |
| Image delete | storage.delete() throws → imageService.delete() CATCHES → logs error → proceeds with DB delete | **MEDIUM** — orphaned file in storage, DB deletion succeeds |
| Image display | Cloudinary CDN / Supabase Storage public URLs **independent** of API — images already served | **LOW** — existing images unaffected |
| Cloudinary URL signing | pure computation, no network — always works | **NONE** |

### What breaks if Search fails?

| Component | Impact | Severity |
|---|---|---|
| Postgres FTS | textSearch query fails → PostgresSearch.query() throws → /api/search returns 500 | **MEDIUM** — search broken |
| Meilisearch | Not implemented (throws on construction) | **NONE** — can't even enable it |
| Search logging | searchLogRepo.logSearch().catch() → logged via errors.capture, search response still works | **NONE** — transparent |
| FTS index maintenance | Postgres triggers independent of search adapter — index auto-rebuilt on every write | **NONE** — handled by DB |

### What breaks if Cron fails?

| Component | Impact | Severity |
|---|---|---|
| Like delta flush (3am daily) | Deltas from previous day NOT flushed → like counts stale | **LOW** — deltas persist in Redis until next successful flush. Memory mode writes immediately, unaffected. |
| Copy delta flush (3am daily) | Same as likes | **LOW** |
| Trending refresh (4am daily) | Gallery ISR cache NOT revalidated → stale trending content | **LOW** — gallery has 60s ISR, would eventually revalidate naturally |

### What breaks if proxy.ts crashes?

| Component | Impact | Severity |
|---|---|---|
| Admin route protection | No middleware → admin routes accessible WITHOUT auth | **CRITICAL** — security bypass |
| Maintenance mode | No maintenance check → site goes down during maintenance if DB unreachable | **MEDIUM** |
| Already-logged-in redirect | Users on /admin/login not redirected to dashboard | **LOW** |
