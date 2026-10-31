# Latitude °25

An Airbnb-style charter yacht platform for South Florida — browse, filter, and request to book from a fleet of 306 vessels (21–124 ft), all mediated through a single concierge team rather than direct operator contact.

**Live site:** https://latitude25.us/ (custom domain; also reachable at https://pabloapcv.github.io/latitude-yachts/)

## What's here

- `index.html` — the entire app: a static single-page site with client-side routing (Home, Browse Fleet, individual vessel pages, How It Works, About, Contact), keyword search/filtering, favorites, and a request-to-book flow. No build step, no backend — state (favorites, booking requests) lives in the visitor's own `localStorage`, and booking/contact submissions go out via a pre-filled `mailto:` to the concierge inbox.
- `data.json` — the fleet data and pricing, based on the SFLA Yacht Master List spreadsheet with a 10% concierge markup applied. Owner/operator contact info (name, phone, external photo-folder links) has been stripped out by design; the concierge team is the only point of contact shown.
- `photos/` — real photos for 111 of the 306 vessels, pulled from the original Dropbox/Google Drive listing folders. Everything else falls back to a generated nautical scene (an inline SVG, colored by vessel size/category) with no external image dependency.
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

No dependencies — just serve the folder statically:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`.
