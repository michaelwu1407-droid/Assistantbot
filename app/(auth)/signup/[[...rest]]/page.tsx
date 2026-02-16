"use client";

import { EmailSignUp } from "@/components/auth/email-signup";
import { PhoneSignUp } from "@/components/auth/phone-signup";
import { usePathname } from "next/navigation";

export default function SignupPage({ params }: { params: { rest: string[] } }) {
  const pathname = usePathname();
  
  // If URL contains "phone", show phone signup, otherwise show email
  const isPhoneSignUp = params.rest?.includes?.("phone") || 
                       params.rest?.includes?.("sms") || 
                       pathname.includes("phone");
  
  return isPhoneSignUp ? <PhoneSignUp /> : <EmailSignUp />;
}
