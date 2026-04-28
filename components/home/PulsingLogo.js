"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const organicEase = [0.37, 0, 0.21, 1];
const voiceEase = [0.45, 0, 0.18, 1];
const WAVE_RIDGES = Array.from({ length: 56 }, (_, index) => ({
    angle: (360 / 56) * index,
    delay: (index % 14) * 0.12,
    height: 12 + ((index * 11) % 19),
    duration: 3.1 + (index % 7) * 0.16,
    offset: 63 + (index % 4),
}));

export function PulsingLogo() {
    return (
        <div className="select-none">
            <div className="relative w-[226px] sm:w-[254px] lg:w-[280px]">
                <div className="absolute -left-[2px] top-[92px] h-8 w-[4px] rounded-r-full bg-slate-300/90 shadow-[0_0_1px_rgba(255,255,255,0.9)]" />
                <div className="absolute -left-[2px] top-[136px] h-14 w-[4px] rounded-r-full bg-slate-300/90 shadow-[0_0_1px_rgba(255,255,255,0.9)]" />
                <div className="absolute -left-[2px] top-[204px] h-14 w-[4px] rounded-r-full bg-slate-300/90 shadow-[0_0_1px_rgba(255,255,255,0.9)]" />
                <div className="absolute -right-[2px] top-[148px] h-20 w-[4px] rounded-l-full bg-slate-300/90 shadow-[0_0_1px_rgba(255,255,255,0.9)]" />

                <div className="relative rounded-[3rem] border border-slate-300/70 bg-[linear-gradient(135deg,rgba(248,250,252,0.98)_0%,rgba(228,234,240,0.98)_48%,rgba(246,248,250,0.98)_100%)] p-[5px] shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
                    <div className="rounded-[2.75rem] bg-[#090C10] p-[4px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <div className="absolute left-1/2 top-[15px] z-20 flex h-[24px] w-[110px] -translate-x-1/2 items-center justify-end rounded-full bg-slate-950/96 px-3 shadow-sm">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-800 ring-1 ring-white/10" />
                        </div>

                        <div className="relative min-h-[432px] overflow-hidden rounded-[2.42rem] border border-slate-300/70 bg-[radial-gradient(circle_at_50%_24%,rgba(236,253,245,0.82)_0%,rgba(226,232,240,0.82)_44%,rgba(203,213,225,0.62)_100%)]">
                    <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0.04)_38%,rgba(15,23,42,0.035)_100%)]" />
                    <div className="absolute left-5 right-5 top-10 z-10 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span>9:41</span>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-4 rounded-full bg-slate-400/70" />
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400/70" />
                        </div>
                    </div>
                    <div className="absolute left-5 right-5 top-[78px] z-10 flex items-center justify-between rounded-full border border-white/70 bg-white/64 px-3 py-2 shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700">Live call</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700">00:18</span>
                    </div>

                    <div className="relative flex min-h-[432px] items-center justify-center px-6 py-10">
                        <motion.div
                            className="absolute h-[236px] w-[236px] rounded-[46%_54%_58%_42%/44%_48%_52%_56%] bg-emerald-300/24 blur-2xl"
                            animate={{
                                scale: [0.88, 1.12, 0.96, 1.05, 0.91, 1.08, 0.88],
                                x: [0, 14, -10, 5, -13, 8, 0],
                                y: [0, -16, 9, -8, 11, -5, 0],
                                borderRadius: [
                                    "46% 54% 58% 42% / 44% 48% 52% 56%",
                                    "58% 42% 46% 54% / 52% 60% 40% 48%",
                                    "42% 58% 54% 46% / 60% 42% 58% 40%",
                                    "54% 46% 42% 58% / 46% 56% 44% 54%",
                                    "46% 54% 58% 42% / 44% 48% 52% 56%",
                                ],
                            }}
                            transition={{ duration: 4.8, repeat: Infinity, ease: organicEase }}
                        />

                        <motion.div
                            className="absolute h-[184px] w-[184px] rounded-[55%_45%_49%_51%/48%_57%_43%_52%] bg-[#00D28B]/22 blur-lg"
                            animate={{
                                scale: [1, 1.18, 0.92, 1.1, 0.98, 1.14, 1],
                                x: [0, -12, 9, -4, 10, -7, 0],
                                y: [0, 11, -13, 6, -9, 5, 0],
                            }}
                            transition={{ duration: 3.7, repeat: Infinity, ease: organicEase }}
                        />

                        <motion.div
                            className="relative flex h-[136px] w-[136px] items-center justify-center overflow-hidden rounded-[44%_56%_51%_49%/48%_43%_57%_52%] bg-[#00D28B] shadow-[0_24px_58px_rgba(0,210,139,0.44)]"
                            animate={{
                                scale: [1, 1.035, 0.985, 1.045, 0.995, 1.025, 1],
                                rotate: [0, -1.2, 1.6, -0.8, 1.1, -0.4, 0],
                                borderRadius: [
                                    "44% 56% 51% 49% / 48% 43% 57% 52%",
                                    "58% 42% 47% 53% / 56% 60% 40% 44%",
                                    "42% 58% 62% 38% / 40% 48% 52% 60%",
                                    "56% 44% 40% 60% / 54% 42% 58% 46%",
                                    "44% 56% 58% 42% / 43% 58% 42% 57%",
                                    "44% 56% 51% 49% / 48% 43% 57% 52%",
                                ],
                            }}
                            transition={{ duration: 3.1, repeat: Infinity, ease: voiceEase }}
                        >
                            {WAVE_RIDGES.map((ridge) => (
                                <span
                                    key={ridge.angle}
                                    className="absolute left-1/2 top-1/2 z-0"
                                    style={{
                                        transform: `rotate(${ridge.angle}deg) translateY(-${ridge.offset}px)`,
                                    }}
                                >
                                    <motion.span
                                        className="block w-[3px] rounded-full bg-emerald-50/75 shadow-[0_0_10px_rgba(236,253,245,0.36)]"
                                        style={{
                                            height: ridge.height,
                                            marginLeft: -1.5,
                                            marginTop: -ridge.height / 2,
                                            transformOrigin: "50% 50%",
                                        }}
                                        animate={{
                                            scaleY: [0.52, 1.68, 0.82, 1.24, 0.64],
                                            opacity: [0.2, 0.82, 0.34, 0.68, 0.24],
                                        }}
                                        transition={{
                                            duration: ridge.duration,
                                            delay: ridge.delay,
                                            repeat: Infinity,
                                            ease: voiceEase,
                                        }}
                                    />
                                </span>
                            ))}

                            <motion.div
                                className="absolute inset-[-18px] rounded-[44%_56%_51%_49%/48%_43%_57%_52%] border border-emerald-200/35 bg-emerald-100/12"
                                animate={{
                                    scale: [0.96, 1.1, 1.02, 1.14, 0.98, 1.08, 0.96],
                                    opacity: [0.18, 0.36, 0.16, 0.32, 0.2, 0.34, 0.18],
                                    rotate: [0, 4, -2, 3, -3, 1, 0],
                                    borderRadius: [
                                        "44% 56% 51% 49% / 48% 43% 57% 52%",
                                        "60% 40% 44% 56% / 52% 62% 38% 48%",
                                        "42% 58% 64% 36% / 58% 44% 56% 42%",
                                        "56% 44% 42% 58% / 50% 40% 60% 50%",
                                        "44% 56% 51% 49% / 48% 43% 57% 52%",
                                    ],
                                }}
                                transition={{ duration: 2.6, repeat: Infinity, ease: voiceEase }}
                            />

                            <motion.div
                                className="absolute -left-8 top-4 h-20 w-20 rounded-full bg-white/18 blur-md"
                                animate={{
                                    x: [0, 16, -6, 12, 0],
                                    y: [0, -8, 12, -3, 0],
                                    opacity: [0.18, 0.32, 0.2, 0.28, 0.18],
                                }}
                                transition={{ duration: 2.35, repeat: Infinity, ease: organicEase }}
                            />

                            <motion.div
                                className="absolute -bottom-7 right-0 h-24 w-24 rounded-full bg-emerald-900/12 blur-lg"
                                animate={{
                                    x: [0, -10, 8, -4, 0],
                                    y: [0, 8, -10, 4, 0],
                                    opacity: [0.22, 0.36, 0.2, 0.32, 0.22],
                                }}
                                transition={{ duration: 2.9, repeat: Infinity, ease: organicEase }}
                            />

                            <Image
                                src="/latest-logo.png"
                                alt="Earlymark"
                                width={68}
                                height={68}
                                className="relative z-10 h-[68px] w-[68px] object-contain"
                                unoptimized
                            />
                        </motion.div>
                    </div>
                        </div>
                    </div>

                    <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-slate-500/32" />
                </div>
            </div>
        </div>
    );
}
