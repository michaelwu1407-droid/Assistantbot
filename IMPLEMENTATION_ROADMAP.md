# Pj Buddy — Implementation Roadmap

> Granular, file-by-file instructions for an AI agent to execute.
> Each task lists the EXACT file path, what to change, and the replacement code.

---

## PHASE 1: Fix Database Connection (Prisma + Supabase)

### Problem
The Prisma schema is missing `directUrl` which is required for Supabase pgbouncer.
Without it, `prisma db push` and `prisma migrate` fail because pgbouncer does not
support prepared statements. Runtime queries through `DATABASE_URL` (port 6543) may
also intermittently fail without this configuration.

### Task 1.1 — Add `directUrl` to Prisma schema

**File:** `/home/user/Assistantbot/prisma/schema.prisma`

**Find this block (lines 8-11):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Replace with:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Why:** `DATABASE_URL` uses pgbouncer (port 6543) for connection pooling at runtime.
`DIRECT_URL` uses the direct connection (port 5432) for migrations and schema pushes.
Prisma requires both when using Supabase with pgbouncer.

### Task 1.2 — Verify .env.local has both URLs

**File:** `/home/user/Assistantbot/.env.local`

**Verify these two lines exist (they already do):**
```
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres"
```

**No changes needed** — both URLs already exist in `.env.local` with real credentials.
The issue was only that the schema was not referencing `DIRECT_URL`.

### Task 1.3 — Regenerate Prisma client and push schema

**Run these commands in order:**
```bash
cd /home/user/Assistantbot
npx prisma generate
npx prisma db push
```

**Expected result:** "Your database is now in sync with your Prisma schema."

If `db push` fails with a connection error, verify the Supabase project is active
at the Supabase dashboard. If it says "paused", resume it.

### Task 1.4 — Remove the `prisma/config.ts` file (unused)

**File:** `/home/user/Assistantbot/prisma/config.ts`

**Action:** DELETE this file. It is not imported anywhere in the codebase and serves
no purpose. The actual Prisma client is initialized in `lib/db.ts`.

---

## PHASE 2: Switch Authentication from Supabase Auth to Clerk

### Overview
Replace Supabase Auth with Clerk while KEEPING Supabase PostgreSQL (via Prisma).
Clerk handles sign-in/sign-up UI, session management, and user identity.
Prisma continues to handle all database operations.

### Task 2.1 — Install Clerk

**Run:**
```bash
cd /home/user/Assistantbot
npm install @clerk/nextjs
```

### Task 2.2 — Add Clerk environment variables

**File:** `/home/user/Assistantbot/.env.local`

**Add these lines at the top of the file (get values from https://dashboard.clerk.com):**
```
# ─── Clerk Auth ─────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="<your-clerk-publishable-key>"
CLERK_SECRET_KEY="<your-clerk-secret-key>"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/signup"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/setup"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/setup"
```

**Important:** The user must create a Clerk application at https://dashboard.clerk.com
and paste the real keys here. The values above are placeholders — replace with your real keys.

### Task 2.3 — Replace root layout with ClerkProvider

**File:** `/home/user/Assistantbot/app/layout.tsx`

**Replace the ENTIRE file with:**
```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { CommandPalette } from "@/components/core/command-palette";
import { OfflineBanner } from "@/components/core/offline-banner";
import { IndustryProvider } from "@/components/providers/industry-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { Toaster } from "@/components/ui/sonner";
import { ClientThemeProvider } from "@/components/providers/client-theme-provider";

export const metadata: Metadata = {
  title: "Pj Buddy — CRM for SMEs",
  description: "High-velocity CRM platform with Hub and Spoke architecture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased font-sans bg-background text-foreground">
          <ClientThemeProvider>
            <IndustryProvider>
              {children}
              <CommandPalette />
              <OfflineBanner />
              <ServiceWorkerProvider />
              <Toaster />
            </IndustryProvider>
          </ClientThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**What changed:** Added `import { ClerkProvider }` and wrapped `<html>` inside `<ClerkProvider>`.

### Task 2.4 — Replace middleware.ts with Clerk middleware

**File:** `/home/user/Assistantbot/middleware.ts`

**Replace the ENTIRE file with:**
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
  "/auth(.*)",
  "/api/webhooks(.*)",
  "/kiosk(.*)",
  "/offline",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**What changed:** Removed all Supabase imports. Clerk middleware protects all routes
except the ones listed in `isPublicRoute`. Unauthenticated users are automatically
redirected to the sign-in page.

### Task 2.5 — Replace lib/auth.ts with Clerk auth helpers

**File:** `/home/user/Assistantbot/lib/auth.ts`

**Replace the ENTIRE file with:**
```typescript
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Get the authenticated user's ID.
 * SINGLE SOURCE OF TRUTH for user identification across all server
 * components and server actions.
 */
export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (userId) return userId;
  return "demo-user";
}

