# Latitude °25

An Airbnb-style charter yacht platform for South Florida — browse, filter, and request to book from a fleet of 306 vessels (21–124 ft), all mediated through a single concierge team rather than direct operator contact.

**Live site:** https://pabloapcv.github.io/latitude-yachts/

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

## Local preview

No dependencies — just serve the folder statically:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`.
