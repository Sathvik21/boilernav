// BoilerNav moderation server — zero dependencies (Node built-ins only).
//   node server.js
// Env:
//   PORT         (default 8000)
//   ADMIN_TOKEN  (default: a random token printed at startup)
//
// Contributors POST edits to /api/suggest (goes into a pending queue).
// You (admin) review at /admin.html and approve/reject; approving merges
// the edit into walkways.json.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 8000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(12).toString('hex');
const SUGGEST_FILE = path.join(ROOT, 'suggestions.json');
const WALK_FILE = path.join(ROOT, 'walkways.json');

const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
               '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.md':'text/markdown' };

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f,'utf8')); } catch { return d; } };
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o));

function send(res, code, body, type='application/json') {
  res.writeHead(code, { 'Content-Type': type });
  if (Buffer.isBuffer(body) || typeof body === 'string') res.end(body);
  else res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
  });
}
const isAdmin = req => (req.headers['x-admin-token'] || '') === ADMIN_TOKEN;

function validEdit(edit) {
  if (!edit || typeof edit !== 'object') return false;
  if (typeof edit.nodes !== 'object' || !Array.isArray(edit.edges)) return false;
  for (const c of Object.values(edit.nodes)) {
    if (!Array.isArray(c) || c.length !== 2) return false;
    const [lat, lon] = c;
    if (!(lat > 40.41 && lat < 40.44 && lon > -86.95 && lon < -86.90)) return false; // campus bbox
  }
  if (Object.keys(edit.nodes).length > 500 || edit.edges.length > 500) return false;
  return true;
}

// merge an approved edit into walkways.json: add new nodes/edges, remove deleted edges
function mergeEdit(item) {
  const g = readJSON(WALK_FILE, { nodes:{}, edges:[] });
  const edit = item.edit || { nodes:{}, edges:[] }, map = {};
  for (const oldId of Object.keys(edit.nodes || {})) {
    const nid = `s${item.id}_${oldId}`;
    map[oldId] = nid;
    g.nodes[nid] = edit.nodes[oldId];
  }
  for (const e of (edit.edges || [])) {
    const a = map[e[0]] || e[0];          // remap new ids; base ids pass through
    const b = map[e[1]] || e[1];
    if (!g.nodes[a] || !g.nodes[b]) continue; // skip dangling refs
    g.edges.push([a, b, e[2] || 0].concat(e[3] ? [e[3]] : []));
  }
  const dels = item.deletions || [];
  if (dels.length) {                       // drop removed edges (undirected match)
    const key = (a, b) => String(a) < String(b) ? a + '|' + b : b + '|' + a;
    const drop = new Set(dels.map(d => key(d.a, d.b)));
    g.edges = g.edges.filter(e => !drop.has(key(e[0], e[1])));
  }
  g.meta = g.meta || {};                   // per-contribution info for hover tooltips
  g.meta[item.id] = { submitter: item.submitter, date: item.ts, note: item.note || '',
                      added: (edit.edges || []).length, removed: dels.length };
  writeJSON(WALK_FILE, g);
}

function validDeletions(dels) {
  if (dels == null) return true;
  if (!Array.isArray(dels) || dels.length > 500) return false;
  for (const d of dels) if (!d || d.a == null || d.b == null) return false;
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  // ---- API ----
  if (p === '/api/suggest' && req.method === 'POST') {
    let body; try { body = await readBody(req); } catch { return send(res, 400, { error:'bad json' }); }
    const edit = body.edit || { nodes:{}, edges:[] };
    const deletions = body.deletions || [];
    if (!validEdit(edit) || !validDeletions(deletions)) return send(res, 400, { error:'invalid or too-large edit' });
    const nAdds = Object.keys(edit.nodes || {}).length + (edit.edges || []).length;
    if (!nAdds && !deletions.length) return send(res, 400, { error:'empty suggestion' });
    const list = readJSON(SUGGEST_FILE, []);
    const item = {
      id: crypto.randomBytes(4).toString('hex'),
      submitter: String(body.submitter || 'anonymous').slice(0, 60),
      note: String(body.note || '').slice(0, 280),
      edit,
      deletions,
      status: 'pending',
      ts: Date.now()
    };
    list.push(item); writeJSON(SUGGEST_FILE, list);
    return send(res, 200, { ok:true, id:item.id });
  }

  if (p === '/api/pending' && req.method === 'GET') {
    if (!isAdmin(req)) return send(res, 401, { error:'admin token required' });
    return send(res, 200, readJSON(SUGGEST_FILE, []).filter(s => s.status === 'pending'));
  }

  const m = p.match(/^\/api\/pending\/([a-f0-9]+)\/(approve|reject)$/);
  if (m && req.method === 'POST') {
    if (!isAdmin(req)) return send(res, 401, { error:'admin token required' });
    const [, id, action] = m;
    const list = readJSON(SUGGEST_FILE, []);
    const it = list.find(s => s.id === id && s.status === 'pending');
    if (!it) return send(res, 404, { error:'not found' });
    if (action === 'approve') { try { mergeEdit(it); } catch (e) { return send(res, 500, { error:String(e) }); } it.status = 'approved'; }
    else it.status = 'rejected';
    it.reviewedTs = Date.now(); writeJSON(SUGGEST_FILE, list);
    return send(res, 200, { ok:true, status:it.status });
  }

  // ---- static files ----
  let file = decodeURIComponent(p === '/' ? '/index.html' : p);
  if (file.includes('..')) return send(res, 400, 'bad path', 'text/plain');
  const abs = path.join(ROOT, file);
  fs.readFile(abs, (err, data) => {
    if (err) return send(res, 404, 'not found', 'text/plain');
    send(res, 200, data, MIME[path.extname(abs)] || 'application/octet-stream');
  });
});

server.listen(PORT, () => {
  console.log(`BoilerNav server on http://localhost:${PORT}`);
  console.log(`Admin token: ${ADMIN_TOKEN}`);
  console.log(`Review pending edits at http://localhost:${PORT}/admin.html`);
});