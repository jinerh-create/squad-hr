export async function onRequest({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/, '');
  if (!env.SYNC_TOKEN || token !== env.SYNC_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'GET') {
    try {
      const row = await env.DB.prepare('SELECT value FROM kv WHERE key = ?').bind('squad_hr').first();
      return new Response(row?.value ?? 'null', {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.text();
      // Validate it's parseable JSON before storing
      JSON.parse(body);
      await env.DB.prepare(
        'INSERT INTO kv(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
      ).bind('squad_hr', body, new Date().toISOString()).run();
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
}
