"use server";

// Sign-in and sign-up are now handled by Clerk's built-in UI components.
// These stubs exist only for any code that may still import them.

export async function login(_formData: FormData) {
  return { error: "Use Clerk sign-in component" };
}

export async function signup(_formData: FormData) {
  return { error: "Use Clerk sign-up component" };
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function loginWithGoogle() {
  // Clerk handles OAuth via its dashboard Social connections config
}
