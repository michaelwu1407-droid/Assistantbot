# 🚀 Pj Buddy Changelog

## Version 2.5.2 (March 1, 2026)

### AI Quality + Latency Optimization
- Chat API now uses adaptive preprocessing:
  - Structured job extraction only runs when intent signals indicate job creation details.
  - Historical pricing context is fetched only for pricing-related prompts.
  - Memory retrieval is skipped for low-value short turns and timeout-capped when used.
- Multi-job flow now persists and reuses `multiJobState` in tool output, so `"next"` no longer re-parses prior chat history in a loop.
- Adaptive tool-step budget added (`stepCountIs(getAdaptiveMaxSteps(...))`) to speed up short turns while preserving depth on complex requests.
- Added short-TTL caching in `buildAgentContext()` and `fetchMemoryContext()` to reduce repeat DB/memory work during active chat sessions.
- Removed per-response `router.refresh()` in chat UI to reduce post-response jank and improve perceived speed.
- Applied the same adaptive context/memory strategy to the headless AI agent (`lib/services/ai-agent.ts`) for parity with dashboard chat behavior.
- Added rolling latency telemetry with P50/P95-ready samples for `preprocessing`, `tool_calls`, `model`, and `total` across web chat and headless agent.
- Added internal telemetry endpoint `GET /api/internal/telemetry/latency` (and `DELETE` to reset) for runtime bottleneck inspection.

## Version 2.5.1 (February 28, 2026)

### Sidebar Button Inversion (correction)
- Inverted the **mobile hamburger button** (bottom-left FAB) and **chat window FAB** (bottom-right, both mobile and desktop) to `bg-primary text-white`. The sidebar nav items themselves remain unchanged (mint active state).
- Fixed mobile sidebar whitespace: added `expanded` prop to `<Sidebar>` that suppresses the fixed 45px inline width when rendered inside the 200px mobile sheet, letting icons fill the full container.

### Historical Pricing — Glossary Cross-Check
- When a RepairItem glossary entry has a price, it is now the **primary source of truth**.
- After computing historical invoice ranges, the context builder cross-checks: if the historical average falls outside the glossary range, a `⚠️ PRICING CONFLICTS DETECTED` warning is injected into the AI context, prompting Travis to ask the tradie to confirm before quoting.
- Accepted single price or range formats: `$150`, `$100–200`, `$100 to $200`, `150`, `between 100 and 200`.

### Webform Webhook & Lead Source Field
- New endpoint: `POST /api/webhooks/webform` — accepts contact form submissions (JSON, multipart, url-encoded) from the tradie's website, creates/finds a contact, opens a NEW lead in the CRM, logs an activity, and notifies the workspace owner.
- Optional `WEBFORM_WEBHOOK_SECRET` env var for shared-secret verification.
- Added `source` field to Deal model (e.g. "website", "hipages", "airtasker", "phone", "referral").
- Source badge displayed on deal cards in the CRM pipeline.

## Version 2.5 (February 28, 2026)

### On-Site Completion Workflow
- **Job Completion Modal**: Full rewrite with Invoice Verifier section (labour hours, materials via MaterialPicker, running total).
- **Customer Signature Capture**: Added SignaturePad component to completion modal for on-site signature collection.
- **Dual-Action Filing**: "Save for Later" (stage INVOICED) vs "Confirm & Generate" (stage WON + Xero DRAFT invoice).
- **Xero Draft Invoice**: `createXeroDraftInvoice()` always pushes as DRAFT for manager review. Non-blocking on Xero failure.
- **Trigger Points**: "Finish Job" button on Tradie Dashboard, "Mark Done" button on Map View job cards.

### Strict Triage & Bouncer Engine
- **Lead Qualification**: Phase A (Bouncer) hard No-Go rules decline leads matching exclusion criteria. Phase B (Advisor) flags concerns without declining.
- **Onboarding Step**: New "The Bouncer" step in onboarding wizard for exclusion criteria setup.
- **System Prompt Guardrail**: `bouncerStr` injected into AI context with strict qualification hierarchy.
- **Agent Flags**: `addAgentFlag` AI tool writes private triage warnings to deal cards (orange badges on dashboard).
- **Real-Time Instruction Capture**: AI asks "decline or flag?" when user gives new exclusion rules, saves as `[HARD_CONSTRAINT]` or `[FLAG_ONLY]`.
- **Mem0 Sync**: Exclusion criteria synced to Mem0 as `hard_constraint` metadata type.
- **Schema**: Added `exclusionCriteria` to Workspace, `agentFlags` to Deal.

