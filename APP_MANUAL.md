# Pj Buddy — Comprehensive Operational Manual

**Version**: 2.2 (Feb 2026)
**Target Audience**: Developers, Product Managers, and Power Users.

---

## 1. System Overview

**Pj Buddy** is a "Hub and Spoke" CRM platform designed for SME service businesses. It combines a central CRM core (the "Hub") with specialized interfaces (the "Spokes") for specific roles.

### Architecture
- **The Hub**: Universal data access. Contacts, Deals, Calendar, Tasks.
- **Tradie Spoke**: Mobile-first, map-based interface for field technicians.
- **Agent Spoke**: Metrics-driven interface for Real Estate sales agents.
- **Kiosk Spoke**: Public-facing tablet mode for visitor registration.

---

## 2. Core Platform Features (The Hub)

Available to all users regardless of role.

### 2.1. AI Assistant & Chatbot
The heart of the application. Pj Buddy uses a "Chat First" design philosophy.
- **Natural Language Parsing**: Identify intent from unstructured text (e.g., "Job for John Smith tomorrow at 2pm 500$").
- **Gemini Integration**: Uses Google's Gemini 2.0 Flash Lite model for advanced reasoning and response generation.
- **Context Awareness**: The bot knows which page you are on and suggests relevant actions.
- **Magic Commands**:
    - `/draft`: Create a new job/deal from a prompt.
    - `/summarize`: Summarize the current view (e.g., a long email thread).
    - `/schedule`: Check availability.
- **Voice Input**: Dedicated microphone button for voice-to-text commands.
- **Support Integration**: Automatic support ticket creation and categorization for help requests.

### 2.2. Phone Management System ⭐ (UPDATED)
The platform uses a dedicated **Dual-Number Architecture** to separate personal user communications from automated business interactions:

#### 📱 Personal Phone Number (User Management)
- **Collection**: Entered by the user during initial signup/onboarding.
- **Purpose**: Internal app-to-user communication ONLY (e.g., account verification, multi-factor auth, urgent system alerts).
- **Location**: Managed via `/dashboard/settings/phone-settings`.
- **Change Logic**: Users can update their personal number at any time. This triggers a verification process where a 6-digit code is sent to the **new** number to ensure ownership before the change is finalized.
- **Verification**: Codes expire after 10 minutes.

#### 🤖 AI Agent Business Number (Customer-Facing)
- **Provisioning**: Automatically provisioned by the system via **Twilio Subaccounts** once onboarding is complete. Each workspace receives its own unique, dedicated phone number.
- **Purpose**: All outward-facing communication between the AI Agent (Travis/Voice Agent) and end customers. 
- **Ownership**: The user does NOT have this number on their physical phone. They interact with customers using this number exclusively through the Pj Buddy web/mobile app interface.
- **Management**: This number is **READ-ONLY** for the user. It is set during account creation and should not be changed by the user. 
- **Changes**: If a business number change is required, the user must contact support. This is a security measure to prevent unauthorized communication hijacking.
- **Features**: Supports SMS, WhatsApp (where configured), and SIP-based voice calls via Retell AI.
### 2.3. Support System ⭐ (NEW)
Multi-channel support with AI-powered assistance:

#### AI Assistant Support
- **24/7 Availability**: Instant help and ticket creation
- **Smart Categorization**: Phone, billing, features, bugs, accounts
- **Priority Detection**: Urgent, high, medium, low
- **Immediate Help**: Diagnostics and next steps
- **Activity Logging**: All requests logged to feed

#### Human Support Channels
- **Email**: support@pjbuddy.com (24-hour response)
- **Phone**: 1300 PJ BUDDY (Mon-Fri 9am-5pm AEST)
- **Tickets**: Integrated support system in settings
- **Website**: Contact section with all channels

### 2.4. Global Search (`Cmd+K`)
A unified search bar accessible from anywhere.
- **Fuzzy Search**: Finds contacts, deals, and jobs even with partial matches.
- **Deep Linking**: Navigates directly to the record (e.g., clicking a Deal result goes to `/dashboard/deals/[id]`).
- **Quick Actions**: Run commands directly from search (e.g., "New Contact").

### 2.5. Kanban Pipeline
Visual workflow management for Deals.
- **Drag-and-Drop**: Move deals between stages (New -> Contacted -> Negotiation -> Won).
- **Filter by team member**: Header filter (visible on all screens) lets you view **All jobs**, **Unassigned**, or any team member’s jobs. Team members default to **My jobs**; managers/owners default to **All jobs**.
- **Stale Deal warnings**: Visual indicators (Amber border) for deals untouched for 7+ days.
- **Rotting Deal warnings**: Red border for deals untouched for 14+ days.
- **Industry Logic**: Different columns for **Trades** (Quote Sent, Job Booked) vs **Real Estate** (Appraisal, Listed).

### 2.6. Team & Invites
- **Team page** (`/dashboard/team`): View members, roles (Owner, Manager, Team Member), and pending invites.
- **Invite by link**: Choose **They’ll join as** — **Team Member** or **Manager** — then send the invitation email or **Generate Invite Link**. Anyone opening the link joins with that role. Copy the link to share manually (e.g. message or email); link expires in 7 days.
- **Role and board view**: Signing up from the main site makes you the **team manager** (owner). Joining via an invite link makes you the role set by the inviter (Team Member or Manager). Team members see the kanban defaulted to **My jobs**; managers/owners see **All jobs**.

### 2.7. Activity Feed
A unified timeline of all interactions.
- **Aggregated Events**: Emails, Calls, SMS, Note changes, Status changes, Support requests.
- **Rich Media**: Displays snippets of emails and transcriptions of voice notes.
- **Error Visibility**: Failed phone setup and other issues clearly displayed.

---

## 3. Tradie Mode Features (`/dashboard/tradie`)

Designed for: Plumbers, Electricians, HVAC Techs.
**Key UX**: Mobile-first, Big buttons, Map-centric.

### 3.1. The Job Map
- **Leaflet Integration**: Interactive map showing all of today's jobs.
- **Contextual Pins**: Color-coded pins based on Job Status (Blue=Scheduled, Orange=Traveling, Green=Active).
- **Routing**: Button to launch Google Maps/Apple Maps navigation.

### 3.2. Job Workflow Engine
Enforces a strict status progression to ensure data quality:
1.  **Scheduled**: Job is booked.
2.  **Start Travel**: Triggers "On My Way" SMS to client. Updates status to `TRAVELING`.
3.  **Arrived**: Triggers check-in. Updates status to `ON_SITE`.
    - *Safety Gate*: Blocks work until **Safety Check** (Risk Assessment) is confirmed.
