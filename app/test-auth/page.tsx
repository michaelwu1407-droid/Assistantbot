"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TestAuthPage() {
  const [authStatus, setAuthStatus] = useState<string>("Checking...");
  const [userInfo, setUserInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          setAuthStatus(`Error: ${error.message}`);
        } else if (user) {
          setAuthStatus("Authenticated ✅");
          setUserInfo({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name,
            created_at: user.created_at
          });
        } else {
          setAuthStatus("Not authenticated ❌");
        }
      } catch (e) {
        setAuthStatus(`Exception: ${e.message}`);
      }
    };

    checkAuth();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Status Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Current Status:</h2>
          <p className="text-lg">{authStatus}</p>
        </div>

        {userInfo && (
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">User Info:</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="space-x-4">
          <button 
            onClick={() => router.push("/auth")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Auth
          </button>
          
          {userInfo && (
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
