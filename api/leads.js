import { neon } from '@neondatabase/serverless';
import { timingSafeEqual, createHash } from 'node:crypto';

const sql = neon(process.env.DATABASE_URL);

function authorized(req) {
  const expected = process.env.PANEL_PASSWORD;
  if (!expected) return false;                       // sem senha configurada, nega tudo
  const given = req.headers['x-painel-key'];
  if (!given) return false;
  const a = createHash('sha256').update(String(given)).digest();
  const b = createHash('sha256').update(String(expected)).digest();
  return timingSafeEqual(a, b);                      // hash iguala tamanho e evita timing attack
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, created_at, niche, company, town, phone, trade, status, note
        FROM leads ORDER BY created_at DESC LIMIT 500`;
      return res.status(200).json({ leads: rows });
    }

    if (req.method === 'PATCH') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const id = parseInt(b.id, 10);
      if (!id) return res.status(400).json({ error: 'id_required' });

      const allowed = ['new', 'called', 'meeting', 'won', 'lost'];
      const status = allowed.includes(b.status) ? b.status : null;
      const note = b.note == null ? null : String(b.note).slice(0, 800);

      if (status !== null) await sql`UPDATE leads SET status = ${status} WHERE id = ${id}`;
      if (note !== null)   await sql`UPDATE leads SET note   = ${note}   WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('leads handler failed', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
