#!/usr/bin/env python3
"""Validate walkways.json: schema, coordinate bounds, and connectivity.
Exit code 0 = OK, 1 = problems. Used by CI on pull requests."""
import json, sys, math
from collections import defaultdict

# West Lafayette campus bounding box (a little generous)
S, W, N, E = 40.415, -86.945, 40.437, -86.900

def fail(msg): print("FAIL:", msg); return False

def main(path="walkways.json"):
    try:
        g = json.load(open(path))
    except Exception as e:
        print("FAIL: can't parse", path, "-", e); return 1

    ok = True
    if not isinstance(g, dict) or "nodes" not in g or "edges" not in g:
        return 1 if fail("top level must be {nodes, edges}") else 1

    nodes, edges = g["nodes"], g["edges"]
    if not isinstance(nodes, dict): ok = fail("nodes must be an object id->[lat,lon]")
    if not isinstance(edges, list): ok = fail("edges must be a list")

    # nodes: coords valid + in bounds
    for nid, coord in nodes.items():
        if not (isinstance(coord, list) and len(coord) == 2):
            ok = fail(f"node {nid} must be [lat, lon]"); continue
        lat, lon = coord
        if not (S <= lat <= N and W <= lon <= E):
            ok = fail(f"node {nid} out of campus bounds: {coord}")

    # edges: reference existing nodes, positive length
    for i, e in enumerate(edges):
        if not (isinstance(e, list) and len(e) >= 3):
            ok = fail(f"edge {i} must be [a, b, length, (geometry?)]"); continue
        a, b, length = e[0], e[1], e[2]
        if a not in nodes: ok = fail(f"edge {i} references missing node {a}")
        if b not in nodes: ok = fail(f"edge {i} references missing node {b}")
        if not (isinstance(length, (int, float)) and length > 0):
            ok = fail(f"edge {i} length must be a positive number")

    # connectivity: warn if graph is fragmented
    adj = defaultdict(list)
    for e in edges:
        if e[0] in nodes and e[1] in nodes:
            adj[e[0]].append(e[1]); adj[e[1]].append(e[0])
    seen, comps = set(), []
    for start in nodes:
        if start in seen: continue
        comp, stack = 0, [start]
        while stack:
            u = stack.pop()
            if u in seen: continue
            seen.add(u); comp += 1
            stack.extend(adj[u])
        comps.append(comp)
    if comps:
        comps.sort(reverse=True)
        biggest = comps[0]; total = sum(comps)
        stranded = total - biggest
        print(f"nodes={total} edges={len(edges)} components={len(comps)} "
              f"largest={biggest} stranded={stranded}")
        if len(comps) > 1 and stranded > total * 0.05:
            ok = fail(f"{stranded} nodes ({100*stranded/total:.0f}%) are disconnected "
                      f"from the main network — new paths must link into it")

    print("OK" if ok else "VALIDATION FAILED")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "walkways.json"))