/**
 * Get the authenticated user's metadata (name, email, etc)
 */
export async function getAuthUser(): Promise<{ id: string; name: string; email?: string }> {
  const user = await currentUser();
  if (user) {
    return {
      id: user.id,
      name: user.firstName || user.username || "Mate",
      email: user.emailAddresses[0]?.emailAddress,
    };
  }
  return { id: "demo-user", name: "Mate" };
}
```

**What changed:** Removed all Supabase imports. Now uses `auth()` and `currentUser()`
from `@clerk/nextjs/server`. The function signatures remain identical so all callers
(dashboard layout, server actions, etc.) continue working without changes.

### Task 2.6 — Replace auth-actions.ts with Clerk actions

**File:** `/home/user/Assistantbot/actions/auth-actions.ts`

**Replace the ENTIRE file with:**
```typescript
"use server";

import { auth } from "@clerk/nextjs/server";

// Sign-in and sign-up are handled by Clerk's built-in UI components.
// These functions are no longer needed but kept as stubs for any
// code that might still import them.

export async function login(_formData: FormData) {
  // Clerk handles this via <SignIn /> component
  return { error: "Use Clerk sign-in component" };
}

export async function signup(_formData: FormData) {
  // Clerk handles this via <SignUp /> component
  return { error: "Use Clerk sign-up component" };
}

export async function logout() {
  // Clerk handles sign-out client-side via clerk.signOut()
  // or via the <UserButton /> component
}

export async function loginWithGoogle() {
  // Clerk handles OAuth via its built-in social login configuration
  // Configure Google OAuth in the Clerk Dashboard under "Social connections"
}
```

### Task 2.7 — Replace login page with Clerk SignIn

**File:** `/home/user/Assistantbot/app/(auth)/login/page.tsx`

**Replace the ENTIRE file with:**
```tsx
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-slate-200",
          },
        }}
      />
    </div>
  );
}
```

**What changed:** Entire custom login form replaced with Clerk's `<SignIn />` component.
This gives you email/password, Google OAuth, MFA, and forgot-password — all built-in
with zero custom code. The `appearance` prop lets you style it to match your design.

### Task 2.8 — Replace signup page with Clerk SignUp

**File:** `/home/user/Assistantbot/app/(auth)/signup/page.tsx`

**Replace the ENTIRE file with:**
```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-slate-200",
          },
        }}
      />
    </div>
  );
}
```

### Task 2.9 — Replace forgot-password page

**File:** `/home/user/Assistantbot/app/(auth)/forgot-password/page.tsx`

**Replace the ENTIRE file with:**
```tsx
import { SignIn } from "@clerk/nextjs";

// Clerk's SignIn component includes built-in "Forgot password?" functionality.
// This route redirects to the sign-in page which handles password reset.
export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-slate-200",
          },
        }}
      />
    </div>
  );
}
```

### Task 2.10 — Delete Supabase auth files

**Delete these files (they are no longer needed):**

1. `/home/user/Assistantbot/lib/supabase/server.ts`
2. `/home/user/Assistantbot/lib/supabase/middleware.ts`

**Check first:** Grep the entire codebase for any imports from `@/lib/supabase/server`
or `@/lib/supabase/middleware`. If any other files import from these, update those
imports to use Clerk instead. The known importers are:
- `lib/auth.ts` — already replaced in Task 2.5
- `middleware.ts` — already replaced in Task 2.4
- `actions/auth-actions.ts` — already replaced in Task 2.6
- `app/(auth)/forgot-password/page.tsx` — already replaced in Task 2.9

If `lib/supabase/` directory has other files (like `client.ts`), check if they are
imported anywhere. If not, delete them too. If the directory is empty after deletions,
delete the directory.

### Task 2.11 — Remove Supabase auth packages

**Run:**
```bash
cd /home/user/Assistantbot
npm uninstall @supabase/ssr @supabase/supabase-js
```

**IMPORTANT:** Only do this if NO other part of the codebase uses the Supabase client
for non-auth purposes (storage, realtime, etc.). Search first:
```bash
grep -r "@supabase" --include="*.ts" --include="*.tsx" -l
```

If any files other than the ones already replaced still import Supabase packages,
do NOT uninstall yet — those files need to be migrated first or Supabase kept for
those specific features (like storage).

### Task 2.12 — Update sidebar logout button

**File:** `/home/user/Assistantbot/components/core/sidebar.tsx`

**Find** any import of `logout` from `@/actions/auth-actions` and replace with Clerk's
sign-out. Look for a logout button/handler in this file.

**If it imports `logout`:**
```tsx
// OLD
import { logout } from "@/actions/auth-actions"
// ...
onClick={() => logout()}

