"use client";

import Link from "next/link";

export function MobileStickyCTA() {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 md:hidden pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-white/85 backdrop-blur-md border border-[var(--color-hair)] rounded-full px-2 py-2 shadow-[0_10px_30px_-8px_rgba(14,31,26,0.18)]">
                <div className="flex-1 flex items-center gap-2 px-3 text-sm" style={{ color: "var(--color-ink2)" }}>
                    <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                            background: "#00D28B",
                            boxShadow: "0 0 0 4px rgba(0,210,139,0.2)",
                        }}
                    />
                    Try Tracey free — she&apos;ll call you back
                </div>
                <Link
                    href="/auth"
                    className="flex-shrink-0 text-white text-sm font-semibold px-4 py-2.5 rounded-full"
                    style={{ background: "var(--color-forest)" }}
                >
                    Start →
                </Link>
            </div>
        </div>
    );
}
