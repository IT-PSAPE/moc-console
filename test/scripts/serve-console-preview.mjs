// Serve the built console with its real deployment headers and no live API proxy.
// Build first: npm run build:console
// Run: node test/scripts/serve-console-preview.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('apps/console/dist');
const configuration = JSON.parse(await readFile('apps/console/vercel.json', 'utf8'));
const headers = configuration.headers.find(entry => entry.source === '/(.*)').headers;
const contentTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json' };
const port = Number(process.env.MOC_BROWSER_PORT ?? 5188);
await stat(resolve(root, 'index.html'));
const server = createServer(async (request, response) => {
  for (const { key, value } of headers) response.setHeader(key, value);
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) {
      response.writeHead(503, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { code: 'fixture_required', message: 'This isolated preview has no live API.' } }));
      return;
    }
    const candidate = resolve(root, `.${pathname}`);
    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
      response.writeHead(404).end();
      return;
    }
    let file = candidate;
    try { if (!(await stat(file)).isFile()) file = resolve(root, 'index.html'); }
    catch { file = resolve(root, 'index.html'); }
    response.setHeader('Content-Type', contentTypes[extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.writeHead(500).end('Preview could not read the requested file.');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Isolated console preview: http://127.0.0.1:${port}`));