// NEW
import { useClerk } from "@clerk/nextjs"
// inside the component:
const { signOut } = useClerk()
// ...
onClick={() => signOut({ redirectUrl: "/login" })}
```

**If the sidebar doesn't import logout directly**, find wherever the logout action
is triggered in the UI and apply the same pattern.

---

## PHASE 3: Fix Chat Interface Responsiveness

### Problem
The chat UI uses hardcoded pixel/rem values that don't adapt to different screen
sizes. Key issues:
- `max-w-4xl` (56rem) is too wide for small screens, too narrow for ultra-wide
- `h-[92vh]` doesn't account for mobile browser chrome (address bar)
- `max-w-[85%]` for messages is fine on desktop but wastes space on mobile
- `pb-24` creates excessive bottom padding
- Input bar can get hidden behind mobile keyboards
- No responsive breakpoints for message widths

### Task 3.1 — Fix Shell.tsx basic mode container

**File:** `/home/user/Assistantbot/components/layout/Shell.tsx`

**Find (line 94):**
```tsx
<div className="z-10 w-full max-w-4xl h-full md:h-[92vh] shadow-2xl rounded-2xl overflow-hidden border border-border/50 bg-background/60 backdrop-blur-xl relative flex flex-col">
```

**Replace with:**
```tsx
<div className="z-10 w-full max-w-5xl h-[100dvh] md:h-[92dvh] shadow-2xl rounded-none md:rounded-2xl overflow-hidden border-0 md:border border-border/50 bg-background/60 backdrop-blur-xl relative flex flex-col">
```

**What changed:**
- `max-w-4xl` → `max-w-5xl` (wider container on large screens)
- `h-full md:h-[92vh]` → `h-[100dvh] md:h-[92dvh]` (dynamic viewport height accounts for mobile browser chrome)
- `rounded-2xl` → `rounded-none md:rounded-2xl` (no border radius on mobile — full bleed)
- `border` → `border-0 md:border` (no border on mobile)

### Task 3.2 — Fix Shell.tsx basic mode wrapper

**File:** `/home/user/Assistantbot/components/layout/Shell.tsx`

**Find (line 75):**
```tsx
<div className="flex-1 flex items-center justify-center p-4 md:p-6 relative">
```

**Replace with:**
```tsx
<div className="flex-1 flex items-center justify-center p-0 md:p-6 relative">
```

**What changed:** `p-4 md:p-6` → `p-0 md:p-6` — removes padding on mobile so the
chat fills the full screen.

### Task 3.3 — Fix assistant-pane.tsx responsive layout

**File:** `/home/user/Assistantbot/components/core/assistant-pane.tsx`

**Find (lines 343-348):**
```tsx
className={cn(
    "flex h-full flex-col bg-background transition-all duration-500 ease-in-out relative overflow-hidden",
    // In Basic view, we want a centered, floating card look if in premium mode
    viewMode === "BASIC" && "md:max-w-3xl md:mx-auto md:h-[85vh] md:rounded-2xl md:shadow-2xl md:border",
    // Glass effect for premium basic mode
    viewMode === "BASIC" && "supports-[backdrop-filter]:bg-background/80 backdrop-blur-xl"
)}
```

**Replace with:**
```tsx
className={cn(
    "flex h-full flex-col bg-background transition-all duration-500 ease-in-out relative overflow-hidden",
    // Glass effect for premium basic mode
    viewMode === "BASIC" && "supports-[backdrop-filter]:bg-background/80 backdrop-blur-xl"
)}
```

**What changed:** Removed the `md:max-w-3xl md:mx-auto md:h-[85vh] md:rounded-2xl
md:shadow-2xl md:border` line. The Shell already provides the container constraints.
Having both the Shell AND the assistant-pane apply max-width creates a double
constraint that makes the chat area too narrow.

### Task 3.4 — Fix assistant-pane.tsx message widths for responsive

**File:** `/home/user/Assistantbot/components/core/assistant-pane.tsx`

**Find (lines 439-443):**
```tsx
<div className={cn(
    "rounded-2xl px-4 py-3 max-w-[85%] text-sm shadow-sm",
    msg.role === "user"
        ? "bg-primary text-primary-foreground rounded-br-none"
        : "bg-card text-card-foreground border border-border/50 rounded-bl-none"
)}>
```

**Replace with:**
```tsx
<div className={cn(
    "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 max-w-[92%] sm:max-w-[85%] lg:max-w-[75%] text-sm shadow-sm",
    msg.role === "user"
        ? "bg-primary text-primary-foreground rounded-br-none"
        : "bg-card text-card-foreground border border-border/50 rounded-bl-none"
)}>
```

**What changed:**
- `px-4 py-3` → `px-3 py-2.5 sm:px-4 sm:py-3` (tighter padding on small screens)
- `max-w-[85%]` → `max-w-[92%] sm:max-w-[85%] lg:max-w-[75%]` (wider on mobile, narrower on desktop)

### Task 3.5 — Fix assistant-pane.tsx input area

**File:** `/home/user/Assistantbot/components/core/assistant-pane.tsx`

**Find (line 539):**
```tsx
<div className="p-4 border-t bg-background rounded-b-2xl z-10">
```

**Replace with:**
```tsx
<div className="p-3 sm:p-4 border-t bg-background rounded-b-2xl z-10 flex-shrink-0">
```

**What changed:**
- `p-4` → `p-3 sm:p-4` (less padding on mobile)
- Added `flex-shrink-0` to prevent the input bar from being squished

### Task 3.6 — Fix chat-interface.tsx message widths

**File:** `/home/user/Assistantbot/components/chatbot/chat-interface.tsx`

**Find (lines 334-338):**
```tsx
className={cn(
  "flex gap-4 group animate-in slide-in-from-bottom-2 duration-300",
  msg.role === 'user' ? "ml-auto flex-row-reverse max-w-[85%]" : "",
  msg.role !== 'user' && (msg.action === 'draft_job_natural' || msg.action === 'draft_deal') ? "max-w-[95%]" : msg.role !== 'user' ? "max-w-[85%]" : ""
)}
```

**Replace with:**
```tsx
className={cn(
  "flex gap-2 sm:gap-4 group animate-in slide-in-from-bottom-2 duration-300",
  msg.role === 'user' ? "ml-auto flex-row-reverse max-w-[95%] sm:max-w-[85%]" : "",
  msg.role !== 'user' && (msg.action === 'draft_job_natural' || msg.action === 'draft_deal') ? "max-w-full sm:max-w-[95%]" : msg.role !== 'user' ? "max-w-[95%] sm:max-w-[85%]" : ""
)}
```

**What changed:**
- `gap-4` → `gap-2 sm:gap-4` (tighter gaps on mobile)
- All `max-w-[85%]` → `max-w-[95%] sm:max-w-[85%]` (wider on mobile)
- Draft cards get `max-w-full sm:max-w-[95%]` (full width on mobile)

### Task 3.7 — Fix chat-interface.tsx messages area padding

**File:** `/home/user/Assistantbot/components/chatbot/chat-interface.tsx`

**Find (line 322):**
```tsx
<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 pb-24 space-y-6 scroll-smooth">
```

**Replace with:**
```tsx
<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 pb-4 space-y-4 sm:space-y-6 scroll-smooth">
```

**What changed:**
- `p-4 pb-24` → `p-3 sm:p-4 pb-4` (removed excessive bottom padding, responsive side padding)
- `space-y-6` → `space-y-4 sm:space-y-6` (tighter vertical spacing on mobile)

### Task 3.8 — Fix chat-interface.tsx input area

**File:** `/home/user/Assistantbot/components/chatbot/chat-interface.tsx`

**Find (lines 445-448):**
```tsx
<div className={cn(
    "flex-shrink-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 relative z-10",
    viewMode === 'BASIC' ? "pb-8" : "pb-4"
)}>
```

**Replace with:**
```tsx
<div className={cn(
    "flex-shrink-0 p-3 sm:p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 relative z-10",
    viewMode === 'BASIC' ? "pb-[env(safe-area-inset-bottom,0.5rem)]" : "pb-3 sm:pb-4"
)}>
```

**What changed:**
- `p-4` → `p-3 sm:p-4`
- `pb-8` → `pb-[env(safe-area-inset-bottom,0.5rem)]` (respects iPhone safe area)
- `pb-4` → `pb-3 sm:pb-4`

### Task 3.9 — Fix chat-interface.tsx input bar max-width

**File:** `/home/user/Assistantbot/components/chatbot/chat-interface.tsx`

**Find (line 449):**
```tsx
<div className="relative flex items-center max-w-4xl mx-auto w-full shadow-sm rounded-full bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white transition-all duration-200 border border-transparent focus-within:border-indigo-200">
```

**Replace with:**
```tsx
<div className="relative flex items-center max-w-full sm:max-w-2xl lg:max-w-4xl mx-auto w-full shadow-sm rounded-full bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white transition-all duration-200 border border-transparent focus-within:border-indigo-200">
```

**What changed:** `max-w-4xl` → `max-w-full sm:max-w-2xl lg:max-w-4xl` (full width
on mobile, constrained on larger screens).

### Task 3.10 — Fix chat-interface.tsx avatar size on mobile

**File:** `/home/user/Assistantbot/components/chatbot/chat-interface.tsx`

**Find (lines 340-343):**
```tsx
<div className={cn(
  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white",
  msg.role === 'user' ? "bg-slate-800" : "bg-indigo-600"
)}>
```

**Replace with:**
```tsx
<div className={cn(
  "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white",
  msg.role === 'user' ? "bg-slate-800" : "bg-indigo-600"
)}>
```

**What changed:** `w-8 h-8` → `w-6 h-6 sm:w-8 sm:h-8` (smaller avatars on mobile).

### Task 3.11 — Fix chat-interface.tsx avatar icons on mobile

**File:** `/home/user/Assistantbot/components/chatbot/chat-interface.tsx`

**Find (line 345):**
```tsx
<User className="w-4 h-4 text-white" />
```

**Replace with:**
```tsx
<User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
```

**Find (line 347):**
```tsx
<Sparkles className="w-4 h-4 text-white" />
```

**Replace with:**
```tsx
<Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
```

### Task 3.12 — Add viewport meta tag for mobile

**File:** `/home/user/Assistantbot/app/layout.tsx`

**Find:**
```tsx
<html lang="en" suppressHydrationWarning>
```

**Add a `<head>` section right after `<html>` opening tag if one doesn't exist,
or add this meta tag to the existing head. In Next.js App Router, the viewport is
configured via the metadata export. Add this to the file:**

**Find the metadata export:**
```tsx
export const metadata: Metadata = {
  title: "Pj Buddy — CRM for SMEs",
  description: "High-velocity CRM platform with Hub and Spoke architecture",
};
```

**Replace with:**
```tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Pj Buddy — CRM for SMEs",
  description: "High-velocity CRM platform with Hub and Spoke architecture",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};
