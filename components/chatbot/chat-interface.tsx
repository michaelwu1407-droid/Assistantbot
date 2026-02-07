'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Bot, User } from 'lucide-react';
import { useShellStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
}

export function ChatInterface() {
  const { viewMode, setViewMode } = useShellStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', text: 'Hey! I\'m Pj. How can I help you today?' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Mock AI Logic for the Demo
    setTimeout(() => {
      let botResponse = "I'm not sure how to help with that yet.";

      if (input.toLowerCase().includes('start day') || input.toLowerCase().includes('start my day')) {
        botResponse = "Good morning! I've pulled up your route. You have 4 jobs today.";
        setViewMode('ADVANCED'); // Trigger the UI slide-in
      } else if (input.toLowerCase().includes('keys')) {
        botResponse = "Opening the key checkout scanner for you.";
      }

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'bot', text: botResponse }]);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center gap-2 bg-slate-50">
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-900">Pj Buddy</h3>
          <p className="text-xs text-slate-500">AI Co-pilot</p>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              msg.role === 'user' ? "bg-slate-200" : "bg-indigo-100"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4 text-indigo-600" />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-sm",
              msg.role === 'user'
                ? "bg-slate-900 text-white rounded-tr-none"
                : "bg-slate-100 text-slate-800 rounded-tl-none"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={viewMode === 'BASIC' ? "Type 'Start Day'..." : "Ask Pj..."}
            className="w-full bg-slate-100 border-0 rounded-full py-3 pl-4 pr-12 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
