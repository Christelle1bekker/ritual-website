// Serverless function: POST /api/waitlist
// Captures emails from the landing page waitlist form into Supabase.

import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = new Set([
  'https://ritualhabits.com.au',
  'https://www.ritualhabits.com.au',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
]);

// Basic email regex — permissive enough for real addresses, strict enough to reject obvious junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Vercel parses JSON bodies automatically when Content-Type is application/json,
  // but handle the string case as a fallback.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  if (!rawEmail || rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  const email = rawEmail.toLowerCase();

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from('waitlist')
    .insert({ email, source: 'landing_page' });

  if (error) {
    // 23505 = unique_violation. Duplicates are not a failure — they're already signed up.
    if (error.code === '23505') {
      return res.status(200).json({ ok: true, alreadySubscribed: true });
    }
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Could not save email. Please try again.' });
  }

  return res.status(200).json({ ok: true });
}
