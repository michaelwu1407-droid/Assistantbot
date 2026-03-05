/**
 * Run this once to create the leads table in Supabase.
 * node create-leads-table.mjs
 */

const SUPABASE_URL = 'https://uvqcplkfscuewrxnzmfe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWNwbGtmc2N1ZXdyeG56bWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg0ODA4MCwiZXhwIjoyMDg3NDI0MDgwfQ._PXF_WC8PzGrVCBrZ5DWLgwoOnOxjDgFcIQLQpppv5s';

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