### Performance Optimizations (#6)
- **Chat Context Pruning**: Sliding window limits conversation history to last 20 messages sent to LLM. System messages always pass through.
- **Bulk SMS N+1 Fix**: `sendBulkSMS()` now batch-fetches all contacts in one query instead of querying per-contact.
- **Geocoding Batch Writes**: `batchGeocodeDeals()` collects all geocode results and writes them in a single DB transaction.
- **Server-Side Map Filtering**: Map page now uses `getDeals()` with `excludeStages` and `requireScheduled` filters instead of fetching all deals and filtering client-side.
- **getDeals() Filters**: Added optional `filters` parameter supporting `excludeStages`, `requireScheduled`, and `limit`.

### Actionable Notifications (#4)
- **Action Types**: Notifications now support `actionType` (CONFIRM_JOB, CALL_CLIENT, SEND_INVOICE, APPROVE_COMPLETION) and `actionPayload` fields.
- **Action Buttons**: Notification dropdown shows colored action buttons (Confirm, Call, Invoice, Approve) when `actionType` is set.
- **Schema**: Added `actionType` (String?) and `actionPayload` (Json?) to Notification model.

### Preparation-Focused Morning Briefing (#2)
- **Job Readiness Checks**: `getTodaySummary` now returns preparation flags per job: missing address, no phone, unassigned, unconfirmed, deposit not paid, materials mentioned.
- **Preparation Alerts**: Global `preparationAlerts` array summarizes all issues across today's jobs.
- **AI Behavior**: System prompt instructs Travis to lead with preparation alerts before showing schedule.
- **Morning Notification**: Renamed to "Morning Briefing" with preparation-focused messaging and CONFIRM_JOB action type.

### Historical Price Averages (#1)
- **Invoice-Based Pricing**: `buildAgentContext()` now queries last 50 completed deals, groups by job title, and computes min/max/avg price ranges.
- **Context Injection**: Historical price ranges injected into AI context as "HISTORICAL PRICE RANGES (from past invoices)".
- **Guardrail**: AI told to say "Similar jobs have typically been between $X and $Y" — never quote as fixed prices.

### Sidebar UI Fixes (#5)
- **Active State Inversion**: Sidebar nav items and Settings button now use `bg-primary text-white` instead of `bg-mint-50 text-primary` for active state.
- **Mobile Whitespace**: Reduced mobile sidebar padding from `py-4` to `py-2`.
- **Double-X Fix**: Removed duplicate manual close button from mobile chat sheet (SheetContent already provides one via SheetPrimitive.Close).

### Email Webhook (#8)
- **Already Implemented**: Confirmed 3 active inbound email webhook endpoints (Resend, Gmail/Outlook push, generic parser), AI-powered lead capture, auto-reply generation, and delivery tracking. No additional work required.

## Version 2.4 (February 27, 2026)

### Chatbot Sticky Context (Goldfish Fix)
- Added `appendTicketNote(ticketId, noteContent)` in `actions/activity-actions.ts`.
- Updated support-ticket creation return payload to include `displayMessage`, `ticketId`, and `SYSTEM_CONTEXT_SIGNAL`.
- Registered `appendTicketNote` tool in `app/api/chat/route.ts`.
- Added system rule to follow `SYSTEM_CONTEXT_SIGNAL` on the immediate next turn.
- Added sticky next-turn logic in `/api/chat`: if user adds details right after ticket creation, details are appended to the same ticket.
- Added optional fallback note-append hook in `actions/chat-fallback.ts`.

