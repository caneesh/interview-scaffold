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