4.  **Complete**: Triggers invoicing and wrap-up.

### 3.3. Field Tools
- **Material Picker**: Searchable database of parts (pipes, cables, fittings). Adds line items to the job.
- **Quick Estimator**: "Good/Better/Best" quote generator. Create 3 tiers of options in seconds.
- **Voice Diary**: Dictate job notes instead of typing.
- **Camera integration**: Take before/after photos directly to the job record (stored in Supabase).

### 3.4. Invoicing & Billing
- **One-Tap Invoice**: Generate a PDF invoice from the materials and labor logged.
- **Payment Status**: Track Paid/Pending status.

---

## 4. Agent Mode Features (`/dashboard/agent`)

Designed for: Real Estate Agents.
**Key UX**: Speed, High-density data, Reporting.

*Note: Agent mode features are available but not actively developed. The primary focus is on Tradie mode.*

### 4.1. Speed-to-Lead Tracker
- **Visual Gauge**: Shows average response time to new enquiries.
- **Goal Setting**: Set targets (e.g., "< 5 mins") and track performance.

### 4.2. Basic Reporting
- **Pipeline Analytics**: Basic reporting on deal flow and conversion rates.
- **Performance Metrics**: Track key agent productivity indicators.

### 4.4. Matchmaker Feed
- **AI Matching**: Automatically suggests "Buyers" from your database who match a new "Listing".
- **Similarity Scoring**: Ranks matches by relevance (Budget, Location, Preferences).

---

## 5. Kiosk Mode (`/kiosk`)

Designed for: Open House Visitor Registration.
**Key UX**: Public-facing, Secure, fast.

- **QR Code Entry**: Visitors scan a QR code to register on their own phone.
- **Self-Service Form**: Simple name/email/phone capture.
- **Auto-Sync**: Registrations instantly appear as "Leads" in the Agent's CRM.

---

## 6. Backend & Integrations

### 6.1. Authentication
- **Supabase Auth**: Secure Identity Management with Row Level Security.
- **Profile Persistence**: User settings sync to Database (PostgreSQL).

### 6.2. Calendar Sync
- **Two-way Sync**: Google Calendar and Outlook capability.
- **Conflict Detection**: Prevents double-booking tradies.

### 6.3. Offline Support
- **Service Worker**: Caches key assets for low-signal areas (basements, remote sites).
- **Optimistic UI**: Interface updates immediately, syncs when connection is restored.

### 6.4. Storage
- **Supabase Storage**: Secure hosting for job photos, invoices, and documents.

---

## 7. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+K` | Open Command Palette (Search) |
| `/` | Focus Chat Input |
| `Esc` | Close Modals/Panels |

---

---

## 8. Tradie Use Cases (Granular UI Walkthroughs)

This section maps the **exact user journey** (clicks, screens, inputs) for 17 core scenarios to identify feature gaps.

### Use Case 1: The "Missed Call" Rescue (Inbound Lead)
**Scenario**: Tradie is driving. Misses a call from a new number.
**User Journey**:
1.  **Notification**: Tradie's phone buzzes. Push Notification: "Missed Call (0412 345 678). AI Agent is handling it."
2.  **Interaction**: Agent auto-sends SMS. Client replies "Need a quote for overflowing toilet."
3.  **Review**: Tradie taps the Notification.
    *   **Navigates to**: `/dashboard/inbox` (Thread view).
    *   **Screen**: Shows SMS transcript. AI Summary at top: "Emergency Plumbing. High Value."
4.  **Action**: Tradie taps **"Call Lead"** button in sticky header.
5.  **Gap Analysis**:
    *   [ ] Mobile-responsive Inbox view (Chat interface).
    *   [ ] "Call" button that integrates with system dialer but logs the activity.

### Use Case 2: The "Rainy Day" Blast (Outbound Marketing)
**Scenario**: Raining heavily. 3 external jobs cancelled. Tradie needs work for the afternoon.
**User Journey**:
1.  **Start**: Tradie navigates to `/dashboard/hub`.
2.  **Input**: Clicks **Chat Assistant** (Floating Action Button).
3.  **Command**: Types: "It's raining. Find me indoor work for this afternoon."
4.  **AI Response**: "I found 12 past clients in your area due for a heater service. Shall I text them?"
5.  **Review**: Tradie clicks **"Preview List"**.
    *   **Navigates to**: `/dashboard/contacts?filter=suggested_campaign`.
    *   **Screen**: List of 12 names with "Last Service Date".
6.  **Broadcast**: Tradie clicks **"Send Campaign"** button.
    *   **Modal**: "Template: Hi [Name], rainy day special..."
    *   **Action**: Taps **"Confirm & Send"**.
7.  **Gap Analysis**:
    *   [ ] Chat command support for marketing queries.
    *   [ ] Suggested Campaign Filters.

### Use Case 3: The "Tire Kicker" Filter (Web Enquiry)
**Scenario**: Email notification: "New Web Enquiry from [Name]".
**User Journey**:
1.  **Start**: Tradie clicks email link.
    *   **Navigates to**: `/dashboard/deals/[deal_id]`.
2.  **Screen**: Deal details page. Status: **New Lead**.
3.  **Observation**: "Timeline" section shows AI Auto-reply sent 5 mins ago: "Please send a photo of the issue."
4.  **Update**: Notification badge appears on **"Photos"** tab.
5.  **Review**: Tradie clicks **"Photos"** tab. Sees uploaded image of a switchboard.
6.  **Action**: Tradie recognizes it's an expensive "Asbestos Board".
7.  **Interaction**: Tradie clicks **"Quick Reply"**. Selects template **"Asbestos Warning"**.
    *   **Text**: "Hi, I see asbestos. Cost starts at $500. Proceed?"
    *   **Action**: Taps **"Send"**.
8.  **Gap Analysis**:
    *   [ ] Quote/Deal "Photos" gallery tab.
    *   [ ] Quick Reply templates dropdown.

### Use Case 4: The "Pre-Arrival" Friction Reducer
**Scenario**: Heading to next job. Wants client ready.
**User Journey**:
1.  **Start**: Tradie navigates to `/dashboard/tradie` (Map View).
2.  **Selection**: Taps the next pin (Status: **Scheduled**).
    *   **Drawer Opens**: Job Details.
3.  **Action**: Taps big green **"Start Travel"** button.
4.  **System**: App background-sends SMS to client: "I'm on my way. ETA 15 mins."
5.  **Feedback**: Button changes to **"Arrived"** (Orange state). Map switches to Navigation mode.
6.  **Gap Analysis**:
    *   [ ] "Start Travel" state transition.
    *   [ ] Background SMS trigger on status change.