### Settings and UX updates
- Automated calling/texting page now degrades gracefully on partial fetch failures.
- Removed duplicate pricing block from AI Assistant settings.
- Learning rules in AI Assistant are now add/remove list items instead of a blank freeform box.
- Notification settings now remove duplicated automated communication controls and include a test-notification action.
- Billing labels updated to `Earlymark Pro` and `Manage`.
- Privacy settings renamed from Pj Buddy to Earlymark AI, added `Data policy (DRAFT)`, and removed data export action.
- Integrations forwarding email format updated to `[firstname]@[businessname].earlymark.ai` with numeric suffix collision handling.
- Display/theme fixes: re-enabled true `System (auto)`, restored `Dark` selection, and improved dark theme tokens for readability.

## Version 2.3 (February 27, 2026)

### 📞 **Twilio Live Migration & Phone Provisioning**

#### 🔧 **Live Credentials Implementation**
- **Migration from Test to Live**: Successfully migrated from Twilio Test Credentials to Live Account credentials for production phone number provisioning.
- **Authentication Fix**: Resolved "Authenticate" error at number-search stage that was caused by Test Credentials lacking access to live phone number inventory.
- **Enhanced Error Handling**: Added specific error handling for Australian Regulatory Bundle requirements (Error 21631), permission denied (Error 20003), and insufficient funds (Error 21452).

#### 🛠 **Diagnostic Infrastructure**
- **API Routes**: Created `/api/test-env` and `/api/test-twilio` endpoints for real-time environment variable and Twilio connection testing.
- **Provisioning Tests**: Enhanced `/api/test-simple-provision` with detailed stage-by-stage logging and comprehensive error reporting.
- **Live Account Ready**: System now fully supports paid Twilio accounts with proper regulatory compliance handling.

#### 📋 **Code Audit & Cleanup**
- **Test Logic Removal**: Audited and confirmed no hardcoded test mode or mock data interfering with live operations.
- **Documentation Consolidation**: Merged Australian auth configuration into `COMMUNICATION_SYSTEM.md` and removed redundant documentation files.

### 🎯 **Email Automation System - LIVE**

#### 🤖 **Dynamic Agent Identities**
- **Live Email Sending**: Replaced stub email automation with live implementation using Dynamic Agent Identities.
- **Agent Email Format**: Emails now sent from `"BusinessName Assistant" <alias@agent.earlymark.ai>` with proper Reply-To routing.
- **BCC Visibility**: Business owners automatically BCC'd on all automation emails for oversight.
- **Template Integration**: Full email template system with variable substitution for contact names, deal titles, and amounts.

#### 📧 **Automation Pipeline**
- **No More Stubs**: Complete removal of console.log placeholders - all email automations now send real emails.
- **Error Handling**: Comprehensive error handling and activity logging for sent emails.
- **Verification Logging**: Detailed email metadata logging for debugging and compliance tracking.

### 📚 **Documentation Updates**
- **Communication System**: Added comprehensive Australian Auth & Twilio Configuration section.
- **File Cleanup**: Consolidated and removed redundant documentation files to reduce clutter.
- **Live Setup Guide**: Complete setup instructions for paid Twilio accounts and regulatory compliance.

---

## Version 2.2 (February 26, 2026)

### 🎯 Kanban & Team Experience

#### 📋 **Kanban Filter by Team Member**
- **Visible on all screens**: Filter dropdown in the dashboard header is always visible (including mobile), with a clear "Filter:" label.
- **Options**: All jobs, Unassigned, or filter by any team member so managers can focus on one person's workload.

#### 👤 **Owner Sync & Team List**
- **New workspaces**: When you sign up and a workspace is created, the app now creates your User record as **Owner** so you appear in the team list and in the kanban filter.
- **Existing workspaces**: On dashboard load, if you're the workspace owner but had no User row (e.g. created before this fix), one is created automatically so the filter and team page work correctly.

#### 🔗 **Invite Link & Role Clarity**
- **Role when inviting**: The invite dialog clearly shows "They'll join as" with **Team Member** or **Manager**. The chosen role is fixed when you generate or send the invite.
- **Copy and share**: After creating an invite, the copy explains that anyone opening the link will join as that role, with a prominent "Copy invite link" button and the link field.

#### 📌 **Role-Based Kanban Default**
- **Team members**: Default view is **My jobs** (only jobs assigned to them). They can switch to All jobs or another person if needed.
- **Managers/Owners**: Default remains **All jobs**.

