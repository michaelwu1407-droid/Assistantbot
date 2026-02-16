import { EmailSignIn } from "@/components/auth/email-signin";
import { PhoneSignIn } from "@/components/auth/phone-signin";

export default function LoginPage({ params }: { params: { rest: string[] } }) {
  // If URL contains "phone", show phone signin, otherwise show email
  const isPhoneSignIn = params.rest?.includes?.("phone") || 
                       params.rest?.includes?.("sms") || 
                       window.location.pathname.includes("phone");
  
  return isPhoneSignIn ? <PhoneSignIn /> : <EmailSignIn />;
}
