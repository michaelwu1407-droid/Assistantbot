import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Create admin client to delete user
    const supabaseAdmin = await createClient();
    
    // Try to delete the user from Supabase auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error("Failed to delete user from Supabase:", error);
      return NextResponse.json({ error: "Failed to delete user from authentication system" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
