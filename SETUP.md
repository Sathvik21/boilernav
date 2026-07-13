# Deploying BoilerNav

## Put it on GitHub

Create an empty repo on GitHub called `boilernav`, then from inside the folder:

```bash
git init
git add -A
git commit -m "BoilerNav: campus walking nav with crowd-editable walkways"
git branch -M main
git remote add origin https://github.com/<you>/boilernav.git
git push -u origin main
```

## Path 1 — Static site + pull requests (free, no server)

Enable GitHub Pages: **Settings → Pages → Build and deployment → Deploy from a branch →
`main` / root**. Your app is live at `https://<you>.github.io/boilernav/`.

- Anyone can open it, and contributors add paths via pull requests (see CONTRIBUTING.md).
- The `Validate walkways` GitHub Action checks every PR that touches `walkways.json`.
- The in-app **Suggest edit** button won't work here (no server) — it'll tell users to
  Export + PR instead. That's expected for the static deploy.

## Path 2 — Moderation server (you approve edits as admin)

The server serves the app **and** accepts "Suggest edit" submissions into a queue you moderate.

Run locally:
```bash
ADMIN_TOKEN=pick-a-secret node server.js
# app:   http://localhost:8000
# admin: http://localhost:8000/admin.html  (enter ADMIN_TOKEN)
```

Host it (e.g. Render or Railway), zero build:
1. New Web Service from your GitHub repo.
2. Build command: *(none)*  Start command: `node server.js`
3. Add an env var `ADMIN_TOKEN` = a secret only you know.
4. Deploy. App is at the service URL; review queue at `/admin.html`.

Notes:
- Pending submissions are stored in `suggestions.json` (gitignored). On hosts with an
  ephemeral filesystem, approved edits still merge into `walkways.json` at runtime, but to
  persist changes across redeploys, commit the updated `walkways.json` back to git
  periodically (or attach a persistent disk).
- You can run **both**: static Pages site for browsing + PRs, and the server for the
  moderated suggest flow.
