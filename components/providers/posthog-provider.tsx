"use client";

import posthog from 'posthog-js';
import { PostHogProvider as CSPostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// Check if PostHog key is properly configured (not a placeholder)
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Only initialize if we have a real API key (not placeholder or empty)
const isValidPostHogKey = POSTHOG_KEY && 
  POSTHOG_KEY !== '' && 
  POSTHOG_KEY !== 'your_posthog_project_api_key_here' &&
  !POSTHOG_KEY.includes('placeholder') &&
  POSTHOG_KEY.length > 10; // Real PostHog keys are longer

// Debug environment variables
if (typeof window !== 'undefined') {
    console.log('PostHog Debug - Environment Variables:', {
        NEXT_PUBLIC_POSTHOG_KEY: POSTHOG_KEY ? (isValidPostHogKey ? 'VALID' : 'PLACEHOLDER') : 'MISSING',
        NEXT_PUBLIC_POSTHOG_HOST: POSTHOG_HOST,
        NODE_ENV: process.env.NODE_ENV,
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
