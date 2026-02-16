import { EmailSignUp } from "@/components/auth/email-signup";
import { PhoneSignUp } from "@/components/auth/phone-signup";

export default function SignupPage({ params }: { params: { rest: string[] } }) {
  // If URL contains "phone", show phone signup, otherwise show email
  const isPhoneSignUp = params.rest?.includes?.("phone") || 
                       params.rest?.includes?.("sms") || 
                       window.location.pathname.includes("phone");
  
  return isPhoneSignUp ? <PhoneSignUp /> : <EmailSignUp />;
}
