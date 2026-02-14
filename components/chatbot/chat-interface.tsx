'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Mic, Bot, User, Loader2, Sparkles, Check, X } from 'lucide-react';
import { useShellStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { processChat, getChatHistory } from '@/actions/chat-actions';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  action?: string;
  data?: any;
  createdAt?: string; // ISO string
}

interface ChatInterfaceProps {
  workspaceId: string;
}

export function ChatInterface({ workspaceId }: ChatInterfaceProps) {
  const { viewMode, setViewMode } = useShellStore();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hey! I\'m Pj. How can I help you today?',
    }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = message.createdAt ? new Date(message.createdAt) : new Date();
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-AU';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        };
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          // Don't toast for "no-speech" as it's annoying
          if (event.error !== 'no-speech') {
             toast.error("Microphone error: " + event.error);
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error("Mic toggle error:", error);
      // Ignore already started errors
    }
  };

  useEffect(() => {
    // Load history
    getChatHistory(workspaceId).then(history => {
      if (history.length > 0) {
        const validHistory = history.reverse().map(h => ({
          id: h.id,
          role: h.role as 'user' | 'bot',
          text: h.content,
          data: h.metadata ? JSON.parse(JSON.stringify(h.metadata)) : undefined,
          createdAt: h.createdAt.toISOString()
        }));
        setMessages(validHistory);
      }
    });
  }, [workspaceId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    const tempId = Date.now().toString();

    // Optimistic UI update
    setMessages(prev => [...prev, {
        id: tempId,
        role: 'user',
        text: textToSend,
        createdAt: new Date().toISOString()
    }]);

    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      // Call Server Action
      const response = await processChat(textToSend, workspaceId);

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          text: response.message,
          action: response.action,
          data: response.data,
          createdAt: new Date().toISOString()
        }
      ]);

      // Handle Client-side Effects based on Intent
      if (response.action === 'start_day') {
        setTimeout(() => {
             setViewMode('ADVANCED');
             router.push("/dashboard/tradie/map");
             toast.success("Good morning! Loading your route...");
        }, 1500);
      } else if (response.action === 'start_open_house') {
        toast.success("Kiosk Mode Ready");
      }

    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message");
      setMessages(prev => [
        ...prev,
        {
            id: Date.now().toString(),
            role: 'bot',
            text: "Sorry, I'm having trouble connecting right now.",
            createdAt: new Date().toISOString()
        }
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

  const handleConfirmDeal = (dealData: any) => {
     // Construct a natural language command to confirm creation
     // We assume the backend handles this if we just say "Confirm create deal [title]" or similar.
     // For now, let's just trigger a toast simulation for the "Draft" flow requested in C-2
     // The prompt asked for "Generative UI: return structured Draft Deal card".
     // This UI below IS the draft card. Now we need to actually submit it.

     // We'll simulate the "Yes, create it" response
     handleSend(`Yes, please create the deal: ${dealData.title}`);
  };

  return (
    <div className={cn(
        "flex flex-col h-full bg-white relative",
        viewMode === 'BASIC' ? "bg-slate-50/50" : "bg-white"
    )}>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
            <div key={dateKey} className="space-y-6">
                <div className="flex items-center justify-center my-6">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest bg-slate-100/50 px-3 py-1 rounded-full border border-slate-100">
                        {getDateLabel(dateKey)}
                    </span>
                </div>

                {msgs.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-4 max-w-[85%] group animate-in slide-in-from-bottom-2 duration-300",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white",
                      msg.role === 'user' ? "bg-slate-800" : "bg-indigo-600"
                    )}>
                      {msg.role === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                      ) : (
                          <Sparkles className="w-4 h-4 text-white" />
                      )}
                    </div>

                    <div className="space-y-2">
                        <div className={cn(
                          "p-4 text-sm leading-relaxed shadow-sm",
                          msg.role === 'user'
                            ? "bg-slate-900 text-white rounded-2xl rounded-tr-none"
                            : "bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none"
                        )}>
                          <div className="whitespace-pre-wrap">{msg.text}</div>

                          {/* Generative UI: Draft Deal Card (C-2) */}
                          {msg.action === 'draft_deal' && msg.data && (
                            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
                                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Deal</span>
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Needs Confirmation</span>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div>
                                        <div className="text-xs text-slate-500 mb-0.5">Title</div>
                                        <div className="font-medium text-slate-900">{msg.data.title}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Value</div>
                                            <div className="font-medium text-emerald-600">${Number(msg.data.value).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Company</div>
                                            <div className="font-medium text-slate-900">{msg.data.company || "N/A"}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 bg-white border-t border-slate-200 flex gap-2">
                                    <button
                                        onClick={() => handleConfirmDeal(msg.data)}
                                        className="flex-1 bg-slate-900 text-white text-xs py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Create Deal
                                    </button>
                                    <button
                                        onClick={() => handleSend("Cancel that deal.")}
                                        className="px-3 bg-white border border-slate-200 text-slate-600 text-xs py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                          )}
                        </div>

                        {/* Time Stamp */}
                        <div className={cn(
                            "text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity px-1",
                            msg.role === 'user' ? "text-right" : "text-left"
                        )}>
                            {msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : 'Just now'}
                        </div>
                    </div>
                  </div>
                ))}
            </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 max-w-[85%] animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400 mr-2" />
              <span className="text-xs text-slate-400">Pj is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={cn(
          "p-4 bg-white/80 backdrop-blur-md border-t border-slate-200",
          viewMode === 'BASIC' ? "pb-8" : "pb-4"
      )}>
        <div className="relative flex items-center max-w-4xl mx-auto w-full shadow-sm rounded-full bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white transition-all duration-200 border border-transparent focus-within:border-indigo-200">
            <button
              onClick={toggleListening}
              className={cn(
                "p-3 rounded-full transition-all ml-1",
                isListening
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              )}
            >
              <Mic className={cn("w-5 h-5", isListening && "fill-current")} />
            </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={viewMode === 'BASIC' ? "Type 'Start Day' or 'Create Deal'..." : "Ask Pj..."}
            className="flex-1 bg-transparent border-0 py-3.5 px-2 focus:ring-0 text-slate-900 placeholder:text-slate-400 disabled:opacity-50 text-sm"
          />

            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={cn(
                  "p-2 mr-2 rounded-full transition-all duration-200",
                  input.trim()
                    ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transform hover:scale-105"
                    : "bg-slate-200 text-slate-400"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
        </div>

        {/* Helper Chips in Basic Mode */}
        {viewMode === 'BASIC' && messages.length <= 2 && (
            <div className="flex gap-2 justify-center mt-3 animate-in fade-in slide-in-from-bottom-2 delay-300">
                <button
                    onClick={() => handleSend("Start my day")}
                    className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                    Start my day
                </button>
                <button
                    onClick={() => handleSend("Draft a new deal")}
                    className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                    New Deal
                </button>
                <button
                    onClick={() => handleSend("Show me the map")}
                    className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                    Show Map
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
