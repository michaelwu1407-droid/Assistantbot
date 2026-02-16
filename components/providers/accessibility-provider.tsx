'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { announceToScreenReader, createSkipLink, prefersReducedMotion, prefersHighContrast } from '@/lib/accessibility';

interface AccessibilityContextType {
  announce: (message: string) => void;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  screenReaderEnabled: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [prefersHigh, setPrefersHigh] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    // Check user preferences
    setPrefersReduced(prefersReducedMotion());
    setPrefersHigh(prefersHighContrast());

    // Detect screen reader
    const handleScreenReaderChange = () => {
      setScreenReaderEnabled(window.speechSynthesis?.speaking || false);
    };

    // Listen for screen reader announcements
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', handleScreenReaderChange);
    }

    // Create skip link
    createSkipLink();

    // Add keyboard navigation support
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + S for skip to main content
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          announceToScreenReader('Navigated to main content');
        }
      }

      // Alt + H for help
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        announceToScreenReader('Help menu - use tab to navigate options');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleScreenReaderChange);
      }
    };
  }, []);

  const announce = (message: string) => {
    announceToScreenReader(message);
  };

  const value: AccessibilityContextType = {
    announce,
    prefersReducedMotion: prefersReduced,
    prefersHighContrast: prefersHigh,
    screenReaderEnabled,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      <div className={`
        ${prefersReduced ? 'reduce-motion' : ''}
        ${prefersHigh ? 'high-contrast' : ''}
      `}>
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
}
