import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
let ready = false;

async function ensureTable() {
  if (ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id         BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      niche      TEXT NOT NULL DEFAULT 'unknown',
      company    TEXT NOT NULL,
      town       TEXT,
      phone      TEXT,
      trade      TEXT,
      source     TEXT,
      status     TEXT NOT NULL DEFAULT 'new',
      note       TEXT
    )`;
  ready = true;
}

function clean(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200);
}

async function notify(lead) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.NOTIFY_FROM;
  if (!key || !to || !from) return;           // opcional: só envia se configurado
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to,
        subject: `[LEAD] ${lead.company} - ${lead.town || '?'}`,
        text: [
          `Empresa: ${lead.company}`,
          `Cidade: ${lead.town}`,
          `Telefone: ${lead.phone}`,
          `Ramo: ${lead.trade}`,
          `Nicho: ${lead.niche}`,
          '',
          'Abra o painel para acompanhar o funil.'
        ].join('\n')
      })
    });
  } catch (_) { /* nunca derruba o lead por falha de e-mail */ }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // honeypot: bot preenche, humano não vê
  if (clean(b.website)) return res.status(200).json({ ok: true });

  const lead = {
    company: clean(b.company, 120),
    town:    clean(b.town, 80),
    phone:   clean(b.phone, 40),
    trade:   clean(b.trade, 120),
    niche:   clean(b.niche, 40) || 'unknown',
    source:  clean(b.source, 200)
  };

  if (!lead.company) return res.status(400).json({ error: 'company_required' });

  try {
    await ensureTable();
    await sql`
      INSERT INTO leads (niche, company, town, phone, trade, source)
      VALUES (${lead.niche}, ${lead.company}, ${lead.town}, ${lead.phone}, ${lead.trade}, ${lead.source})`;
    notify(lead);                              // não aguarda: resposta rápida pro visitante
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead insert failed', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
