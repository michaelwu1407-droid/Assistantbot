"use client";

import { useEffect } from 'react';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

const isValidPostHogKey = Boolean(
  POSTHOG_KEY &&
    POSTHOG_KEY !== "your_posthog_project_api_key_here" &&
    !POSTHOG_KEY.includes("placeholder") &&
    POSTHOG_KEY.length > 10
);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isValidPostHogKey) {
      return;
    }

    const initialize = async () => {
      const { default: posthog } = await import("posthog-js");

      posthog.init(POSTHOG_KEY as string, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*[data-private="true"]',
        },
      });

      if (process.env.NODE_ENV === "development") {
        posthog.debug();
      }
    };

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          void initialize();
        })
      : window.setTimeout(() => {
          void initialize();
        }, 350);

    return () => {
      if (typeof idle === "number") {
        window.clearTimeout(idle);
      } else {
        window.cancelIdleCallback(idle);
      }
    };
  }, []);

  return <>{children}</>;
}
