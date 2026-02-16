"use client";

import { EmailSignUp } from "@/components/auth/email-signup";
import { PhoneSignUp } from "@/components/auth/phone-signup";
import { usePathname } from "next/navigation";
import { use } from "react";

export default function SignupPage({ params }: { params: { rest: Promise<string[]> } }) {
  const pathname = usePathname();
  const resolvedParams = use(params) as { rest: string[] };
  
  // Check if URL explicitly ends with /phone for phone signup
  const isPhoneSignUp = pathname.endsWith("/phone") || 
                       pathname.endsWith("/signup/phone") ||
                       (resolvedParams.rest && resolvedParams.rest.includes("phone"));
  
  return isPhoneSignUp ? <PhoneSignUp /> : <EmailSignUp />;
}
