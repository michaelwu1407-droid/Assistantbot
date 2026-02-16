'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Clock, Calendar, FileText, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatInterfaceProps {
  workspaceId?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { icon: Calendar, label: "Schedule a meeting", prompt: "Help me schedule a meeting with a client" },
  { icon: FileText, label: "Create a quote", prompt: "Help me create a quote for a new job" },
  { icon: Phone, label: "Follow up call", prompt: "Help me prepare for a follow-up call" },
  { icon: Sparkles, label: "General help", prompt: "What can you help me with?" },
];

export function ChatInterface({ workspaceId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Hello! I\'m your Pj Buddy assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: 'I\'m here to help! The chat functionality is being updated. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOnlyWelcomeMessage = messages.length === 1;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-slate-50/50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <Avatar className={cn(
              "w-10 h-10 shadow-md",
              message.role === "user" ? "bg-blue-600" : "bg-gradient-to-br from-slate-100 to-slate-200"
            )}>
              {message.role === "user" ? (
                <AvatarFallback className="bg-blue-600 text-white">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage src="/bot-avatar.png" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <Bot className="w-5 h-5" />
                  </AvatarFallback>
                </>
              )}
            </Avatar>

            {/* Message Content */}
            <div className="flex flex-col gap-1 max-w-[80%]">
              <div
                className={cn(
                  "rounded-2xl px-5 py-3 shadow-sm",
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                )}
              >
                <p className="text-[15px] leading-relaxed">{message.content}</p>
              </div>
              <span className={cn(
                "text-xs flex items-center gap-1",
                message.role === "user" ? "text-slate-400 justify-end" : "text-slate-400"
              )}>
                <Clock className="w-3 h-3" />
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Loading State */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl mx-auto animate-in fade-in">
            <Avatar className="w-10 h-10 shadow-md bg-gradient-to-br from-slate-100 to-slate-200">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Bot className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-5 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-slate-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions - Only show when empty */}
        {isOnlyWelcomeMessage && !isLoading && (
          <div className="max-w-3xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-sm text-slate-500 mb-3 text-center">Quick actions to get started:</p>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all">
                    <action.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="pr-12 py-6 text-[15px] rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="px-6 py-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-2">
          Pj Buddy AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}
