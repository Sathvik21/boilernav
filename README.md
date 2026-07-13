# BoilerNav

A fast, self-contained Purdue campus walking-navigation app. Search any building,
get a walking route that follows real sidewalks, with live distance and time —
all client-side, no backend, no API keys.

## Files

| File | What it is |
|------|------------|
| `index.html` | The whole app (map, search, routing, editor). Loads the two JSON files below. |
| `walkways.json` | The walkway graph — **this is the file contributors edit** to add or fix paths. |
| `buildings.json` | Building names, abbreviations, and coordinates (from Purdue's GIS + the official campus map). |

## Running it

The app fetches `walkways.json` and `buildings.json`, so it must be **served over HTTP** —
opening `index.html` directly with `file://` will fail (browsers block `fetch` from `file://`).

Local:

```bash
cd boilernav
python3 -m http.server
# open http://localhost:8000
```

Or push to GitHub Pages (Settings → Pages → deploy from branch) and it just works.

## Data format

`walkways.json`:

```json
{
  "nodes": { "0": [40.4269, -86.9267], "1": [40.4271, -86.9262] },
  "edges": [ ["0", "1", 42.5], ["1", "2", 60.1, [[40.4271,-86.9262],[40.4272,-86.9259]]] ]
}
```

- `nodes`: `id → [lat, lon]`
- `edges`: `[fromId, toId, lengthMeters]`, with an optional 4th element — an array of
  `[lat, lon]` points describing the path's real shape (curves). Edges are undirected.
- Edge weight = length in metres. Walking time is computed as `length / 1.4 m/s`.

## Contributing a path

Two ways:

**In the app (easiest).** Open BoilerNav, click **Edit map** (top right):

1. **Add node** — click the map to drop walkway points. A new point auto-links to the
   nearest existing path within 30 m, so your addition connects to the network.
2. **Link** — click two points to connect them.
3. **Delete** — remove a point or link you added.
4. **Export** — downloads an updated `walkways.json` (your edits merged into the base graph).

Then replace `walkways.json` in your fork with the exported file and open a pull request.

**By hand.** Edit `walkways.json` directly following the format above. Keep coordinates
to ~5 decimal places (roughly 1 m precision).

### Guidelines

- Add paths that are actually walkable (sidewalks, plaza cut-throughs, tunnels, stairs).
- Keep the graph connected — a path only helps if it links into the existing network.
- Don't route through buildings or across streets where there's no crossing.

## How it works

- **Routing:** Dijkstra (binary heap) over the walkway graph, client-side, ~4 ms.
- **Timing/distance:** haversine distance along the chosen path ÷ walking speed. No hand-entered times.
- **Buildings:** labels are decluttered like Google Maps — larger buildings shown first,
  overlapping labels hidden, more appear as you zoom in.
- **Basemap:** CARTO Voyager tiles (OpenStreetMap data).

## Credits

Building data © Purdue University GIS and the West Lafayette campus map.
Map data © OpenStreetMap contributors, tiles © CARTO.
