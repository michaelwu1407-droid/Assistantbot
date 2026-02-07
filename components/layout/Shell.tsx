'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface ShellProps {
  children: React.ReactNode; // The "Canvas" (Main App)
  chatbot: React.ReactNode; // The "Chatbot" (Assistant)
}

export function Shell({ children, chatbot }: ShellProps) {
  const { viewMode } = useAppStore();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background transition-all duration-500">
      {/* Left Pane: The Canvas */}
      <main
        className={cn(
          "transition-all duration-500 ease-in-out h-full",
          viewMode === 'BASIC' ? "w-0 opacity-0 overflow-hidden" : "w-[70%] opacity-100"
        )}
      >
        {children}
      </main>

      {/* Right Pane: The Chatbot */}
      <aside
        className={cn(
          "h-full border-l border-border bg-card transition-all duration-500 ease-in-out flex flex-col",
          viewMode === 'BASIC' ? "w-full" : "w-[30%]"
        )}
      >
        {chatbot}
      </aside>
    </div>
  );
}
