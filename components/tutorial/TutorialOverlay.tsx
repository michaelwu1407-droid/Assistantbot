'use client';

import React from 'react';

interface TutorialOverlayProps {
  isActive: boolean;
  targetId?: string; // ID of the element to highlight
  message: string;
  onComplete: () => void;
}

export function TutorialOverlay({ isActive, targetId, message, onComplete }: TutorialOverlayProps) {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dimmed Background */}
      <div className="absolute inset-0 bg-black/70 pointer-events-auto" onClick={onComplete} />
      
      {/* Highlight Logic would go here using bounding box of targetId */}
      {/* For now, centering the message */}
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
        <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-2xl max-w-sm">
          <h3 className="font-bold text-xl mb-2">Welcome to Pj Buddy</h3>
          <p className="text-slate-600 mb-4">{message}</p>
          <button 
            onClick={onComplete}
            className="bg-slate-900 text-white px-6 py-2 rounded-full font-medium hover:bg-slate-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
