export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
}

export async function onRequestPost({ request, env }) {
  let events;
  try {
    const raw = await request.text();
    if (raw.length > 64 * 1024) return new Response(null, { status: 413 });
    events = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!Array.isArray(events)) events = [events];

  const hash = async (value) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  };
  const cidHash = await hash(`${events[0]?.cid || ''}|cet-analytics`);

  const stmts = [];
  for (const e of events.slice(0, 20)) {
    const ev = String(e.ev || '').slice(0, 32);
    if (!ev) continue;
    const ts = Math.round(Number(e.ts) || Date.now() / 1000);
    const day = new Date(ts * 1000).toISOString().slice(0, 10);
    const props = JSON.stringify(e.props || {}).slice(0, 512);
    const path = String(e.path || '').slice(0, 96);
    stmts.push(env.DB.prepare(
      'INSERT INTO events (ts, day, ev, cid, path, props) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(ts, day, ev, cidHash, path, props));
  }
  if (stmts.length) {
    try { await env.DB.batch(stmts); }
    catch (err) { return new Response(String(err).slice(0, 200), { status: 500 }); }
  }
  return new Response(null, { status: 204 });
}
