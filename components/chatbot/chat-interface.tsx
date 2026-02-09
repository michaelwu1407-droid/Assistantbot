'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Bot, User, Loader2, Settings, Play } from 'lucide-react';
import { useShellStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { processChat } from '@/actions/chat-actions';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  data?: any;
}

interface ChatInterfaceProps {
  workspaceId: string;
}

export function ChatInterface({ workspaceId }: ChatInterfaceProps) {
  const { viewMode, setViewMode } = useShellStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', text: 'Hey! I\'m Pj. How can I help you today?' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const tempId = Date.now().toString();

    // Optimistic UI update
    setMessages(prev => [...prev, { id: tempId, role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      // Call Server Action
      const response = await processChat(userText, workspaceId);

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          text: response.message,
          data: response.data
        }
      ]);

      // Handle Client-side Effects based on Intent
      if (response.action === 'start_day') {
        setViewMode('ADVANCED');
        toast.success("Switched to Map View");
      } else if (response.action === 'start_open_house') {
        // Logic to redirect to kiosk mode could go here
        toast.success("Kiosk Mode Ready");
      }

    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message");
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'bot', text: "Sorry, I'm having trouble connecting right now." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Pj Buddy</h3>
            <p className="text-xs text-slate-500">AI Co-pilot</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <Settings className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewMode("TUTORIAL")}>
              <Play className="mr-2 h-4 w-4" />
              Replay Tutorial
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              "p-3 rounded-2xl text-sm whitespace-pre-wrap",
              msg.role === 'user'
                ? "bg-slate-900 text-white rounded-tr-none"
                : "bg-slate-100 text-slate-800 rounded-tl-none"
            )}>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={viewMode === 'BASIC' ? "Type 'Start Day'..." : "Ask Pj..."}
            className="w-full bg-slate-100 border-0 rounded-full py-3 pl-4 pr-12 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 disabled:opacity-50"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:bg-slate-300"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
