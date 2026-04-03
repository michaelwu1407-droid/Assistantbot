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
        // Respect reduced-motion preference
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!isPlaying || !turbRef.current || reducedMotion) {
            turbRef.current?.setAttribute("baseFrequency", "0.015");
            return;
        }

        startRef.current = performance.now();

        function animate(now) {
            const elapsed = (now - startRef.current) / 1000;
            const freq = (0.025 + 0.018 * Math.sin(elapsed * 1.8)).toFixed(4);
            turbRef.current?.setAttribute("baseFrequency", freq);
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
            <svg
                viewBox="0 0 200 200"
                className="w-[240px] sm:w-[300px] lg:w-[340px] h-auto drop-shadow-2xl"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <filter
                        id={filterId}
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                        colorInterpolationFilters="sRGB"
                    >
                        <feTurbulence
                            ref={turbRef}
                            type="turbulence"
                            baseFrequency="0.015"
                            numOctaves={3}
                            seed={2}
                            result="turbulence"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="turbulence"
                            scale={isPlaying ? 18 : 5}
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>

                {/* ── Outer circle — receives liquid distortion ── */}
                <circle
                    cx="100"
                    cy="100"
                    r="92"
                    fill="#10B981"
                    filter={`url(#${filterId})`}
                />

                {/* ── Inner headset — NO filter, always crisp ── */}
                <g>
                    {/* Headband arc */}
                    <path
                        d="M 60,108 A 50,54 0 0,1 140,108"
                        stroke="white"
                        strokeWidth="7.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                    {/* Left ear cup */}
                    <rect x="45" y="97" width="19" height="32" rx="6" fill="white" />
                    {/* Right ear cup */}
                    <rect x="136" y="97" width="19" height="32" rx="6" fill="white" />
                    {/* Mic boom arm */}
                    <path
                        d="M 54,129 L 54,148 Q 54,157 63,157 L 73,157"
                        stroke="white"
                        strokeWidth="5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Mic capsule */}
                    <circle cx="78" cy="157" r="5.5" fill="white" />
                </g>
            </svg>

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