#### 📢 **Onboarding Message**
- At the end of setup, users are told they're the **team manager** and can invite their team from the Team page so members see the jobs assigned to them.

### 📚 **Documentation**
- **project_status_log.md**: Entry for 2026-02-26.
- **APP_MANUAL.md**: Kanban filter and Team/Invite section updated.
- **docs/team_roles_and_approvals.md**: Kanban view by role and invite behaviour noted.

---

## Version 2.1 (February 24, 2026)

### 🆕 Major New Features

#### 📞 **Phone Management System**
- **Dual-Number Architecture**: Complete separation between personal phone numbers and AI agent business numbers
- **Personal Phone Management**: `/dashboard/settings/phone-settings` with SMS verification
- **AI Agent Number Security**: Read-only, support-managed for security
- **SMS Verification**: 6-digit codes, 10-minute expiry, first-time setup flow
- **Real-time Status**: Live status display for both phone numbers

#### 🛠️ **Comprehensive Support System**
- **AI Assistant Support**: 24/7 instant help with automatic ticket creation
- **Smart Categorization**: Phone, billing, features, bugs, accounts
- **Priority Detection**: Urgent, high, medium, low priority levels
- **Multi-Channel Support**: Email, phone, website, integrated tickets
- **Activity Logging**: All support requests logged to Activity Feed

#### 🌐 **Website Support Integration**
- **Professional Contact Section**: Glass-morphism design with all channels
- **Direct Links**: Email, phone, and chat integration
- **Business Hours**: Clear operating hours and response times
- **Mobile Responsive**: Optimized for all devices

#### 🤖 **Enhanced Chatbot Capabilities**
- **Support Tool**: `contactSupport` tool for automatic ticket creation
- **Context Awareness**: Understands user's workspace status
- **Immediate Diagnostics**: Provides instant help for common issues
- **Categorization Logic**: Smart routing to appropriate support channels

### 🔧 **Technical Improvements**

#### 🗄️ **Database Schema Updates**
- **User.phone Field**: Added personal phone number to User model
- **VerificationCode Model**: New model for SMS verification workflow
- **Enhanced Activity Logging**: Better error visibility and support tracking

#### 📱 **UI/UX Enhancements**
- **Settings Navigation**: Added Phone Settings and Support to sidebar
- **Status Indicators**: Real-time visual feedback for phone setup
- **Error Visibility**: Silent failures now logged to Activity Feed
- **Mobile Optimization**: Touch-friendly interfaces for phone management

#### 🔐 **Security & Reliability**
- **SMS Verification**: Secure phone number changes
- **Support-Only Changes**: AI agent number changes require approval
- **Error Logging**: Enhanced visibility into setup failures
- **Activity Tracking**: Complete audit trail for support requests

### 📚 **Documentation Updates**

#### 📖 **Documentation Refresh**
- **README.md**: Updated to v2.1 with new features
- **APP_MANUAL.md**: Comprehensive operational manual updates
- **DEPLOYMENT_CHECKLIST.md**: Added Twilio and support setup requirements
- **project_status_log.md**: Latest sprint documentation

#### 📝 **Tutorial Completion**
- **185-Step Tutorial**: Comprehensive coverage of all features
- **UI Highlighting**: ASCII diagrams for every step
- **Chatbot Examples**: Natural language alternatives
- **Manual Instructions**: Step-by-step guidance

---

## 🔄 Version 2.0 (February 22, 2026)

### 🚀 **Instant Lead Capture System**
- **OAuth Integration**: Gmail/Outlook one-click connection
- **Auto-Filter Creation**: Automatic email filters for major platforms
- **AI Parsing**: Gemini 2.0 Flash Lite lead extraction
- **Instant Response**: Under 60-second automatic response time
- **Platform Support**: Hipages, Airtasker, Oneflare, ServiceSeeking, ServiceTasker, Bark

### 🏗️ **Architecture Improvements**
- **Multi-Tenant Twilio**: Subaccount isolation for each workspace
- **Enhanced Error Handling**: Silent failure detection and logging
- **Database Schema Updates**: Optimized for phone management
- **API Enhancements**: Improved webhook handling and error reporting

