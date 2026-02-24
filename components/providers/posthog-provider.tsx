"use client";

import posthog from 'posthog-js';
import { PostHogProvider as CSPostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// Debug environment variables
if (typeof window !== 'undefined') {
    console.log('PostHog Debug - Environment Variables:', {
        NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'SET' : 'MISSING',
        NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        NODE_ENV: process.env.NODE_ENV,
    });
}

// Initialize PostHog client-side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    console.log('PostHog Debug - Initializing with key:', process.env.NEXT_PUBLIC_POSTHOG_KEY.substring(0, 10) + '...');
    
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only', // Only create profiles for logged-in users to save cost
        capture_pageview: false, // We'll handle pageviews manually or let Next.js routing do it if explicitly configured
        session_recording: {
            maskAllInputs: true, // Default privacy measure: mask all typing
            maskTextSelector: '*[data-private="true"]', // Mask specific DOM elements
        },
        loaded: (posthog) => {
            console.log('PostHog Debug - Successfully loaded');
            // Enable debug mode only in local development
            if (process.env.NODE_ENV === 'development') {
                posthog.debug();
            }
        },
    });
} else {
    console.warn('PostHog Debug - Not initializing: NEXT_PUBLIC_POSTHOG_KEY is missing');
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Optionally capture initial pageview on mount
        if (typeof window !== 'undefined' && posthog.__loaded) {
            console.log('PostHog Debug - PostHog is loaded, capturing pageview');
            // posthog.capture('$pageview');
        } else {
            console.log('PostHog Debug - PostHog is not loaded');
        }
    }, []);

    // Always provide PostHog context if key exists, even if not loaded yet
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        return <CSPostHogProvider client={posthog}>{children}</CSPostHogProvider>;
    }

    // Return children without PostHog if no key
    return <>{children}</>;
}
