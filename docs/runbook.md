# Operations Runbook

Day-to-day tasks for running the AI Prompt Gallery in production.

---

## Common tasks

### Enable maintenance mode

1. Go to `/admin/settings`.
2. Click **Enable maintenance** under the Maintenance Mode section.
3. The public gallery will show the maintenance page immediately (cached for 60 s).
4. Disable the same way when done.

Alternatively, use the API:

```bash
curl -X POST "$BASE/api/admin/settings/maintenance" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"enabled": true}'
```

---

### Manually flush likes to the database

Likes are buffered in the cache adapter and flushed automatically every minute via a Vercel cron job. To flush manually:

```bash
curl "$BASE/api/cron/flush-likes"
```

Check the Vercel Cron logs to verify the job ran successfully.

---

### Force-revalidate the gallery cache

After a bulk import or featured image change:

```bash
curl -X POST "$BASE/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"<REVALIDATE_SECRET>"}'
```

This revalidates the gallery, tags, and settings cache tags.

---

### Regenerate TypeScript types after a schema change

After applying a new Supabase migration:

```bash
pnpm db:types
```

Commit the regenerated `lib/db/database.types.ts`.

---

### Apply a new database migration

```bash
# Write the migration file
# supabase/migrations/<timestamp>_<description>.sql

# Push to the linked Supabase project
npx supabase db push
```

Verify with:

```bash
npx supabase db diff
```

---

### Restore a fresh Supabase project from migrations

If you need to recreate the database from scratch:

```bash
npx supabase login
npx supabase link --project-ref <new-project-ref>
npx supabase db push
```

Create the `images` Storage bucket (public, signed writes) manually in the Supabase dashboard after pushing.

---

### Upgrade an adapter tier

All adapter upgrades are zero-code — add the env var in Vercel project settings and redeploy.

| Capability | Env var | Effect |
|---|---|---|
| Cache + Rate limit | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Switches from in-memory to Redis |
| Error reporting | `SENTRY_DSN` | Sends errors to Sentry |
| Logging | `AXIOM_TOKEN` + `AXIOM_DATASET` | Sends structured logs to Axiom |
| Search | `MEILISEARCH_HOST` + `MEILISEARCH_API_KEY` | Switches from Postgres FTS to Meilisearch |
| Storage | `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` | New uploads go to Cloudinary |

After adding any env var:
1. Redeploy from the Vercel dashboard.
2. Verify the adapter appears on the `/admin/settings` page.
3. Run the adapter contract tests: `pnpm test`.

---

### Add an admin user

Admin access is any authenticated Supabase Auth user. To add a new admin:

1. Supabase dashboard → **Authentication → Users → Invite user**.
2. The invited user sets a password via the email link.
3. They can then log in at `/admin/login`.

---

### Check site health

```bash
curl https://your-domain.com/api/health | jq .
```

Expected response:

```json
{ "status": "ok", "db": "reachable", "timestamp": "..." }
```

---

### Bulk import images

Use the admin API from a script. See `docs/api-smoke.md` for the `POST /api/images` recipe. A simple bash loop:

```bash
for file in ./images/*.json; do
  curl -X POST "$BASE/api/images" \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d @"$file"
  echo ""
done
```

Where each `.json` file matches the `CreateImageInput` schema (see `lib/db/schema.ts`).

---

## Monitoring

| What to watch | Where |
|---|---|
| Error rate | Vercel Functions → Errors tab (or Sentry if enabled) |
| Cron job runs | Vercel Dashboard → Cron Jobs |
| DB load | Supabase Dashboard → Database → Metrics |
| Cache hit rate | Add `X-Cache` header logging in `lib/cache/memory.ts` |
| Core Web Vitals | PageSpeed Insights or Vercel Analytics |

---

## Emergency procedures

### Site is down — quick diagnosis

```bash
# Is the API reachable?
curl https://your-domain.com/api/health

# Is Supabase up?
curl https://status.supabase.com/api/v2/status.json | jq .status.description

# Check Vercel deployment status
# → vercel.com/dashboard → your project → Deployments
```

### Rollback a bad deployment

Vercel dashboard → your project → Deployments → find the last good deployment → **Promote to Production**.
