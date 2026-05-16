// Pigsmith — fetch saved schemes for an email
exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return cors(204, '');
  if (event.httpMethod !== 'GET') return cors(405, JSON.stringify({ error: 'GET only' }));

  const email = (event.queryStringParameters && event.queryStringParameters.email || '').trim().toLowerCase();
  if (!email) return cors(400, JSON.stringify({ error: 'email required' }));

  const dbUrl = process.env.TURSO_DB_URL;
  const dbToken = process.env.TURSO_DB_TOKEN;
  if (!dbUrl || !dbToken) return cors(503, JSON.stringify({ error: 'Database not configured' }));

  const httpUrl = dbUrl.replace(/^libsql:/, 'https:') + '/v2/pipeline';

  try {
    const res = await fetch(httpUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${dbToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: {
            sql: 'SELECT id, title, summary, scheme_json, created_at FROM pigsmith_schemes WHERE email = ? ORDER BY created_at DESC LIMIT 50',
            args: [{ type: 'text', value: email }]
          } },
          { type: 'close' }
        ]
      })
    });
    if (!res.ok) return cors(200, JSON.stringify({ schemes: [] }));
    const data = await res.json();
    const rows = ((data.results || [])[0] || {}).response?.result?.rows || [];
    const cols = ((data.results || [])[0] || {}).response?.result?.cols || [];
    const schemes = rows.map(r => {
      const obj = {};
      cols.forEach((c, i) => { obj[c.name] = r[i] && r[i].value; });
      return obj;
    });
    return cors(200, JSON.stringify({ schemes }));
  } catch (err) {
    console.error('history error:', err);
    return cors(200, JSON.stringify({ schemes: [] }));
  }
};

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    },
    body
  };
}
