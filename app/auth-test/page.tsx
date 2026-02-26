"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

export default function AuthTestPage() {
  const [status, setStatus] = useState("Checking auth...");
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          setStatus(`❌ Auth Error: ${error.message}`);
        } else if (user) {
          setStatus(`✅ Authenticated as: ${user.email}`);
          setUser(user);
        } else {
          setStatus("❌ Not authenticated - please log in");
        }
      } catch (e) {
        setStatus(`❌ Exception: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    router.push("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-4">Authentication Status</h1>
        
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <p className="text-sm font-mono">{status}</p>
        </div>

        {user && (
          <div className="mb-6 p-4 bg-green-50 rounded">
            <h3 className="font-semibold text-green-800 mb-2">User Details:</h3>
            <p className="text-sm text-green-700">ID: {user.id}</p>
            <p className="text-sm text-green-700">Email: {user.email}</p>
            <p className="text-sm text-green-700">Created: {new Date(user.created_at).toLocaleString()}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          Go to Login Page
        </button>
      </div>
    </div>
  );
}
