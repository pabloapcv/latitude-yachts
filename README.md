# Latitude °25

An Airbnb-style charter yacht platform for South Florida — browse, filter, and request to book from a fleet of 273 vessels (21–124 ft), all mediated through a single concierge team rather than direct operator contact.

**Live site:** https://latitude25.us/ (custom domain; also reachable at https://pabloapcv.github.io/latitude-yachts/)

## What's here

- `index.html` — the entire app: a static single-page site with client-side routing (Home, Browse Fleet, individual vessel pages, How It Works, About, Contact), keyword search/filtering, favorites, and a request-to-book flow. No build step — state (favorites, booking requests) lives in the visitor's own `localStorage`, and booking/contact submissions go out via Formspree / mailto to the concierge inbox.
- `chat.js` — floating concierge chat widget. Reads `CHAT_API_URL` and `WHATSAPP_NUMBER` at the top of the file; if `CHAT_API_URL` is empty the widget stays hidden so the Pages site is safe to ship before the API is deployed.
- `data.json` — the fleet data and pricing, based on the SFLA Yacht Master List spreadsheet with a 10% concierge markup applied. Owner/operator contact info (name, phone, external photo-folder links) has been stripped out by design; the concierge team is the only point of contact shown.
- `chat-api/` — small Vercel serverless backend (`POST /api/chat`) that streams concierge answers via the Vercel AI SDK / AI Gateway, grounded in a compact copy of the fleet plus FAQ/process copy from the site. GitHub Pages ignores it.
- `photos/` — real photos for 111 of the 273 vessels, pulled from the original Dropbox/Google Drive listing folders. Everything else falls back to a generated nautical scene (an inline SVG, colored by vessel size/category) with no external image dependency.
- `robots.txt`, `sitemap.xml` — basic search-engine files for the live domain.

## Deploying changes

This repo *is* the live site — it's served directly by GitHub Pages from the `main` branch. There is no separate build or deploy step: commit and `git push`, and the change is live at the URL above within a minute or two.

```bash
git add -A
git commit -m "..."
git push
```

## Custom domain

`CNAME` in this repo tells GitHub Pages to serve the site at `latitude25.us`. DNS for the domain needs these records at the DNS provider (Cloudflare, since the domain is registered there):

| Type  | Name | Value |
|-------|------|-------|
| A     | @    | 185.199.108.153 |
| A     | @    | 185.199.109.153 |
| A     | @    | 185.199.110.153 |
| A     | @    | 185.199.111.153 |
| CNAME | www  | pabloapcv.github.io |

If Cloudflare's orange-cloud proxy is on for these records, either turn it to "DNS only" (grey cloud) or keep it proxied — both work with GitHub Pages, but DNS-only is simpler to debug if something looks wrong. In the repo's GitHub Settings → Pages, set the custom domain to `latitude25.us` and enable "Enforce HTTPS" once the DNS check passes (can take up to 24 hours, usually much faster).

## Local preview

No dependencies for the static site — just serve the folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`. The chat launcher stays hidden until `CHAT_API_URL` is set (see below).

To try the widget locally against the mock concierge (no AI Gateway key):

```bash
cd chat-api
npm install
MOCK_CHAT=1 npm run dev
```

Then open `http://localhost:8080/index.html?chat_api=http://127.0.0.1:3001/api/chat` (localhost-only query override; production ignores unknown hosts).

## AI concierge (Vercel)

GitHub Pages cannot run the model. The chat UI on the static site calls a separate Vercel project in `chat-api/`.

### 1. Deploy the API

From the Vercel dashboard: Import this GitHub repo, set **Root Directory** to `chat-api`, and deploy. Do not use the repository root as the Vercel root — that would try to upload `photos/`.

Or from a machine logged into the Vercel CLI:

```bash
cd chat-api
npx vercel@latest --yes
```

The chat endpoint is `https://<your-project>.vercel.app/api/chat`.

### 2. Environment variables (Vercel project)

| Variable | Required | Purpose |
|----------|----------|---------|
| `AI_GATEWAY_API_KEY` | Local / non-Vercel, or if OIDC is off | Authenticates the Vercel AI Gateway. Create a key at [AI Gateway → API keys](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys&title=AI+Gateway+API+Keys). Never commit it. |
| *(OIDC)* | On Vercel | Enable **Secure OIDC** on the project so deployments get `VERCEL_OIDC_TOKEN`. The AI SDK uses that automatically when no gateway key is set. |
| `AI_GATEWAY_MODEL` | No | Defaults to `google/gemini-3.5-flash-lite` (small, cheap, fast). Must be a live `provider/model` id from `https://ai-gateway.vercel.sh/v1/models`. |
| `WHATSAPP_NUMBER` | No | Digits only, country code, no `+`. When empty the model is told not to offer WhatsApp. Keep this in sync with the frontend constant. |
| `MOCK_CHAT` | No | Set to `1` only for local tests. Do not enable in production. |

Copy `chat-api/.env.example` to `chat-api/.env.local` for local real-model runs (`vercel env pull` if the project is linked).

### 3. Point the site at the API

In `chat.js`:

```js
const CHAT_API_URL = 'https://<your-project>.vercel.app/api/chat';
const WHATSAPP_NUMBER = ''; // e.g. '13055550123' when the number is decided
```

Leave both empty until the API is deployed. An empty `CHAT_API_URL` hides the widget. An empty `WHATSAPP_NUMBER` strips any `wa.me` link and sends guests to the booking request form instead.

After changing `CHAT_API_URL`, commit and push to `main` as usual so GitHub Pages picks it up.

### CORS and limits

The API allows `https://latitude25.us`, `https://www.latitude25.us`, `https://pabloapcv.github.io`, and `http://localhost` / `http://127.0.0.1`. It caps each message at 1,000 characters, keeps 12 turns of history, and rate-limits about 20 requests per minute per IP.

### Analytics

Existing GA4 / GTM / Google Ads tags are unchanged. The widget pushes `chat_open`, `chat_message_sent`, and `chat_whatsapp_click` to `dataLayer` and `gtag`.

Refresh the fleet snapshot after editing `data.json`:

```bash
cd chat-api && npm run sync-fleet
```
