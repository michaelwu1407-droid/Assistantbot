"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestSupabasePage() {
  const [status, setStatus] = useState<string>("Testing...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        setStatus("Creating client...");
        const supabase = createClient();
        
        setStatus("Testing connection...");
        const { data, error } = await supabase
          .from('workspace')
          .select('count')
          .limit(1);

        if (error) {
          setError(error.message);
          setStatus("❌ Connection failed");
        } else {
          setStatus("✅ Connection successful");
          console.log("Supabase test successful:", data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("❌ Test failed");
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Supabase Connection Test</h1>
      <p>Status: {status}</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <p>Environment variables:</p>
      <ul>
        <li>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"}</li>
      </ul>
    </div>
  );
}
