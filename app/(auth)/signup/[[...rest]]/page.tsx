"use client";

import { EmailSignUp } from "@/components/auth/email-signup";
import { PhoneSignUp } from "@/components/auth/phone-signup";
import { usePathname } from "next/navigation";

export default async function SignUpPage({ params }: { params: Promise<{ rest?: string[] }> }) {
  const pathname = usePathname();
  const resolvedParams = await params;
  
  // Check if URL explicitly ends with /phone for phone signup
  const isPhoneSignUp = pathname.endsWith("/phone") || 
                       pathname.endsWith("/signup/phone") ||
                       (resolvedParams.rest && resolvedParams.rest.includes("phone"));
  
  return isPhoneSignUp ? <PhoneSignUp /> : <EmailSignUp />;
}
