"use client";

import posthog from 'posthog-js';
import { PostHogProvider as CSPostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// Static imports to bundle PostHog modules
import 'posthog-js/dist/posthog-recorder';

// Check if PostHog key is properly configured (not a placeholder)
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_SUPABASE_HOST || 'https://us.i.posthog.com';

// Only initialize if we have a real API key (not placeholder or empty)
const isValidPostHogKey = POSTHOG_KEY && 
  POSTHOG_KEY !== '' && 
  POSTHOG_KEY !== 'your_posthog_project_api_key_here' &&
  !POSTHOG_KEY.includes('placeholder') &&
  POSTHOG_KEY.length > 10; // Real PostHog keys are longer

// Debug environment variables in detail
if (typeof window !== 'undefined') {
    console.log('PostHog Debug - Detailed Environment Variables:', {
        NEXT_PUBLIC_POSTHOG_KEY: POSTHOG_KEY ? `${POSTHOG_KEY.substring(0, 10)}...${POSTHOG_KEY.substring(POSTHOG_KEY.length - 5)}` : 'MISSING',
        NEXT_PUBLIC_POSTHOG_KEY_LENGTH: POSTHOG_KEY?.length || 0,
        NEXT_PUBLIC_POSTHOG_HOST: POSTHOG_HOST,
        NODE_ENV: process.env.NODE_ENV,
        window_location: window.location.origin,
        env_available: !!process.env.NEXT_PUBLIC_POSTHOG_KEY
    });
}

// Initialize PostHog client-side only with valid key
if (typeof window !== 'undefined' && isValidPostHogKey) {
    console.log('PostHog Debug - Initializing with valid key');
    
    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
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
    console.log('PostHog Debug - Not initializing: No valid PostHog API key provided');
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Optionally capture initial pageview on mount
        if (typeof window !== 'undefined' && posthog.__loaded && isValidPostHogKey) {
            console.log('PostHog Debug - PostHog is loaded, ready to capture events');
            // posthog.capture('$pageview');
        } else {
            console.log('PostHog Debug - PostHog is not loaded or not configured');
        }
    }, []);

    // Only provide PostHog context if we have a valid key
    if (typeof window !== 'undefined' && isValidPostHogKey) {
        return <CSPostHogProvider client={posthog}>{children}</CSPostHogProvider>;
    }

    // Return children without PostHog if no valid key
    return <>{children}</>;
}
