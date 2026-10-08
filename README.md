# Latitude °25

An Airbnb-style charter yacht platform for South Florida — browse, filter, and request to book from a fleet of 306 vessels (21–124 ft), all mediated through a single concierge team rather than direct operator contact.

**Live app:** https://claude.ai/code/artifact/cd4a1628-5335-41d2-b297-9bb6ee7b6db3

## What's here

- `index.html` — the entire app: a static single-page site with client-side routing (Home, Browse Fleet, How It Works, About, Contact), search/filter, favorites, and a request-to-book flow. No build step, no backend — state (favorites, booking requests, contact messages) lives in the visitor's own `localStorage`.
- `data.json` — the fleet data, cleaned and deduped from the original SFLA and NYE yacht master-list spreadsheets. Owner/operator contact info (name, phone, external photo-folder links) has been stripped out by design; the concierge team is the only point of contact shown.
- `photos/` — real photos pulled from the original Dropbox/SmugMug listing folders for the ~71 vessels where a gallery was reachable. Everything else falls back to a generated nautical scene (an inline SVG, colored by vessel size/category) with no external image dependency.

## Deploying changes

This repo is the source of truth for the code; the live app is a separate [Claude Artifact](https://claude.ai/code/artifact/cd4a1628-5335-41d2-b297-9bb6ee7b6db3) that does **not** auto-deploy from git. After editing `index.html` or `data.json` here, publish the updated files to that same artifact URL to push the change live.

## Local preview

No dependencies — just serve the folder statically:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`.
