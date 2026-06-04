import { createServer } from 'http';
import { URL } from 'url';
import { readFileSync, existsSync } from 'fs';

// Load .env.local then .env into process.env
for (const f of ['.env.local', '.env']) {
  if (existsSync(f)) {
    readFileSync(f, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    });
  }
}

const PORT = 3001;
process.chdir(new URL('.', import.meta.url).pathname);

const ROUTES = {
  '/api/state':            () => import('./api/state.js'),
  '/api/join':             () => import('./api/join.js'),
  '/api/register':         () => import('./api/register.js'),
  '/api/tournament/create':() => import('./api/tournament/create.js'),
  '/api/tournament/reset': () => import('./api/tournament/reset.js'),
  '/api/tournament/seed-nations': () => import('./api/tournament/seed-nations.js'),
  '/api/tournament/claim-team':   () => import('./api/tournament/claim-team.js'),
  '/api/tournament/patch-teams':  () => import('./api/tournament/patch-teams.js'),
  '/api/match/start':      () => import('./api/match/start.js'),
  '/api/match/choice':     () => import('./api/match/choice.js'),
  '/api/match/submit':     () => import('./api/match/submit.js'),
  '/api/match/resolve':    () => import('./api/match/resolve.js'),
  '/api/match/watchurl':   () => import('./api/match/watchurl.js'),
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const routeLoader = ROUTES[url.pathname];
  if (!routeLoader) {
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const parsedBody = body ? JSON.parse(body) : {};
      const reqObj = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: parsedBody,
        query: Object.fromEntries(url.searchParams),
      };

      let sent = false;
      const resObj = {
        _code: 200,
        status(code) { this._code = code; return this; },
        json(data) {
          if (sent) return;
          sent = true;
          res.writeHead(this._code, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify(data));
        },
        end(data) {
          if (sent) return;
          sent = true;
          res.writeHead(this._code, corsHeaders);
          res.end(data || '');
        },
      };

      const mod = await routeLoader();
      await mod.default(reqObj, resObj);
    } catch (e) {
      console.error('[API ERROR]', req.url, e.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: e.message }));
      }
    }
  });
});

server.listen(PORT, () => console.log(`Local API server running on :${PORT}`));
