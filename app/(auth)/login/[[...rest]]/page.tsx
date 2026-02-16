"use client";

import { EmailSignIn } from "@/components/auth/email-signin";
import { PhoneSignIn } from "@/components/auth/phone-signin";
import { usePathname } from "next/navigation";
import { use } from "react";

export default function LoginPage({ params }: { params: { rest: Promise<string[]> } }) {
  const pathname = usePathname();
  const resolvedParams = use(params) as { rest: string[] };
  
  // Check if URL explicitly ends with /phone for phone signin
  const isPhoneSignIn = pathname.endsWith("/phone") || 
                      pathname.endsWith("/login/phone") ||
                      (resolvedParams.rest && resolvedParams.rest.includes("phone"));
  
  return isPhoneSignIn ? <PhoneSignIn /> : <EmailSignIn />;
}
