"use client";

import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.6, ease: EASE },
};

/**
 * Running indexed section header — the marketing site's signature device.
 * A hairline rule with an index + kicker, then an oversized serif title and
 * an optional right-aligned lead. Works on light and dark (forest) surfaces.
 */
export function SectionHead({
    index, kicker, title, lead, dark = false,
}: {
    index: string;
    kicker: string;
    title: React.ReactNode;
    lead?: React.ReactNode;
    dark?: boolean;
}) {
    const ruleTone = dark ? "border-white/15" : "border-hair";
    const idxTone = dark ? "text-mint-500" : "text-forest";
    const kickerTone = dark ? "text-paper/45" : "text-ink2/55";
    const titleTone = dark ? "text-paper" : "text-ink";
    const leadTone = dark ? "text-paper/60" : "text-ink2";
    return (
        <motion.div {...fadeUp} className="mb-10 md:mb-16">
            <div className={`flex items-center gap-4 border-t ${ruleTone} pt-3.5`}>
                <span className={`em-kicker ${idxTone}`}>{index}</span>
                <span className={`em-kicker flex-1 ${kickerTone}`}>{kicker}</span>
            </div>
            <div className="mt-7 grid gap-x-8 gap-y-4 md:grid-cols-12 md:items-end">
                <h2 className={`md:col-span-8 em-display text-[2rem] leading-[1.0] sm:text-5xl md:text-[3.5rem] ${titleTone}`}>
                    {title}
                </h2>
                {lead && (
                    <p className={`md:col-span-4 text-[15px] leading-relaxed md:self-end md:text-right ${leadTone}`}>
                        {lead}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
