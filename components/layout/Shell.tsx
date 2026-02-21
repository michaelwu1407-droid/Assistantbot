"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { useShellStore } from "@/lib/store"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"
import { Sidebar } from "@/components/core/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { Switch } from "@/components/ui/switch"
import { Layers, MessageSquare, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ImperativePanelHandle } from "react-resizable-panels"
import { completeTutorial } from "@/actions/workspace-actions"

export function Shell({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const { viewMode, setViewMode } = useShellStore()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tutorialTriggered = useRef(false)
  const [mounted, setMounted] = useState(false)
  const chatbotPanelRef = useRef<ImperativePanelHandle>(null)
  const [chatbotExpanded, setChatbotExpanded] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const didDragRef = useRef(false)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine if we should show the simplified Basic (Chat) view
  // Only show Basic view if user is in BASIC mode AND on the main dashboard page
  const isDashboardRoot = pathname === "/dashboard"
  const isBasicView = mounted && viewMode === "BASIC" && isDashboardRoot

  // Verify tutorial trigger
  useEffect(() => {
    if (searchParams.get("tutorial") === "true" && !tutorialTriggered.current) {
      tutorialTriggered.current = true
      setViewMode("TUTORIAL")
      // Clear the ?tutorial=true from URL so it doesn't re-trigger
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, setViewMode, router, pathname])

  const handleTutorialComplete = async () => {
    const workspaceId = useShellStore.getState().workspaceId;
    if (workspaceId) {
      await completeTutorial(workspaceId);
    }
  };

  return (
    <div className="h-screen w-full bg-background relative flex flex-col overflow-hidden">
      {/* Tutorial Overlay always mounted, handles its own visibility */}
      <TutorialOverlay onComplete={handleTutorialComplete} />

      {isBasicView ? (
        <div className="flex-1 flex items-center justify-center p-0 md:p-6 relative min-h-0">
          {/* Background: subtle gradient + glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/80 via-white to-primary/5 dark:from-slate-950/80 dark:via-background dark:to-primary/10 pointer-events-none" />
          <div className="absolute inset-0 ott-glow opacity-30 pointer-events-none" />

          {/* Main Chat Container - seamless glassmorphism */}
          <div className="z-10 w-full max-w-4xl h-[100dvh] md:h-[95dvh] flex flex-col rounded-none md:rounded-3xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl shadow-2xl relative border border-white/20 dark:border-white/5">
            {/* Header inside card: title + mode toggle */}
            <header className="shrink-0 flex items-center justify-between gap-4 px-4 md:px-6 py-4 bg-transparent border-b border-border/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                  <span className="font-extrabold italic text-sm text-white tracking-tighter">Pj</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-foreground">Chat</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-border/50">
                <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-primary">Chat</span>
                <Switch
                  id="mode-toggle"
                  checked={false}
                  onCheckedChange={() => setViewMode("ADVANCED")}
                  className="data-[state=checked]:bg-primary scale-90"
                />
                <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Advanced</span>
              </div>
            </header>
            <div id="assistant-pane" className="flex-1 min-h-0 flex flex-col">
              {chatbot}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex h-full overflow-hidden">
          {/* Desktop Sidebar - Hidden on Mobile */}
          <Sidebar className="hidden md:flex shrink-0" />

          {/* Mobile Sidebar - Drawer */}
          <MobileSidebar />

          <ResizablePanelGroup id="dashboard-panel-group" direction="horizontal" className="flex-1 h-full">
            {/* Left Canvas - 75% for Desktop, handled by resizable panels */}
            <ResizablePanel defaultSize={75} minSize={30} id="main-canvas-panel">
              <div id="main-canvas" className="h-full w-full overflow-y-auto relative bg-background">
                {children}
              </div>
            </ResizablePanel>

            <ResizableHandle
              withHandle
              className="hidden md:flex bg-border/50 hover:bg-primary/50 transition-colors w-2 min-w-2 shrink-0"
              onPointerDown={(e) => {
                didDragRef.current = false
                pointerDownRef.current = { x: e.clientX, y: e.clientY }
              }}
              onPointerMove={(e) => {
                if (pointerDownRef.current && (Math.abs(e.clientX - pointerDownRef.current.x) > 5 || Math.abs(e.clientY - pointerDownRef.current.y) > 5)) {
                  didDragRef.current = true
                }
              }}
              onPointerUp={() => {
                if (!didDragRef.current && !chatbotExpanded) {
                  chatbotPanelRef.current?.expand()
                  setChatbotExpanded(true)
                }
                pointerDownRef.current = null
              }}
              onClick={() => {
                if (!didDragRef.current && !chatbotExpanded) {
                  chatbotPanelRef.current?.expand()
                  setChatbotExpanded(true)
                }
              }}
            />

            {/* Right Chatbot - Collapsed by default; when expanded, minimum width so messages aren't squeezed (user can expand further) */}
            <ResizablePanel
              ref={chatbotPanelRef}
              defaultSize={0}
              minSize={28}
              maxSize={50}
              collapsible={true}
              collapsedSize={0}
              onCollapse={() => setChatbotExpanded(false)}
              onExpand={() => setChatbotExpanded(true)}
              id="assistant-panel"
              className="hidden md:block transition-all duration-300 ease-in-out pl-0"
            >
              {/* Mode Toggle Button - Above Chatbot - integrated into header or separate */}
              <div className="flex items-center justify-center gap-3 px-4 py-3 bg-background border-b border-border/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Chat</span>
                </div>
                <Switch
                  id="mode-toggle"
                  checked={viewMode === "ADVANCED"}
                  onCheckedChange={(checked) => setViewMode(checked ? "ADVANCED" : "BASIC")}
                  className="data-[state=checked]:bg-primary"
                />
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Advanced</span>
                </div>
              </div>
              <div
                id="assistant-pane"
                className="h-[calc(100%-57px)] w-full min-w-[320px] border-l border-border/50 bg-background/50 backdrop-blur-sm"
                onClick={() => {
                  if (!chatbotExpanded) {
                    chatbotPanelRef.current?.expand()
                    setChatbotExpanded(true)
                  }
                }}
              >
                {chatbot}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Mobile: floating nav + chat buttons */}
          <div className="md:hidden fixed bottom-5 right-5 z-[10000] flex flex-col gap-2 items-end">
            {/* Chat FAB - opens a sheet on mobile */}
            {chatbot && (
              <button
                type="button"
                onClick={() => setMobileChatOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-lg hover:bg-slate-50 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                title="Open chat"
                aria-label="Open chat"
              >
                <MessageSquare className="h-5 w-5 text-primary" />
              </button>
            )}
          </div>

          {/* Desktop: chat FAB when panel is collapsed */}
          {chatbot && !chatbotExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                chatbotPanelRef.current?.expand()
                setChatbotExpanded(true)
              }}
              className="hidden md:flex fixed bottom-5 right-5 z-[10000] h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-lg hover:bg-slate-50 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              title="Open chat"
              aria-label="Open chat"
            >
              <MessageSquare className="h-5 w-5 text-primary" />
            </button>
          )}

          {/* Mobile: hamburger menu - fixed bottom-left for navigation on non-dashboard pages */}
          <button
            type="button"
            onClick={() => useShellStore.getState().setMobileMenuOpen(true)}
            className="md:hidden fixed bottom-5 left-5 z-[10000] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-lg hover:bg-slate-50 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Open navigation"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </button>

          {/* Mobile Chat Sheet */}
          <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
            <SheetContent side="bottom" className="h-[85dvh] p-0 flex flex-col">
              <SheetHeader className="shrink-0 flex flex-row items-center justify-between px-4 py-3 border-b border-border/50">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  AI Assistant
                </SheetTitle>
                <button
                  type="button"
                  onClick={() => setMobileChatOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetHeader>
              <div id="mobile-assistant-pane" className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {chatbot}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  )
}
