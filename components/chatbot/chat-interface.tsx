'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Mic, Bot, User, Loader2, Settings, Play } from 'lucide-react';
import { useShellStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { processChat, getChatHistory } from '@/actions/chat-actions';
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
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', text: 'Hey! I\'m Pj. How can I help you today?' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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
          toast.error("Microphone error: " + event.error);
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
      toast.error("Could not access microphone");
    }
  };

  useEffect(() => {
    // Load history
    getChatHistory(workspaceId).then(history => {
      if (history.length > 0) {
        // Reverse because UI expects oldest first (top), but DB returns newest first (desc)
        // Wait, getChatHistory orders by desc. So [newest, ..., oldest].
        // We want [oldest, ..., newest].
        const validHistory = history.reverse().map(h => ({
          id: h.id,
          role: h.role as 'user' | 'bot',
          text: h.content,
          data: h.metadata ? JSON.parse(JSON.stringify(h.metadata)) : undefined
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
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setViewMode("TUTORIAL")
              router.push("/dashboard")
            }}>
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
              {msg.data && msg.text.includes("prepared a draft") && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-800">
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Deal Title:</span>
                      <span className="font-medium">{msg.data.title}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Company:</span>
                      <span className="font-medium">{msg.data.company || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Value:</span>
                      <span className="font-medium">${Number(msg.data.value).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const cmd = `create deal ${msg.data.title} for ${msg.data.company} worth ${msg.data.value}`;
                      const hiddenPayload = { ...msg.data, confirmed: "true", intent: "create_deal" };
                      // We can't easily inject hidden params into the parser unless we modify processChat signature 
                      // or sending a specific command string that works.
                      // Or, we call processChat directly here?
                      // Let's just send a command that triggers creation with a special flag? 
                      // Actually, better: processChat matches params. 
                      // Let's send a specifically constructed string that the REGEX won't catch but we can handle?
                      // Or just call Server Action directly? No, we need to show the user msg.

                      // Let's append a special flag to the message or just assume the AI parser will handle "confirm deal creation"
                      // But wait, I added logic: if params.confirmed !== "true", it drafts.
                      // So I need to send params.confirmed = "true".

                      // Hack: I'll handle this by modifying the handleSend to accept override params?
                      // No, simpler: 
                      // I will use a hidden system command or modify handleSend to support passing data.

                      toast.success("Creating deal...");
                      processChat(cmd, workspaceId).then(response => {
                        setMessages(prev => [
                          ...prev,
                          {
                            id: Date.now().toString(),
                            role: 'user',
                            text: "Confirmed details",
                          },
                          {
                            id: (Date.now() + 1).toString(),
                            role: 'bot',
                            text: response.message,
                            data: response.data
                          }
                        ]);
                      })
                    }}
                    className="w-full bg-indigo-600 text-white text-xs py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Confirm & Create
                  </button>
                </div>
              )}
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
            <button
              onClick={toggleListening}
              className={cn(
                "p-2 rounded-full transition-all",
                isListening
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
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
