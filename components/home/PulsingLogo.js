"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { motion } from "framer-motion";

const EASE_STANDARD = [0.16, 1, 0.3, 1];

export function PulsingLogo() {
    const [isPlaying, setIsPlaying] = useState(false);
    const turbRef = useRef(null);
    const rafRef = useRef(0);
    const startRef = useRef(0);
    const uid = useId();
    const filterId = `liquid-distortion-${uid.replace(/:/g, "")}`;

    useEffect(() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!isPlaying || !turbRef.current || reducedMotion) {
            turbRef.current?.setAttribute("baseFrequency", "0.006");
            return;
        }

        startRef.current = performance.now();

        function animate(now) {
            const elapsed = (now - startRef.current) / 1000;
            // Two-axis frequency for organic liquid movement
            const freqX = (0.006 + 0.004 * Math.sin(elapsed * 0.8)).toFixed(4);
            const freqY = (0.006 + 0.004 * Math.sin(elapsed * 0.6 + 1.2)).toFixed(4);
            turbRef.current?.setAttribute("baseFrequency", `${freqX} ${freqY}`);
            rafRef.current = requestAnimationFrame(animate);
        }

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying]);

    const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

    return (
        <div
            className="flex flex-col items-center gap-5 cursor-pointer select-none"
            onClick={togglePlay}
            role="presentation"
        >
            {/* Phone frame */}
            <div className="relative w-[220px] sm:w-[280px] lg:w-[320px] rounded-[2.5rem] border-[3px] border-slate-800/90 bg-slate-900 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
                {/* Dynamic island */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-[18px] rounded-full bg-black z-10" />

                {/* Screen */}
                <div className="relative rounded-[2rem] overflow-hidden">
                    <svg
                        viewBox="0 0 200 200"
                        className="w-full h-auto block"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <filter
                                id={filterId}
                                x="-30%"
                                y="-30%"
                                width="160%"
                                height="160%"
                                colorInterpolationFilters="sRGB"
                            >
                                <feTurbulence
                                    ref={turbRef}
                                    type="turbulence"
                                    baseFrequency="0.006"
                                    numOctaves={1}
                                    seed={2}
                                    result="turbulence"
                                />
                                <feDisplacementMap
                                    in="SourceGraphic"
                                    in2="turbulence"
                                    scale={isPlaying ? 35 : 8}
                                    xChannelSelector="R"
                                    yChannelSelector="G"
                                />
                            </filter>
                        </defs>

                        {/* ── Outer circle — receives liquid distortion ── */}
                        <circle
                            cx="100"
                            cy="100"
                            r="100"
                            fill="#10B981"
                            filter={`url(#${filterId})`}
                        />

                        {/* ── Actual earlymark logo — NO filter, always crisp ── */}
                        <image
                            href="/latest-logo.png"
                            x="15"
                            y="15"
                            width="170"
                            height="170"
                            preserveAspectRatio="xMidYMid meet"
                        />
                    </svg>
                </div>

                {/* Home indicator */}
                <div className="mx-auto mt-1.5 w-24 h-1 rounded-full bg-slate-600" />
            </div>

            {/* Play / pause label */}
            <motion.button
                type="button"
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                aria-label={isPlaying ? "Pause demo call" : "Listen to a demo call"}
            >
                <span
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        isPlaying ? "bg-red-400 animate-pulse" : "bg-emerald-500"
                    }`}
                />
                {isPlaying ? "Listening…" : "Listen to a call"}
            </motion.button>
        </div>
    );
}
