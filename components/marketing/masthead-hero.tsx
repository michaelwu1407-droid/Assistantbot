"use client";

import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.6, delay, ease: EASE },
});

/**
 * Editorial masthead hero for inner marketing pages.
 * Top hairline rule (index · kicker · locale), then an oversized Fraunces
 * headline with a right-hand spec column for the lead + actions.
 */
export function MastheadHero({
    index, kicker, title, lead, actions,
}: {
    index: string;
    kicker: string;
    title: React.ReactNode;
    lead?: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <section className="em-grain relative overflow-hidden bg-cream px-5 sm:px-8 pt-24 sm:pt-28 pb-16 md:pb-24">
            <div className="relative z-10 mx-auto max-w-[1320px]">
                <motion.div {...fadeUp(0.02)} className="flex items-center justify-between gap-4 border-t border-hair pt-3.5">
                    <span className="em-kicker text-forest">{index}</span>
                    <span className="em-kicker hidden text-ink2/55 sm:inline">{kicker}</span>
                    <span className="em-kicker text-ink2/55">Australia</span>
                </motion.div>
                <div className="mt-12 grid gap-x-8 gap-y-8 sm:mt-16 md:grid-cols-12 md:items-end">
                    <motion.h1 {...fadeUp(0.06)} className="em-display col-span-12 text-[clamp(2.5rem,7vw,6rem)] text-ink md:col-span-8">
                        {title}
                    </motion.h1>
                    {(lead || actions) && (
                        <motion.div {...fadeUp(0.12)} className="col-span-12 flex flex-col gap-6 md:col-span-4 md:pb-2">
                            {lead && <p className="max-w-sm text-[15px] leading-relaxed text-ink2">{lead}</p>}
                            {actions && <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>}
                        </motion.div>
                    )}
                </div>
            </div>
        </section>
    );
}