### Use Case 5: The "No-Show" Prevention (Automated Confirmation)
**Scenario**: Checking tomorrow's schedule.
**User Journey**:
1.  **Start**: Tradie navigates to `/dashboard/calendar`.
2.  **Observation**: Looking at tomorrow's slots.
    *   **UI**: 8am Job has a **Green Checkmark** icon.
    *   **UI**: 10am Job has a **Grey Question Mark** icon.
3.  **Investigation**: Tradie taps 10am Job.
    *   **Popover**: "Confirmation SMS sent 2 hours ago. No reply."
4.  **Action**: Tradie taps **"Resend Nudge"**.
5.  **Gap Analysis**:
    *   [ ] Visual indicators for "Confirmed" vs "Unconfirmed".
    *   [ ] Manual trigger for confirmation workflow.

### Use Case 6: The "Context King" (Caller ID)
**Scenario**: Receiving a call from a known client.
**User Journey**:
1.  **Trigger**: Phone rings.
2.  **App Overlay**: (If native integration unavailable, Tradie opens App while talking).
3.  **Search**: Taps Global Search. Types phone number (or name).
4.  **Result**: Taps **"John Doe"**.
    *   **Navigates to**: `/dashboard/contacts/[id]`.
5.  **Screen**: "Profile Summary".
    *   **Metric Cards**: "LTV: $5,200". "Tags: VIP".
    *   **Active Job**: "Kitchen Reno (Quote Sent)."
6.  **Gap Analysis**:
    *   [ ] "Fast Look-up" optimized profile header.

### Use Case 7: The "Ghosted Quote" Resurrection
**Scenario**: Reviewing the pipeline on a Friday afternoon.
**User Journey**:
1.  **Start**: Tradie navigates to `/dashboard/hub` (Kanban Board).
2.  **Filter**: Taps "Stale Estimates" toggle.
3.  **UI**: "Bathroom Reno" card is glowing red (Age: 14 days).
4.  **Action**: Drag-and-drops card from **"Sent"** to **"Follow Up"** column.
5.  **System**: Modal opens: "Trigger Follow-up Sequence?"
    *   **Options**: [Email] [SMS] [Call Task].
    *   **Selection**: Taps **"SMS (Casual)"**.
6.  **Gap Analysis**:
    *   [ ] Kanban column change hooks.
    *   [ ] "Stale" visual states on Kanban cards.

### Use Case 8: Post-Job Reputation Building
**Scenario**: Just finished a job. Client is happy.
**User Journey**:
1.  **Start**: Tradie at `/dashboard/jobs/[id]`. Status: **In Progress**.
2.  **Action**: Taps **"Complete Job"**.
3.  **System**: Status updates to **Completed**.
4.  **Prompt**: Toast notification appears: "Job Done. Send Review Request?"
5.  **Action**: Tradie taps **"Yes"**.
6.  **Feedback**: Toast updates: "SMS with Google Review link sent."
7.  **Gap Analysis**:
    *   [ ] "Post-Completion" hook/trigger in UI.

### Use Case 9: The "Annual Retention" Loop
**Scenario**: Automated check for recurring revenue.
**User Journey**:
1.  **Start**: Tradie navigates to `/dashboard/crm`.
2.  **Action**: Filters by "Service Due This Month".
3.  **Screen**: Table shows 5 clients.
4.  **Action**: Selects All -> **"Send Reminders"**.
5.  **System**: Sends SMS template: "Hi [Name], annual service due..."
6.  **Gap Analysis**:
    *   [ ] Date-based filtering on Client list.

### Use Case 10: The "Digital Handover" (Post-Job Education)
**Scenario**: Finishing a complex install (e.g., Smart Thermostat).
**User Journey**:
1.  **Start**: Job marked **Complete**.
2.  **Action**: Tradie scrolls to **"Handover"** section on Job screen.
3.  **Input**: Taps **"Add Resource"**.
    *   **Selection**: Chooses "Daikin Controller Video" from library.
4.  **Action**: Taps **"Send Handover Pack"**.
5.  **System**: Client receives Email with link to branded portal page containing the video and PDF manual.
6.  **Gap Analysis**:
    *   [ ] "Resource Library" (uploading videos/PDFs).
    *   [ ] "Handover" field in Job schema.

### Use Case 11: The "After-Hours" Gatekeeper
**Scenario**: 8:30 PM. Phone rings. Tradie ignores it.
**User Journey**:
1.  **Start**: Dashboard > Settings > **"AI Voice Agent"**.
2.  **Config**: Tradie toggles **"After Hours Mode"** to ON (or sets schedule 5pm-8am).
3.  **Trigger**: Call comes in at 8:30pm.
4.  **System**: AI Answers. Logs call as "Voicemail/Transcript".
5.  **Notification**: Silent notification: "Message from [Name]: Not urgent."
6.  **Gap Analysis**:
    *   [ ] Voice Agent Schedule settings.

### Use Case 12: The "Bad Review" Firewall
**Scenario**: Job Complete. Checking feedback.
**User Journey**:
1.  **Start**: `/dashboard/hub`.
2.  **Notification**: "New Feedback Received (Job #123)".
3.  **Action**: Click notification.
    *   **Screen**: Feedback Details. Score: 6/10.
    *   **Content**: "Mud on carpet."
4.  **Action**: Tradie taps **"Resolve"**.
    *   **Input**: Types reply: "So sorry! I'll pay for steam cleaning."
5.  **Gap Analysis**:
    *   [ ] Feedback collection form & management UI.

### Use Case 13: The "Multi-Property" Nexus
**Scenario**: Incoming call from existing landlord.
**User Journey**:
1.  **Search**: Tradie looks up "Jane Smith" in `/dashboard/contacts`.
2.  **Screen**: Contact Detail.
3.  **UI**: "Properties" tab shows list of 5 addresses.
4.  **Action**: Taps "42 Wallaby Way".
    *   **Screen**: Property history (Previous jobs at THIS address).
5.  **Gap Analysis**:
    *   [ ] Multi-property data model support in UI.

### Use Case 14: The "Uber-Style" Arrival
**Scenario**: Client tracking Tradie.
**User Journey**:
1.  **Start**: Tradie taps **"Start Travel"** (see Use Case 4).
2.  **Client Side**: Client clicks SMS link.
3.  **Web View**: Opens `pjbuddy.com/track/[token]`.
    *   **UI**: Map with Tradie's icon moving. "ETA: 8 mins".
