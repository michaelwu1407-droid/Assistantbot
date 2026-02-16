"use client";

import { EmailSignIn } from "@/components/auth/email-signin";
import { PhoneSignIn } from "@/components/auth/phone-signin";
import { usePathname } from "next/navigation";

export default function LoginPage({ params }: { params: { rest?: string[] } }) {
  const pathname = usePathname();
  
  // Check if URL explicitly ends with /phone for phone signin
  const isPhoneSignIn = pathname.endsWith("/phone") || 
                      pathname.endsWith("/login/phone") ||
                      (params.rest && params.rest.includes("phone"));
  
  return isPhoneSignIn ? <PhoneSignIn /> : <EmailSignIn />;
}
