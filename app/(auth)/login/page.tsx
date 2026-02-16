import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn 
        afterSignInUrl="/setup"
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