```

**Note:** The `Viewport` import needs to be added to the existing `Metadata` import.
The `viewportFit: "cover"` ensures the app extends into the safe area on iPhones
with notches, which pairs with the `env(safe-area-inset-bottom)` CSS used in Task 3.8.

---

## PHASE 4: Swap to Vercel AI SDK Chat Components (Future)

> This phase is for AFTER Phases 1-3 are working. It replaces the hand-rolled chat
> UI with production-tested components from the Vercel AI SDK.

### Task 4.1 — Install Vercel AI SDK

```bash
npm install ai @ai-sdk/react
```

### Task 4.2 — Refactor chat-interface.tsx to use `useChat`

The Vercel AI SDK provides a `useChat` hook that manages:
- Message state (no more manual `useState<Message[]>`)
- Streaming responses
- Loading state
- Error handling
- Input state

**The refactor would replace:**
- Manual `messages` state → `useChat().messages`
- Manual `input` state → `useChat().input`
- Manual `isLoading` state → `useChat().isLoading`
- Manual `handleSend` → `useChat().handleSubmit`
- Manual scroll management → handled by the SDK

**This requires creating an API route:**

**New file:** `/home/user/Assistantbot/app/api/chat/route.ts`

This route would wrap the existing `processChat()` logic in a streaming API endpoint.
The `useChat` hook calls this endpoint automatically.

**Detailed implementation will be specified when this phase begins.**

### Task 4.3 — Install AI Elements for pre-built chat components

```bash
npx shadcn@latest add "https://elements.ai-sdk.dev/r/thread.json"
npx shadcn@latest add "https://elements.ai-sdk.dev/r/message.json"
npx shadcn@latest add "https://elements.ai-sdk.dev/r/composer.json"
```

These provide responsive, accessible chat components built on shadcn/ui.

---

## PHASE 5: Integrate Open Source CRM Components (Future)

### Recommended Source: Atomic CRM (MIT License)
**Repo:** https://github.com/marmelab/atomic-crm

### Components to extract:
1. **Deal Pipeline Kanban Board** — drag-and-drop deal stages
2. **Contact List with Filters** — search, sort, filter contacts
3. **Activity Timeline** — chronological activity feed per contact/deal
4. **Task Management** — task cards with due dates and completion

### Integration pattern:
- Clone the Atomic CRM repo locally
- Copy component files into `/components/crm/`
- Adapt imports to use your Prisma `db` client instead of Supabase direct
- Adapt styling to match your Tailwind/shadcn theme

---

## PHASE 6: Voice Agent for Inbound Calls (Future)

### Recommended Framework: LiveKit Agents
**Repo:** https://github.com/livekit/agents
**Starter:** https://github.com/livekit-examples/agent-starter-react

### Architecture:
```
[Inbound Call]
  → Twilio Phone Number (already configured in .env.local)
  → Twilio SIP Trunk → LiveKit Server
  → LiveKit Agent (Python or Node.js microservice)
  → Agent calls Pj Buddy API for CRM operations
  → Audio response streamed back to caller
