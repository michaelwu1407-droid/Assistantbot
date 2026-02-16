"use client";

import { EmailSignIn } from "@/components/auth/email-signin";
import { PhoneSignIn } from "@/components/auth/phone-signin";
import { usePathname } from "next/navigation";

export default async function LoginPage({ params }: { params: Promise<{ rest?: string[] }> }) {
  const pathname = usePathname();
  const resolvedParams = await params;
  
  // Check if URL explicitly ends with /phone for phone signin
  const isPhoneSignIn = pathname.endsWith("/phone") || 
                      pathname.endsWith("/login/phone") ||
                      (resolvedParams.rest && resolvedParams.rest.includes("phone"));
  
  return isPhoneSignIn ? <PhoneSignIn /> : <EmailSignIn />;
}
