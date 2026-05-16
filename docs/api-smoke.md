# API Smoke Tests

Quick `curl` recipes to verify each route works. Replace variables as needed.

```bash
BASE=http://localhost:3000
SECRET=your-revalidate-secret
IMAGE_ID=<uuid>
IMAGE_SLUG=<slug>
```

---

## Public routes

### List images (paginated)

```bash
curl "$BASE/api/images" | jq '.items | length'
```

With sort and tag filter:

```bash
curl "$BASE/api/images?sort=likes&tag=portrait" | jq .
```

### Single image

```bash
curl "$BASE/api/images/$IMAGE_ID" | jq .
```

### Full-text search

```bash
curl "$BASE/api/search?q=astronaut+mars" | jq '.items[].prompt'
```

### Like an image (POST — rate-limited at 5/min per IP)

```bash
curl -X POST "$BASE/api/like/$IMAGE_ID" | jq .
```

Hammer to verify rate-limiting kicks in:

```bash
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/like/$IMAGE_ID"; done
```

Expected: first 5 return `200`, subsequent return `429`.

### Health check

```bash
curl "$BASE/api/health" | jq .
```

---

## Admin routes

All require a valid Supabase session cookie. Log in first:

```bash
curl -X POST "$BASE/api/admin/auth" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}' \
  -c cookies.txt
```

### Upload signature

```bash
curl -X POST "$BASE/api/admin/upload-signature" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"filename":"my-image.png"}' | jq .
```

### Create image

```bash
curl -X POST "$BASE/api/images" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "storageKey": "uploads/my-image.png",
    "storageProvider": "supabase",
    "imageUrl": "https://xxxx.supabase.co/storage/v1/object/public/images/uploads/my-image.png",
    "width": 1024,
    "height": 1024,
    "prompt": "A lone astronaut on Mars at golden hour, cinematic",
    "tags": ["space","portrait"],
    "isPublished": true
  }' | jq .
```

### Update image

```bash
curl -X PUT "$BASE/api/images/$IMAGE_ID" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"isPublished": false}' | jq .
```

### Delete image

```bash
curl -X DELETE "$BASE/api/images/$IMAGE_ID" \
  -b cookies.txt | jq .
```

---

## Cache revalidation

Force-revalidate the gallery (e.g. after a bulk import):

```bash
curl -X POST "$BASE/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"'$SECRET'"}'
```

Revalidate a specific image:

```bash
curl -X POST "$BASE/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"'$SECRET'","data":{"slug":"'$IMAGE_SLUG'"}}'
```

---

## Cron endpoints (verify manually on production)

```bash
# Flush likes to DB
curl -H "Authorization: Bearer $CRON_SECRET" "$BASE/api/cron/flush-likes"

# Refresh trending cache
curl -H "Authorization: Bearer $CRON_SECRET" "$BASE/api/cron/refresh-trending"
```
