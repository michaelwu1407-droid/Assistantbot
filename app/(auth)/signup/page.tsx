import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp 
        afterSignUpUrl="/setup"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-slate-200",
          },
        }}
      />
    </div>
  );
}
