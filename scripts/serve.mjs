/** Minimal static server for development and QA.
 *  `node scripts/serve.mjs [port]` (default 5173). Listens on all interfaces (HOST=0.0.0.0)
 *  so the site can be opened from other devices on the LAN via this machine's IP. */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.argv[2] || process.env.PORT || 5173);
const host = process.env.HOST || '0.0.0.0';

function lanAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs || []) if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address });
  }
  return out;
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.hdr': 'image/vnd.radiance', '.exr': 'image/x-exr', '.ktx2': 'image/ktx2', '.basis': 'application/octet-stream',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); res.end('forbidden'); return; }
  let st;
  try { st = statSync(file); } catch { res.writeHead(404); res.end('not found: ' + path); return; }
  if (st.isDirectory()) { res.writeHead(301, { Location: path + '/' }); res.end(); return; }
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' };
  if (req.method === 'HEAD') { res.writeHead(200, headers); res.end(); return; }
  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
}).listen(port, host, () => {
  console.log(`serving ${root}`);
  console.log(`  local:   http://127.0.0.1:${port}`);
  if (host === '0.0.0.0' || host === '::') for (const { name, address } of lanAddresses()) console.log(`  network: http://${address}:${port}  (${name})`);
});
