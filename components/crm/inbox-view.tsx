"use client";

import { useState } from "react";
import { InboxThread } from "@/actions/messaging-actions";
import { ActivityFeed } from "@/components/crm/activity-feed";
import { cn } from "@/lib/utils";
import { Search, User, Phone, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InboxViewProps {
  initialThreads: InboxThread[];
}

export function InboxView({ initialThreads }: InboxViewProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    initialThreads[0]?.contactId ?? null
  );
  const [search, setSearch] = useState("");

  const filteredThreads = initialThreads.filter((t) =>
    t.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedThread = initialThreads.find((t) => t.contactId === selectedContactId);

  return (
    <div className="flex h-full glass-card rounded-2xl overflow-hidden">
      {/* Sidebar List */}
      <div className="w-80 border-r border-border/40 flex flex-col bg-muted/10">
        <div className="p-4 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No messages found.
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <button
                key={thread.contactId}
                onClick={() => setSelectedContactId(thread.contactId)}
                className={cn(
                  "w-full text-left p-4 border-b border-border/10 transition-all flex gap-3 group relative overflow-hidden",
                  selectedContactId === thread.contactId
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "border-l-4 border-l-transparent hover:bg-white/5"
                )}
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-border/20">
                  {thread.contactAvatar ? (
                    <img src={thread.contactAvatar} alt={thread.contactName} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={cn(
                      "font-medium truncate transition-colors",
                      selectedContactId === thread.contactId ? "text-primary" : "text-foreground group-hover:text-primary"
                    )}>
                      {thread.contactName}
                    </span>
                    {thread.lastMessage && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {new Date(thread.lastMessage.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate opacity-80">
                    {thread.lastMessage?.content ?? "No messages"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Pane */}
      <div className="flex-1 flex flex-col bg-background/20 backdrop-blur-sm">
        {selectedContactId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border/40 flex items-center px-6 justify-between shrink-0 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  {selectedThread?.contactName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">{selectedThread?.contactName}</h2>
                  <p className="text-xs text-muted-foreground">{selectedThread?.contactCompany}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedThread?.contactPhone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                    onClick={() => window.open(`tel:${selectedThread.contactPhone}`)}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </Button>
                )}
                <Link href={`/dashboard/contacts/${selectedContactId}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 hover:bg-primary/5 hover:text-primary">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Activity Feed (reused as chat history) */}
            <div className="flex-1 overflow-hidden p-0">
              <ActivityFeed
                contactId={selectedContactId}
                className="h-full border-none shadow-none bg-transparent rounded-none"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Search className="w-6 h-6 opacity-50" />
            </div>
            <p className="text-sm font-medium">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
