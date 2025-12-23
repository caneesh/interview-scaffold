# Deployment Guide

## Deploy to Vercel (Recommended)

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Import Project"
4. Select your `coding-interview` repository

### 3. Configure Environment Variables
In Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-api03-...` (your key from console.anthropic.com)
   - **Environment:** Production, Preview, Development

### 4. Deploy
Click "Deploy" - Vercel will build and deploy automatically.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   User Browser  │────▶│  Vercel Edge     │────▶│  Claude API │
│   (React App)   │     │  /api/claude     │     │             │
└─────────────────┘     └──────────────────┘     └─────────────┘
                              │
                              ▼
                        ANTHROPIC_API_KEY
                        (secret on server)
```

**Your API key is NEVER exposed to users.**

---

## Rate Limiting

The API proxy includes built-in rate limiting:
- **10 requests per minute** per IP address
- Prevents abuse and controls costs
- Returns 429 error when exceeded

To adjust limits, edit `api/claude.js`:
```javascript
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // requests per window
```

---

## Cost Estimation

Claude Sonnet pricing (as of 2024):
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

With rate limiting (10 req/min/user):
- Average request: ~500 input + ~300 output tokens
- Per user per minute: ~$0.007
- Per user per hour (heavy use): ~$0.42

**Tip:** Monitor usage in [Anthropic Console](https://console.anthropic.com/usage)

---

## Supabase Cache (Optional - Reduces API Costs)

The app includes a read-through cache that stores reusable AI responses (explanations, hints, similar problems) in Supabase. This reduces API costs by serving repeat requests from cache.

### What Gets Cached
- ✅ Concept explanations (same for all users)
- ✅ Hints per problem/step/level
- ✅ Similar problem generation
- ❌ Code reviews (always fresh - user-specific)
- ❌ Bug analysis with user code (always fresh)

### Setup Supabase

1. Create a free account at [supabase.com](https://supabase.com)

2. Create a new project

3. Run this SQL in the SQL Editor:
```sql
CREATE TABLE ai_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  response_type TEXT DEFAULT 'general',
  problem_id TEXT,
  hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_ai_cache_key ON ai_cache(cache_key);
```

4. Add environment variables in Vercel:
   - **Name:** `SUPABASE_URL`
   - **Value:** `https://xxxxx.supabase.co` (from Project Settings → API)
   - **Name:** `SUPABASE_SERVICE_KEY`
   - **Value:** `eyJ...` (from Project Settings → API → service_role key)

5. Redeploy your app

### Monitoring Cache

View cache stats in Supabase:
```sql
-- Most requested cached items
SELECT cache_key, hits, created_at
FROM ai_cache
ORDER BY hits DESC
LIMIT 20;

-- Cache size
SELECT COUNT(*) as entries,
       SUM(hits) as total_hits
FROM ai_cache;
```

### Without Supabase

If you don't configure Supabase, the app works normally - it just makes fresh API calls for every request. The cache layer gracefully falls back to direct API calls.

---

## Local Development

For local development without using your production API key:

1. Create `.env.local`:
```bash
VITE_ANTHROPIC_API_KEY=sk-ant-your-dev-key
```

2. Run:
```bash
npm run dev
```

Or users can enter their own key in the app's AI Settings.

---

## Custom Domain

1. In Vercel: Settings → Domains
2. Add your domain (e.g., `learn.yourdomain.com`)
3. Configure DNS as instructed

---

## Troubleshooting

### "API key not configured on server"
- Check Vercel Environment Variables
- Redeploy after adding the key

### Rate limit errors
- Users see: "Too many requests. Try again in X seconds."
- This is working as intended to prevent abuse

### CORS errors
- The API proxy handles CORS automatically
- If issues persist, check `api/claude.js` headers
