# Contributing to BoilerNav

There are two ways to add or fix walkways. Both update the same `walkways.json`.

## Option 1 — Pull request (for GitHub users)

1. Fork the repo.
2. Open the app (locally with `python3 -m http.server`, or on the live site) and click
   **Edit map**. Add nodes / links, then **Export** — this downloads an updated
   `walkways.json` with your edits merged in.
3. Replace `walkways.json` in your fork with the exported file, commit, and open a PR.
4. CI runs `validate_walkways.py` automatically. Green check = the graph is still valid
   and connected. A maintainer merges it.

You can also hand-edit `walkways.json` — see the format in `README.md`.

## Option 2 — Suggest an edit (no GitHub needed)

If the project is running on the moderation **server** (`node server.js`, or a hosted
deploy), click **Edit map → Suggest edit for review**. Your additions go into a pending
queue. An admin reviews them at `/admin.html` and approves or rejects; approved edits are
merged into `walkways.json`.

## What makes a good edit
- Real, walkable paths only (sidewalks, plaza cut-throughs, tunnels, stairs).
- New paths must link into the existing network to be useful.
- Don't route through buildings or across streets with no crossing.
- Keep coordinates to ~5 decimals (~1 m).
