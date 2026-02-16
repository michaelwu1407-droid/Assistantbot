import { SignIn } from "@clerk/nextjs";

// Clerk's SignIn component includes built-in "Forgot password?" functionality.
export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center">
      <SignIn
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
