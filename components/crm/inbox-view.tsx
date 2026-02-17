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
    <div className="flex h-full">
      {/* Sidebar List */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search messages..."
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No messages found.
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <button
                key={thread.contactId}
                onClick={() => setSelectedContactId(thread.contactId)}
                className={cn(
                  "w-full text-left p-4 border-b border-slate-100 hover:bg-white transition-colors flex gap-3",
                  selectedContactId === thread.contactId
                    ? "bg-white border-l-4 border-l-blue-600 shadow-sm"
                    : "border-l-4 border-l-transparent"
                )}
              >
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {thread.contactAvatar ? (
                    <img src={thread.contactAvatar} alt={thread.contactName} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={cn(
                      "font-medium truncate",
                      selectedContactId === thread.contactId ? "text-blue-700" : "text-slate-900"
                    )}>
                      {thread.contactName}
                    </span>
                    {thread.lastMessage && (
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {new Date(thread.lastMessage.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {thread.lastMessage?.content ?? "No messages"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Pane */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedContactId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-slate-100 flex items-center px-6 justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                  {selectedThread?.contactName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{selectedThread?.contactName}</h2>
                  <p className="text-xs text-slate-500">{selectedThread?.contactCompany}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedThread?.contactPhone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => window.open(`tel:${selectedThread.contactPhone}`)}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </Button>
                )}
                <Link href={`/dashboard/contacts/${selectedContactId}`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Activity Feed (reused as chat history) */}
            <div className="flex-1 overflow-hidden p-4 bg-slate-50/30">
              <ActivityFeed
                contactId={selectedContactId}
                className="h-full border-none shadow-none bg-transparent"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
