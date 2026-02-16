"use client";

import { EmailSignUp } from "@/components/auth/email-signup";
import { PhoneSignUp } from "@/components/auth/phone-signup";
import { usePathname } from "next/navigation";

export default function SignUpPage({ params }: { params: { rest?: string[] } }) {
  const pathname = usePathname();
  
  // Check if URL explicitly ends with /phone for phone signup
  const isPhoneSignUp = pathname.endsWith("/phone") || 
                       pathname.endsWith("/signup/phone") ||
                       (params.rest && params.rest.includes("phone"));
  
  return isPhoneSignUp ? <PhoneSignUp /> : <EmailSignUp />;
}
