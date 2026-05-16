// Pigsmith — email capture (Turso HTTP API, zero npm deps)

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return cors(204, '');
  if (event.httpMethod !== 'POST') return cors(405, JSON.stringify({ error: 'POST only' }));

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return cors(400, JSON.stringify({ error: 'Invalid JSON' })); }

  const email = (body.email || '').trim().toLowerCase();
  const source = (body.source || 'unknown').slice(0, 50);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return cors(400, JSON.stringify({ error: 'Valid email required' }));
  }

  const dbUrl = process.env.TURSO_DB_URL;
  const dbToken = process.env.TURSO_DB_TOKEN;
  const idea = process.env.IDEA_SLUG || 'pigsmith';

  if (!dbUrl || !dbToken) {
    console.error('Turso env vars missing');
    return cors(503, JSON.stringify({ error: 'Database not configured' }));
  }

  const httpUrl = dbUrl.replace(/^libsql:/, 'https:') + '/v2/pipeline';

  try {
    const stmt = {
      sql: 'INSERT INTO subscribers (email, source, idea, created_at) VALUES (?, ?, ?, datetime(\'now\')) ON CONFLICT(email, idea) DO NOTHING',
      args: [
        { type: 'text', value: email },
        { type: 'text', value: source },
        { type: 'text', value: idea }
      ]
    };
    const res = await fetch(httpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dbToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt },
          { type: 'close' }
        ]
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Turso insert failed:', res.status, txt);
      return cors(503, JSON.stringify({ error: 'Could not save subscriber' }));
    }
    return cors(200, JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('subscribe error:', err);
    return cors(503, JSON.stringify({ error: 'Could not save subscriber' }));
  }
};

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body
  };
}
