"use client";

import { EmailSignIn } from "@/components/auth/email-signin";
import { PhoneSignIn } from "@/components/auth/phone-signin";
import { usePathname } from "next/navigation";

export default function LoginPage({ params }: { params: { rest: string[] } }) {
  const pathname = usePathname();
  
  // If URL contains "phone", show phone signin, otherwise show email
  const isPhoneSignIn = params.rest?.includes?.("phone") || 
                       params.rest?.includes?.("sms") || 
                       pathname.includes("phone");
  
  return isPhoneSignIn ? <PhoneSignIn /> : <EmailSignIn />;
}