4.  **Gap Analysis**:
    *   [ ] Public-facing "Live Track" web experience.

### Use Case 15: The "Win-Back" Warm Up
**Scenario**: Marketing blast to old clients.
**User Journey**:
1.  **Start**: `/dashboard/contacts`.
2.  **Filter**: "Last Job Date" < "24 months ago".
3.  **Result**: 50 contacts found.
4.  **Action**: Bulk Select -> **Message**.
5.  **Template**: "We miss you...".
6.  **Gap Analysis**:
    *   [ ] Advanced Date Query builder.

### Use Case 16: The "Waitlist" Warrior
**Scenario**: A client cancels a Monday booking. Slot is empty.
**User Journey**:
1.  **Trigger**: Tradie cancels job on Calendar. Slot turns "Empty".
2.  **Alert**: "Waitlist Alert" badge appears on the empty slot.
3.  **Interaction**: Tradie taps the slot.
    *   **Popover**: "3 Clients are waiting for a slot: [Mrs. Jones], [Mr. Smith]."
4.  **Action**: Tradie taps **"Offer to Mrs. Jones"**.
5.  **System**: Sends SMS.
6.  **Result**: 5 mins later, Notification: "Mrs. Jones accepted." Calendar slot fills with new job.
7.  **Gap Analysis**:
    *   [ ] "Waitlist" property on Contacts or Deals.
    *   [ ] Logic to match Waitlist preferences to Calendar gaps.

### Use Case 17: The "Warranty" Watchdog
**Scenario**: Admin work (checking retention).
**User Journey**:
1.  **Start**: Tradie navigates to `/dashboard/crm`.
2.  **View**: Clicks **"Expiring Warranties"** tab (or Filter).
3.  **Screen**: List of 5 jobs where `Install_Date + 5 Years` is next month.
4.  **Action**: Taps **"Select All"**.
5.  **Action**: Taps **"Send Reminder"**.
6.  **Outcome**: 5 clients receive SMS: "Your HWS warranty is about to expire..."
7.  **Gap Analysis**:
    *   [ ] Advanced Date filtering on Jobs ("Expiring soon").
    *   [ ] Bulk Action toolbar in Grid views.

---

**Exploration Complete**

### Use Case 2: The "Rainy Day" Reactivation (Outbound Sales)
**Scenario**: It's Tuesday morning, ringing wet. 3 outdoor jobs cancelled. Schedule is empty. Tradie needs work NOW.
**Ideal Workflow**:
1.  **Trigger**: Tradie types command `/fill-my-day` into Pj Buddy.
2.  **Audience Selection**: AI scans CRM for "Stale Leads" (quoted >30 days ago) or "Service Due" (clients seen 11 months ago).
3.  **Campaign**: Agent proposes: "I found 20 clients due for a service. Shall I text them offering a 'Rainy Day Special' for this afternoon?"
4.  **Execution**: Tradie taps "Send". 20 SMS go out.
5.  **Booking**: 3 clients reply "Yes". AI books them into the empty slots and updates the calendar.

### Use Case 3: The "Tire Kicker" Filter (Lead Qualification)
**Scenario**: Client fills out generic "Contact Us" form on website. Usually 50% are price shoppers or out of service area.
**Ideal Workflow**:
1.  **Trigger**: Web Enquiry arrives in CRM.
2.  **Agent Action**: AI immediately emails back: "Thanks for the enquiry. To give you an accurate ballpark, could you send a photo of the current switchboard?"
3.  **Photo Analysis**: Computer Vision analyzes the photo reply. Detects "Asbestos Panel" (Risk/High Cost).
4.  **Flagging**: AI tags lead "Hazards Present" and sets status to **Needs Review**.
5.  **Response**: Agent drafts reply for Tradie: "I typically charge $X for these due to safety requirements. Do you want to proceed with a site visit?" (Filters out cheap leads).

### Use Case 4: The "Pre-Arrival" Friction Reducer (Customer Experience)
**Scenario**: Tradie arrives at a job, but the client isn't home or the driveway is blocked, wasting 15 mins.
**Ideal Workflow**:
1.  **Trigger**: Calendar status changes to "Next Job Approaching" (1 hour before).
2.  **Agent Action**: Automated SMS to client: "Hi [Name], [Tradie] will be there in ~1 hour. Please ensure the driveway is clear and someone is home to let him in."
3.  **Confirmation**: Client replies "Gate code is 1234".
4.  **Knowledge Update**: Agent adds "Gate Code: 1234" to the **Job Notes** so importance context is ready when Tradie arrives.

### Use Case 5: The "No-Show" Prevention (Automated Confirmation)
**Scenario**: Job booked for Monday morning. Client forgets and goes to work. Tradie turns up to a locked house.
**Ideal Workflow**:
1.  **Trigger**: 24 hours before "Scheduled" start time.
2.  **Agent Action**: AI sends SMS: "Quick check - are we still good for 8am tomorrow?"
3.  **Result A (Confirmed)**: Client replies "Yes". Status -> **Confirmed**.
4.  **Result B (Reschedule)**: Client replies "Oh sorry, forgot! Can we do Tuesday?".
5.  **Resolution**: AI offers Tuesday slots. Re-books. Tradie's Monday slot opens up for a new emergency job (see Use Case 2).

### Use Case 6: The "Context King" (Relationship Intelligence)
**Scenario**: Phone rings. It's "John Doe". Tradie answers but forgets who John is or what he did for him last year.
**Ideal Workflow**:
1.  **Trigger**: Incoming Call (Caller ID match in CRM).
2.  **Flash Briefing**: Pj Buddy app flashes "John Doe - VIP Client. Last job: Installed Rheem HWS (Nov 2024). Active Quote: Kitchen Reno ($5k)."
3.  **Interaction**: Tradie answers: "Hi John, how's that hot water system going? Ready to move on the kitchen?"
4.  **Impact**: Client feels valued and remembered. Trust skyrockets.

### Use Case 7: The "Ghosted Quote" Resurrection (Pipeline Nurture)
**Scenario**: Sent a quote for a $5k bathroom reno 2 weeks ago. Client went silent. Tradie assumes they lost it.
**Ideal Workflow**:
1.  **Trigger**: Quote Status = "Sent", Agent checks "Last Activity" > 7 days.
2.  **Agent Action**: AI moves deal to "Follow Up" column in Kanban.
3.  **Nurture**: AI sends email (personal tone): "Hi [Name], just checking if you had any questions about the bathroom quote? I'm finalizing my schedule for next month and wanted to hold a spot for you."
4.  **Reply**: Client responds. Interaction logged in **Activity Feed**. Deal moves to "Negotiation".