```

### Components needed:
1. **LiveKit Agent Service** — separate microservice (Python recommended)
2. **Twilio SIP Trunk** — configure in Twilio console to forward to LiveKit
3. **CRM API endpoints** — expose key actions (create lead, schedule job, etc.)
4. **STT:** Deepgram (best real-time accuracy)
5. **TTS:** ElevenLabs or Cartesia (natural voices)
6. **LLM:** Claude or GPT-4o for conversation reasoning

### Alternative (simpler, faster to deploy): Dograh
**Repo:** https://github.com/dograh-hq/dograh
- Visual workflow builder (drag-and-drop call flows)
- Built-in Twilio integration
- Can be running in under 2 minutes
- Self-hostable via Docker

---

## EXECUTION ORDER

1. **Phase 1** (Database) — Do this FIRST. 15 minutes.
2. **Phase 2** (Clerk Auth) — Do this SECOND. 2-4 hours.
3. **Phase 3** (Responsiveness) — Do this THIRD. 1-2 hours.
4. **Phase 4** (Vercel AI SDK) — Do later. Half day.
5. **Phase 5** (Open Source CRM) — Do later. 1-2 days.
6. **Phase 6** (Voice Agent) — Do later. 1-2 weeks.

---

## VERIFICATION CHECKLIST

After each phase, verify:

### Phase 1 (Database):
- [ ] `npx prisma db push` succeeds without errors
- [ ] `npx prisma studio` opens and shows tables with data
- [ ] Chat messages persist to database when sent

### Phase 2 (Clerk Auth):
- [ ] `/login` shows Clerk sign-in component
- [ ] `/signup` shows Clerk sign-up component
- [ ] Signing in redirects to `/setup`
- [ ] Dashboard pages are protected (redirect to login if not signed in)
- [ ] `getAuthUserId()` returns the Clerk user ID
- [ ] Workspace creation works with Clerk user ID
- [ ] Logout works from sidebar

### Phase 3 (Responsiveness):
- [ ] Chat fills full screen on mobile (no white borders/padding)
- [ ] Messages use full width on mobile, constrained on desktop
- [ ] Input bar stays visible and doesn't hide behind keyboard
- [ ] Draft cards (job/deal) are readable on mobile
- [ ] No horizontal scrolling on any screen size
- [ ] Test at: 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1440px (desktop)
