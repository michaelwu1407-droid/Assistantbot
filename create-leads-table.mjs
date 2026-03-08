/**
 * Run this once to create the leads table in Supabase.
 * node create-leads-table.mjs
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running create-leads-table.mjs.",
  );
}

const sql = `
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text,
  business_name text,
  business_type text,
  phone text,
  interest_level text CHECK (interest_level IN ('hot', 'warm', 'cold')),
  notes text,
  source text DEFAULT 'voice_call',
  created_at timestamptz DEFAULT now()
);
`;

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (res.ok) {
  console.log('leads table created (or already exists)');
} else {
  // Supabase doesn't expose exec_sql — use the Dashboard SQL editor instead.
  console.log('Status:', res.status);
  console.log('Use Supabase Dashboard > SQL Editor and run:');
  console.log(sql);
}