### Use Case 8: Post-Job Reputation Building (Review Chasing)
**Scenario**: Job went perfectly. Tradie leaves. Client is happy. Tradie forgets to ask for Google Review.
**Ideal Workflow**:
1.  **Trigger**: Job Status marked **Complete**.
2.  **Delay**: 2 hours later (optimal time).
3.  **Agent Action**: SMS sent: "Hi [Name], glad we could sort that leak. If you have 2 seconds, a 5-star review really helps my business grow. [Link]"
4.  **Monitoring**: Client clicks link. CRM logs "Review Requested".

### Use Case 9: The "Annual Retention" Loop (Recurring Revenue)
**Scenario**: 11 months after a system install. Client has forgotten about maintenance.
**Ideal Workflow**:
1.  **Trigger**: 11 months since "Job Type: Installation".
2.  **Agent Action**: AI flags "Maintenance Due".
3.  **Outbound**: SMS sent: "Hi [Name], it's been a year since we installed your AC. Manufacturers require an annual service to keep the warranty valid. Shall I book you in for a check-up?"
4.  **Result**: Easy repeat sale with zero ad spend. Customer feels looked after.

### Use Case 10: The "Digital Handover" (Post-Job Education)
**Scenario**: Tradie installs a new digital thermostat. Client nods during demo but will definitely forget by Winter.
**Ideal Workflow**:
1.  **Trigger**: Job Complete (Tag: Install).
2.  **Agent Action**: AI emails "Your Handover Pack". Includes: PDF User Manual (auto-fetched), and a link to a 60-second video of the Tradie explaining the buttons (filmed in-app).
3.  **Result**: 50% reduction in "How do I work this?" callbacks. Client impressed by high-tech service.

### Use Case 11: The "After-Hours" Gatekeeper (Work-Life Balance)
**Scenario**: 8:30 PM on a Tuesday. Phone rings. Tradie is with family.
**Ideal Workflow**:
1.  **Trigger**: Incoming call outside "Business Hours".
2.  **Agent Action (Voice Mode)**: AI answers: "Hi, you've reached [Tradie]. The office is closed, but I can take a message. Is this a plumbing emergency?"
3.  **Branch A (Routine)**: Caller says "No, just need a quote." AI: "No problem. I've noted that and [Tradie] will call you tomorrow morning." (Tradie is NOT disturbed).
4.  **Branch B (Emergency)**: Caller says "Yes, water is everywhere." AI: "Understood. I'm patching you through now." (Bypasses Do-Not-Disturb).

### Use Case 12: The "Bad Review" Firewall (Reputation Management)
**Scenario**: A job didn't go well (mud on carpet). Tradie doesn't know. Client is fuming.
**Ideal Workflow**:
1.  **Trigger**: Job Complete.
2.  **Agent Action**: SMS sent: "Hi [Name], quick question: On a scale of 1-10, how happy were you with the service today?"
3.  **Branch A (Score 1-8)**: Client replies "6". Agent Auto-reply: "I'm sorry we missed the mark. What went wrong?" (Internal alert sent to Manager: "Detractor Alert").
4.  **Branch B (Score 9-10)**: Client replies "10". Agent Auto-reply: "That's awesome! Would you mind posting that to Google? [Link]"
**Result**: Captures complaints privately, amplifies praise publicly.

### Use Case 13: The "Multi-Property" Nexus (CRM Intelligence)
**Scenario**: "Jane Smith" calls. Tradie thinks it's a new lead. CRM realizes she owns 5 rental properties from previous jobs.
**Ideal Workflow**:
1.  **Trigger**: Incoming Call / Lead.
2.  **Resolution**: CRM matches phone number to existing "Landlord" profile.
3.  **Briefing**: App displays: "Jane Smith: Landlord. 5 active properties. Total Value: $15k/year."
4.  **Action**: Tradie answers with context: "Hi Jane! Which property is acting up today? Is it the Bond Street apartment?"
5.  **Result**: Jane is blown away by the service/memory.

### Use Case 14: The "Uber-Style" Arrival (Customer Anxiety)
**Scenario**: Client takes morning off work. Sitting at home wondering "Is he actually coming?".
**Ideal Workflow**:
1.  **Trigger**: Tradie taps "Start Travel" in App.
2.  **Agent Action**: SMS to Client: "Hi [Name], [Tradie] is on the way! ETA: 18 mins. Track him here: [Liveshare Link]."
3.  **Content**: Link opens map showing live truck location and a photo of the Tradie ("Security/Trust").
4.  **Impact**: Client opens the gate early. Tradie walks straight in. Zero friction.

### Use Case 15: The "Win-Back" Warm Up (Long-Term Nurture)
**Scenario**: It's quiet. Tradie wants to fill the pipeline.
**Ideal Workflow**:
1.  **Trigger**: Command `/marketing win-back`.
2.  **Search**: AI finds clients whose last job was >24 months ago.
3.  **Campaign**: "Hi [Name], it's been a while! Just letting you know we've expanded our team and offer [New Service] now. If you need anything done around the house, we're prioritizing returning clients this month."
4.  **Result**: Re-engages a dormant database asset that was otherwise zero value.

### Use Case 16: The "Waitlist" Warrior (Schedule Optimization)
**Scenario**: "Mrs. Jones" wants a booking for Monday. Tradie is full. Tuesday is the best he can do.
**Ideal Workflow**:
1.  **Trigger**: Monday appointment cancels (e.g., via Use Case 5 confirmation).
2.  **Agent Action**: AI checks "Waitlist" database. Sees Mrs. Jones wanted Monday.
3.  **Speed**: AI SMS: "Hi Mrs. Jones, a slot just opened up for this Monday at 2pm. Do you want to grab it?"
4.  **Revenue**: Client says "Yes!". Dead slot is filled instantly ensuring 100% billable utilization.

### Use Case 17: The "Daily Digest" (Project Communication)
**Scenario**: Tradie is doing a 4-day bathroom renovation. Client is at work all day, anxious about progress.
**Ideal Workflow**:
1.  **Trigger**: End of Day (5pm app prompt).
2.  **Input**: Tradie selects 3 photos taken during the day.
3.  **Agent Action**: Sends "Project Update" SMS Link.
4.  **Content**: "Day 2 Update: Waterproofing complete. Tiles arriving tomorrow. See photos attached."
5.  **Impact**: Client feels informed and reassured without needing to call.

