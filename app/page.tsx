import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-slate-50">Pj Buddy</h1>
        <p className="text-xl text-slate-400">High-Velocity Hub and Spoke CRM</p>
      </div>

      <div className="flex gap-4">
        <Link href="/login">
          <Button size="lg" className="bg-slate-50 text-slate-950 hover:bg-slate-200">
            Get Started
          </Button>
        </Link>
        <Link href="/dashboard/tradie">
          <Button size="lg" variant="outline">
            Tradie Mode
          </Button>
        </Link>
      </div>
    </div>
  );
}