### 📱 **Feature Enhancements**
- **Comprehensive Tutorial**: 185-step complete feature coverage
- **Enhanced Settings**: Improved settings navigation and organization
- **Better Error Messages**: User-friendly error communication
- **Mobile Optimization**: Improved responsive design

---

## 🐛 Bug Fixes

### 📞 **Phone Management**
- **Fixed Silent Failures**: `initializeTradieComms` now logs errors to Activity Feed
- **Verification Flow**: Fixed SMS verification edge cases
- **Status Display**: Accurate real-time phone number status
- **Database Sync**: Fixed User phone field synchronization

### 🛠️ **Support System**
- **Chatbot Integration**: Fixed support tool execution
- **Ticket Creation**: Improved support ticket formatting
- **Priority Detection**: Enhanced priority classification logic
- **Error Handling**: Better error recovery in support workflows

### 🔧 **Technical Issues**
- **Database Migrations**: Fixed VerificationCode model conflicts
- **API Endpoints**: Resolved support API authentication issues
- **UI Components**: Fixed responsive design issues
- **TypeScript Errors**: Resolved type definition conflicts

---

## 📈 Performance Improvements

### ⚡ **Speed Optimizations**
- **Database Queries**: Optimized phone number status queries
- **API Response Times**: Improved support ticket creation speed
- **UI Rendering**: Faster status indicator updates
- **Error Recovery**: Quicker error detection and reporting

### 📱 **User Experience**
- **Onboarding Flow**: Improved phone setup during registration
- **Error Messages**: Clear, actionable error communication
- **Status Feedback**: Real-time updates for all operations
- **Mobile Experience**: Touch-optimized interfaces

---

## 🔮 Breaking Changes

### 📞 **Phone Management**
- **New Required Environment Variables**: `TWILIO_MASTER_NUMBER`, `RETELL_API_KEY`, `RETELL_AGENT_ID`
- **Database Migrations**: Required for phone and verification models
- **Settings Navigation**: Added new settings pages to sidebar

### 🛠️ **Support System**
- **New API Endpoints**: `/api/support/contact` for ticket creation
- **Chatbot Tool**: New `contactSupport` tool for AI assistant
- **Activity Feed**: Enhanced to include support request types

---

## 🚀 Migration Guide

### 📞 **For Phone Management**
1. **Update Environment Variables**: Add Twilio and Retell AI keys
2. **Run Database Migrations**: `npx prisma db push`
3. **Test SMS Verification**: Verify master Twilio number works
4. **Update Documentation**: Review updated deployment checklist

### 🛠️ **For Support System**
1. **Update Environment Variables**: Ensure support email/phone configured
2. **Test Chatbot Support**: Verify AI assistant can create tickets
3. **Review Settings**: Check new support settings pages
4. **Update Documentation**: Review updated operational manual

---

## 📞 **Support Information**

### 🆘 **Getting Help**
- **AI Assistant**: Available 24/7 in-app
- **Email**: support@pjbuddy.com
- **Phone**: 1300 PJ BUDDY (Mon-Fri 9am-5pm AEST)
- **Website**: Contact section with all channels

### 📚 **Documentation**
- **README.md**: Complete feature overview
- **APP_MANUAL.md**: Comprehensive operational manual
- **DEPLOYMENT_CHECKLIST.md**: Production deployment guide
- **docs/COMPREHENSIVE_TUTORIAL.md**: 185-step tutorial

---

## 🎯 **What's Next**

### 📋 **Planned Features**
- **Advanced Analytics**: Enhanced reporting and insights
- **Team Collaboration**: Improved team member management
- **Mobile App**: Native iOS/Android applications
- **API Enhancements**: Extended API capabilities
- **Integrations**: More third-party service integrations

### 🔧 **Technical Roadmap**
- **Performance Optimization**: Continued speed and reliability improvements
- **Security Enhancements**: Ongoing security audits and improvements
- **Scalability**: Prepare for increased user base
- **Monitoring**: Enhanced error tracking and performance monitoring

---

**Last Updated**: February 24, 2026  
**Version**: 2.1  
**Status**: ✅ Production Ready