### Use Case 18: The "Parts Watch" (Expectation Management)
**Scenario**: Job booked but waiting on a specialized part. Client keeps calling "Is it there yet?".
**Ideal Workflow**:
1.  **Trigger**: Supplier email: "Order #999 Shipped".
2.  **Integration**: Pj Buddy parses email, identifies it links to "Smith Job".
3.  **Automation**: Agent SMS to Client: "Great news! The valve has shipped and should arrive Thursday. I'll call you then to book the install."
4.  **Result**: Proactive updates kill the "chasing" calls.

### Use Case 19: The "Safety First" Brief (Trust & Compliance)
**Scenario**: New Strata/Commercial client enquires. Asks "Are you fully insured and licensed?".
**Ideal Workflow**:
1.  **Trigger**: AI detects keyword "Insured" or "Licence" in chat/email.
2.  **Agent Action**: Auto-replies: "Yes absolutely. I've attached our 'Compliance Pack' containing current Public Liability Certificate, Workers Comp, and Plumbing Licence."
3.  **Impact**: Instant authority. Eliminates friction in the approval process.

### Use Case 20: The "Warranty" Watchdog (Retention)
**Scenario**: Tradie installed a Hot Water System 4 years and 11 months ago. Warranty is 5 years.
**Ideal Workflow**:
1.  **Trigger**: Date = Install Date + 4 Years 11 Months.
2.  **Agent Action**: SMS to Client: "Hi [Name], your Hot Water System warranty expires next month. I recommend a quick check-up now. If anything is wrong, we can claim it for free before the coverage ends."
3.  **Value**: Client feels Tradie is "on their side" against the manufacturer. Booked service + customer for life.
**Scenario**: 8:30 PM on a Tuesday. Phone rings. Tradie is with family.
**Ideal Workflow**:
1.  **Trigger**: Incoming call outside "Business Hours".
2.  **Agent Action (Voice Mode)**: AI answers: "Hi, you've reached [Tradie]. The office is closed, but I can take a message. Is this a plumbing emergency?"
3.  **Branch A (Routine)**: Caller says "No, just need a quote." AI: "No problem. I've noted that and [Tradie] will call you tomorrow morning." (Tradie is NOT disturbed).
4.  **Branch B (Emergency)**: Caller says "Yes, water is everywhere." AI: "Understood. I'm patching you through now." (Bypasses Do-Not-Disturb).

### Use Case 12: The "Bad Review" Firewall (Reputation Management)
**Scenario**: A job didn't go well (mud on carpet). Tradie doesn't know. Client is fuming.
**Ideal Workflow**:
1.  **Trigger**: Job Complete.
2.  **Agent Action**: SMS sent: "Hi [Name], quick question: On a scale of 1-10, how happy were you with the service today?"
3.  **Branch A (Score 1-8)**: Client replies "6". Agent Auto-reply: "I'm sorry we missed the mark. What went wrong?" (Internal alert sent to Manager: "Detractor Alert").
4.  **Branch B (Score 9-10)**: Client replies "10". Agent Auto-reply: "That's awesome! Would you mind posting that to Google? [Link]"
**Result**: Captures complaints privately, amplifies praise publicly.

### Use Case 13: The "Multi-Property" Nexus (CRM Intelligence)
**Scenario**: "Jane Smith" calls. Tradie thinks it's a new lead. CRM realizes she owns 5 rental properties from previous jobs.
**Ideal Workflow**:
1.  **Trigger**: Incoming Call / Lead.
2.  **Resolution**: CRM matches phone number to existing "Landlord" profile.
3.  **Briefing**: App displays: "Jane Smith: Landlord. 5 active properties. Total Value: $15k/year."
4.  **Action**: Tradie answers with context: "Hi Jane! Which property is acting up today? Is it the Bond Street apartment?"
5.  **Result**: Jane is blown away by the service/memory.

### Use Case 14: The "Uber-Style" Arrival (Customer Anxiety)
**Scenario**: Client takes morning off work. Sitting at home wondering "Is he actually coming?".
**Ideal Workflow**:
1.  **Trigger**: Tradie taps "Start Travel" in App.
2.  **Agent Action**: SMS to Client: "Hi [Name], [Tradie] is on the way! ETA: 18 mins. Track him here: [Liveshare Link]."
3.  **Content**: Link opens map showing live truck location and a photo of the Tradie ("Security/Trust").
4.  **Impact**: Client opens the gate early. Tradie walks straight in. Zero friction.

### Use Case 15: The "Win-Back" Warm Up (Long-Term Nurture)
**Scenario**: It's quiet. Tradie wants to fill the pipeline.
**Ideal Workflow**:
1.  **Trigger**: Command `/marketing win-back`.
2.  **Search**: AI finds clients whose last job was >24 months ago.
3.  **Campaign**: "Hi [Name], it's been a while! Just letting you know we've expanded our team and offer [New Service] now. If you need anything done around the house, we're prioritizing returning clients this month."
4.  **Result**: Re-engages a dormant database asset that was otherwise zero value.

### Use Case 16: The "Waitlist" Warrior (Schedule Optimization)
**Scenario**: "Mrs. Jones" wants a booking for Monday. Tradie is full. Tuesday is the best he can do.
**Ideal Workflow**:
1.  **Trigger**: Monday appointment cancels (e.g., via Use Case 5 confirmation).
2.  **Agent Action**: AI checks "Waitlist" database. Sees Mrs. Jones wanted Monday.
3.  **Speed**: AI SMS: "Hi Mrs. Jones, a slot just opened up for this Monday at 2pm. Do you want to grab it?"
4.  **Revenue**: Client says "Yes!". Dead slot is filled instantly ensuring 100% billable utilization.

### Use Case 17: The "VIP" Fast-Lane (B2B Partners)
**Scenario**: A Real Estate Property Manager has 100 rentals. She calls 5 times a week. Hates waiting on hold or explaining "Who she is".
**Ideal Workflow**:
1.  **Trigger**: Incoming SMS from VIP Number. "Tap leaking at 42 Wallaby Way."
2.  **Recognition**: AI Tag = "Property Manager".
3.  **No-Friction Action**: AI Auto-creates Job. Replies: "Done. Booked for 2pm tomorrow. Tenant notified."
4.  **Result**: The Property Manager *only* uses this Tradie because it's the "path of least resistance."

