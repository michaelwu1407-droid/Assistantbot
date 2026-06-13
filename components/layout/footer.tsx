import Link from "next/link";
import Image from "next/image";

const PRODUCT_LINKS = [
  { href: "/features", label: "Product" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
];

export function Footer() {
  return (
    <footer className="w-full bg-forest">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8 flex flex-col gap-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3 max-w-xs">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/latest-logo.png" alt="Earlymark" width={28} height={28} className="rounded-md" unoptimized />
              <span className="text-base font-bold tracking-tight text-paper">Earlymark</span>
            </Link>
            <p className="text-xs leading-relaxed text-white/50">
              The AI assistant &amp; CRM that answers every call, books the job, and handles the admin — so you can knock off early.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-mint-500">Explore</p>
              {PRODUCT_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="text-sm text-white/65 transition-colors hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-mint-500">Legal</p>
              {LEGAL_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="text-sm text-white/65 transition-colors hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Earlymark. All rights reserved.</span>
          <span>Made for tradies, run by Tracey.</span>
        </div>
      </div>
    </footer>
  );
}