### Use Case 18: The "Hold" Buster (Pipeline Velocity)
**Scenario**: 5 Jobs are stuck in "Pending" because the clients are meant to be buying tiles/fixtures before work can start.
**Ideal Workflow**:
1.  **Trigger**: Job Status = "Waiting on Client". 7 Days elapsed.
2.  **Agent Action**: Proactive SMS: "Hi [Name], just checking if those tiles have arrived yet? My schedule for next week is filling up and I'd love to lock in your install."
3.  **Outcome**: Client replies "Yes! Arrived today." -> Job moves to "Booked". (Moves stuck revenue forward).

### Use Case 19: The "Spam" Assassin (Productivity)
**Scenario**: Tradie is under a floorboard. Phone rings. Answers. It's a "Solar Panel Sales" bot. Wasted 2 mins + high stress.
**Ideal Workflow**:
1.  **Trigger**: Incoming Call from Unknown Number.
2.  **Agent Screen**: AI answers first. "Hi, [Tradie] is working. Are you a customer?"
3.  **Bot Detection**: Caller: "We have a special offer on..."
4.  **Block**: AI: "Not interested, remove us from list." Hangs up.
5.  **Silence**: Tradie's phone *never even rang*. Focus maintained.

### Use Case 20: The "Warranty" Watchdog (Retention)
**Scenario**: Tradie installed a Hot Water System 4 years and 11 months ago. Warranty is 5 years.
**Ideal Workflow**:
1.  **Trigger**: Date = Install Date + 4 Years 11 Months.
2.  **Agent Action**: SMS to Client: "Hi [Name], your Hot Water System warranty expires next month. I recommend a quick check-up now. If anything is wrong, we can claim it for free before the coverage ends."
3.  **Value**: Client feels Tradie is "on their side" against the manufacturer. Booked service + customer for life.

---

**End of Manual**
**Scenario**: 8:30 PM on a Tuesday. Phone rings. Tradie is with family.
**Ideal Workflow**:
1.  **Trigger**: Incoming call outside "Business Hours".
2.  **Agent Action (Voice Mode)**: AI answers: "Hi, you've reached [Tradie]. The office is closed, but I can take a message. Is this a plumbing emergency?"
3.  **Branch A (Routine)**: Caller says "No, just need a quote." AI: "No problem. I've noted that and [Tradie] will call you tomorrow morning." (Tradie is NOT disturbed).
4.  **Branch B (Emergency)**: Caller says "Yes, water is everywhere." AI: "Understood. I'm patching you through now." (Bypasses Do-Not-Disturb).

### Use Case 12: The "Bad Review" Firewall (Reputation Management)
**Scenario**: A job didn't go well (mud on carpet). Tradie doesn't know. Client is fuming.
**Ideal Workflow**:
1.  **Trigger**: Job Complete.
2.  **Agent Action**: SMS sent: "Hi [Name], quick question: On a scale of 1-10, how happy were you with the service today?"
3.  **Branch A (Score 1-8)**: Client replies "6". Agent Auto-reply: "I'm sorry we missed the mark. What went wrong?" (Internal alert sent to Manager: "Detractor Alert").
4.  **Branch B (Score 9-10)**: Client replies "10". Agent Auto-reply: "That's awesome! Would you mind posting that to Google? [Link]"
**Result**: Captures complaints privately, amplifies praise publicly.

### Use Case 13: The "Multi-Property" Nexus (CRM Intelligence)
**Scenario**: "Jane Smith" calls. Tradie thinks it's a new lead. CRM realizes she owns 5 rental properties from previous jobs.
**Ideal Workflow**:
1.  **Trigger**: Incoming Call / Lead.
2.  **Resolution**: CRM matches phone number to existing "Landlord" profile.
3.  **Briefing**: App displays: "Jane Smith: Landlord. 5 active properties. Total Value: $15k/year."
4.  **Action**: Tradie answers with context: "Hi Jane! Which property is acting up today? Is it the Bond Street apartment?"
5.  **Result**: Jane is blown away by the service/memory.

### Use Case 14: The "Uber-Style" Arrival (Customer Anxiety)
**Scenario**: Client takes morning off work. Sitting at home wondering "Is he actually coming?".
**Ideal Workflow**:
1.  **Trigger**: Tradie taps "Start Travel" in App.
2.  **Agent Action**: SMS to Client: "Hi [Name], [Tradie] is on the way! ETA: 18 mins. Track him here: [Liveshare Link]."
3.  **Content**: Link opens map showing live truck location and a photo of the Tradie ("Security/Trust").
4.  **Impact**: Client opens the gate early. Tradie walks straight in. Zero friction.

### Use Case 15: The "Win-Back" Warm Up (Long-Term Nurture)
**Scenario**: It's quiet. Tradie wants to fill the pipeline.
**Ideal Workflow**:
1.  **Trigger**: Command `/marketing win-back`.
2.  **Search**: AI finds clients whose last job was >24 months ago.
3.  **Campaign**: "Hi [Name], it's been a while! Just letting you know we've expanded our team and offer [New Service] now. If you need anything done around the house, we're prioritizing returning clients this month."
4.  **Result**: Re-engages a dormant database asset that was otherwise zero value.

---

### Use Case 16: The "Asset DNA" (Recurring Revenue)
**Scenario**: Tradie services an AC unit. Doesn't know when filters were last changed.
**Ideal Workflow**:
1.  **Action**: Tradie sticks a unique QR code on the unit. Scans it with App.
2.  **Record**: App creates "Asset Profile" linked to the Client and Property. Logs "Service Date: Feb 2026".
3.  **Automation**: 12 months later, AI scans all Assets. Finds this unit is "Due".
4.  **Outbound**: SMS to Client: "Hi [Name], your Daikin Unit (Serial #123) is due for its annual manufacturer check. Reply YES to book."

### Use Case 17: The "Subbie" Firewall (Scalability)
**Scenario**: Business is booming. Tradie hires a sub-contractor but doesn't want them seeing client pricing or customer lists.
**Ideal Workflow**:
1.  **Trigger**: Tradie assigns Job to "Subcontractor Ben".
2.  **View Control**: Ben opens the App. He sees ONLY: Job Address, Task List, Safety Form. (No $ figures, no other clients).
3.  **Completion**: Ben uploads photos and marks complete.
4.  **Sync**: Main Tradie gets alert: "Ben finished Job #101". Tradie creates the Invoice (with markup) and sends to client.

### Use Case 18: The "Smart Reschedule" (Crisis Management)
**Scenario**: Tradie's van breaks down at 7am. 5 jobs booked for the day. Stress levels high.
**Ideal Workflow**:
1.  **Trigger**: Tradie hits "Emergency / Breakdown" button in App.
2.  **Agent Action**: AI accesses calendar. Identifies 5 affected clients.
3.  **Broadcast**: SMS sent: "Hi [Name], I'm incredibly sorry but my van has broken down. I can't make our slot today. I have reserved a priority slot for you tomorrow at [Time]. Does that work?"
4.  **Result**: 3 auto-accept. 2 reply to negotiate. Crisis managed in seconds.

### Use Case 19: The "Neighborhood" Batch (Route Efficiency)
**Scenario**: Tradie finishes a job early in "Suburb A". Next job is 2 hours away.
**Ideal Workflow**:
1.  **Trigger**: Tradie opens map. Selects "Nearby Clients".
2.  **Filter**: App shows 5 past clients within 2km who haven't been seen in >6 months.
3.  **Action**: Tradie selects "Blast". AI SMS: "Hi [Name], I'm in your street doing a job and finished early. If you need that [Pending Item] looked at, I can swing by in 10 mins with no call-out fee."
4.  **Result**: Fills dead time with billable work.

### Use Case 20: The "Lead Source" Detective (Marketing ROI)
**Scenario**: Tradie spends $1k on Google Ads and $500 on Facebook. Doesn't know what works.
**Ideal Workflow**:
1.  **Trigger**: New Inquiry (Phone or Web).
2.  **Tracking**: Pj Buddy captures the source (e.g., unique tracking number or UTM tag).
3.  **Conversion**: 3 months later, Job is invoiced for $5,000.
4.  **Reporting**: Dashboard shows: "Google Lead #55 -> Value $5k".
5.  **Insight**: Agent suggests: "Facebook ads are costing $500 but generating $0 revenue. Recommend pausing."

---

## 9. The 50 Chatbot & CRM Use Cases

Pj Buddy’s AI Assistant is designed to replace manual clicking with natural language commands. Here are 50 specific ways you can interact with the system.

### Category A: Direct CRM Interactions (25 Use Cases)

**Job Creation & Pipeline Management**
1. **Create Job**: "I have a new job for John Smith tomorrow at 2pm, quote him $250 to fix a leaking pipe."
2. **Move Deal**: "Move John's deal to the Scheduled column."
3. **Change Stage Status**: "Mark the Kensington bathroom reno as Completed."
4. **Draft a Deal**: "Draft a new quote for Sarah at 12 Maple St, but don't schedule it yet."
5. **Add Contact**: "Create a new contact for Mike Stevenson, his number is 0412 345 678."
6. **Lookup Contact**: "What is Mike Stevenson's address?"
7. **Find Stale Deals**: "Show me all pipeline deals that haven't moved in 7 days."
8. **Pipeline Value**: "How much revenue is sitting in the 'Quote Sent' column right now?"
9. **Log Activity**: "Add a note to John's job that I called him and left a voicemail."
10. **Assign Value**: "Update the estimate for Sarah's kitchen to $4,500."

**Scheduling & Routing**
11. **Check Schedule**: "What jobs do I have on tomorrow?"
12. **Find Gaps**: "Do I have any free time on Thursday afternoon?"
13. **Reschedule**: "Reschedule my 2pm job with Wendy to Friday at 10am."
14. **Pre-Arrival SMS**: "Text Wendy I'm on my way and will be there in 15 mins."
15. **Route Planning**: "Show me the map for today's jobs."
16. **Proximity Search**: "Find any past clients who live within 5km of my current location."
17. **Cancellations**: "Cancel the 3pm job with Bob."
18. **Delay Alerts**: "Text all my afternoon clients that I'm running 30 minutes behind schedule."
19. **Schedule Lock**: "Block out next Wednesday morning for maintenance."
20. **Job Details Retrieval**: "What did I quote for the 9am job today?"

**Notifications & Reporting**
21. **Performance Check**: "How many jobs did I complete last week?"
22. **Set Reminders**: "Remind me tomorrow at 8am to order the copper pipes for Sarah."
23. **Win Rate**: "What is my quote win-rate for this month?"
24. **Follow-up Trigger**: "Send a follow-up text to everyone in the 'Quote Sent' column."
25. **Review Request**: "Send a Google Review link to the client I just finished with."

### Category B: General Assistant Utilities & Voice Actions (25 Use Cases)

**Communication & Drafting**
26. **Draft Email**: "Draft a polite email to John explaining that the parts are delayed until next week."
27. **SMS Template**: "Write a text message offering 10% off air conditioning services before summer starts."
28. **Reply Suggestion**: "Suggest a reply to this customer complaining about the price being too high."
29. **Translation**: "Translate 'The water will be turned off for two hours' into Spanish."
30. **Summarize Thread**: "Summarize the last 5 text messages between me and Bob."

**Business Intelligence & Estimating**
31. **Material Calculation**: "I need to tile a 4m by 5m room, assuming 10% wastage, how many square meters of tiles do I need to order?"
32. **Margin Check**: "If materials cost $400 and labor is $300, what should I charge to hit a 40% gross margin?"
33. **Tax Quick-Math**: "What is $1,250 plus 10% GST?"
34. **Unit Conversion**: "Convert 1.5 inches to millimeters."
35. **Invoice Drafting**: "Draft the line items for an invoice: 2 hours labor at $80/hr, and $120 for parts."

**Troubleshooting & Knowledge Base**
36. **Code Check**: "What is the standard clearance required for a gas cooktop installation?"
37. **Manual Lookup**: "Find the error code E4 on a Daikin split system."
38. **Safety Brief**: "Generate a quick safety checklist for operating a scissor lift."
39. **Material Suggestions**: "What's the best type of sealant to use around an outdoor pool area?"
40. **Tool Check**: "List the specialized tools I'll need to bleed a hydronic heating system."

**Admin & Voice Logging (Hands-Free)**
41. **Voice Note (Site Condition)**: "Log a note: The switchboard at the Kensington property is illegal and needs an upgrade."
42. **Voice Note (Client Warning)**: "Log a note: The client has a large aggressive dog, call before opening the gate next time."
43. **Voice Note (Part Number)**: "Log a note: I need to order a Rheem element part number 12345."
44. **Voice Note (Purchase Log)**: "Log that I just spent $150 at Bunnings on PVC glue and fittings."
45. **Generate Checklist**: "Create a 5-step checklist for shutting down the mains water pressure."

**System Control**
46. **Change Theme/Appearance**: "Switch the app to Light Mode." (Though locked, intent implies system control).
47. **Switch Modes**: "Toggle Advanced Mode so I can see the Kanban board."
48. **Replay Walkthrough**: "Restart the interactive tutorial."
49. **Open Settings**: "Take me to the workspace settings page."
50. **Sign Out**: "Log me out of the app."

---

**End of Manual**
