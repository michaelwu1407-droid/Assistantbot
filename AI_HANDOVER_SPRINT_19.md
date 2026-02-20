# AI Developer Handover Log (Sprint 19 & Remaining Features)

## 📌 Context
This document is generated for the next AI agent or developer to provide context on the massive backlog of UX/UI polish, missing features, and robust architectural additions that the user has formally requested.

---

## 🛑 Missing Features, UX Polish, & Technical Debt (For Next Agent)

Please implement, fix, or clarify the following items logically and sequentially.

### 1. General Layout/UI & Obsolete Features
- **Split Panel:** The 75/25 split panel is no longer a strict requirement. The chatbox should open to a minimum readable width, and the user can drag it as needed.
- **Kanban Column Headers:** The dashboard/pipeline column headers are missing industry-aware configurations. **Clarify what this means with the user before changing.**
- **Stale Deals:** Do not use custom color backgrounds for stale deals anymore.
- **Safety Check Modal:** Scrap the integration entirely. Move it to archive (can be revisited later).
- **Commission Calculator:** Archive this feature.
- **Real Estate Kiosk:** Archive the Kiosk feature as the app is moving away from real estate agent functionality.
- **Mobile Bottom Sheet:** Polish the functionality (already agreed upon).

### 2. Dashboard Home Page & Kanban
- **Activity Card:** Clicking the Activity card should open a popup window (similar to Kanban cards) showing more details/entries inside.
- **New Deal Button:** Default state should toggle to "Create New" rather than "Select".
- **Kanban Card Notes:** Inside a card, drastically reduce the height of the note entry bubble and pin it to the bottom right of the "Customer and job history" card.
  - Prior notes should log as `*Date: Note*` with an "edit" button on the RHS, above the entry bubble.
- **Quick Actions:** When clicking "Contact them", it opens the inbox but currently only has a "Call" button. It must also feature "Text" and "Email" buttons.

### 3. Chatbox & Generative AI Behavior
- **Voice-to-Text:** Add a working voice-to-text mic in the chatbox.
- **Basic Query Crashes:** The bot currently crashes with "Unable to submit request because it must include at least one parts field" on basic queries (e.g., "What jobs do I have tomorrow?" or "Delete X card"). This needs immediate fixing.
- **Conversation Retrieval:** The chatbox must be able to process requests like: "Show me my text history with Steven" or "Text Steven I'm omw".

### 4. Inbox Page
- **Customer Section Layout:**
  - Create a "Recent activity" box with vertical scroll.
  - Create a secondary box below containing ALL correspondence (email, text, call).
  - Format this chronologically so it reads seamlessly like a conversation history (prioritizing optimal UI/UX).

### 5. Schedule Page
- **Views:** Add the ability to quickly toggle between Month, Week, and Day views.

### 6. Reports Page & Maps Page
- **Reports Data:** What is actually driving the tracked data here? Is it tracked correctly or set up properly?
- **PDF Generation:** What does the vendor report PDF generate? **Clarify with the user before executing.**
- **Maps Sidebar:** Move the Maps icon above the Contacts icon in the sidebar nav.
- **Maps Functionality:** The map is not accurately showing jobs. Need to verify that "Start my day" routing works.

### 7. Sidebar Navigation
- **Minimize Button:** Remove the minimize sidebar button completely.

### 8. Settings Page (Massive Overhaul Required)
- **UI Spacing:** LHS content is too cramped and overlaps the sidebar nav.
- **Profile / Knowledge Base:**
  - Build a section where the user provides business knowledge (Business name, Address, Website, etc.).
  - **CRITICAL:** This knowledge base must explicitly feed the AI Agent's system prompt context so it can interact accurately via text, call, and email.
  - What does the "Bio" and "Links" section currently do?
- **Account Settings:**
  - Verify if "Forgot my password" exists/works on the sign-in page.
  - Delete duplicate email address entry (appears in both Account and Profile).
  - "Delete Account" button should be tiny, in the bottom right corner of a card. It should pop up a confirmation window asking for a reason (dropdown options + "Other").
- **Appearance & Display:**
  - Pull useful items from Appearance into the Display tab and remove the Appearance page.
  - Fix the options (current Default should be Light mode).
- **Billing / Invoicing Integration:**
  - Set up a billing section for the user's clients to pay them (likely requires a 3rd-party integration).
- **Automations & Notifications:**
  - Automations page needs verification: "If I make $100 this week, let me know" should generate a functional rule.
  - Notifications tab needs robustness. "Notify me 2 days out for Wendy's repair job" -> Check if it generates a confirmation card in the calendar.
- **Workspace Settings:**
  - Remove irrelevant fields (Workspace Name, Location) if they are already stored in Profile/Knowledge Base.
  - How does the user set "Working Hours" for the agent? This is critical for the agent knowing when to contact users and accept jobs.
  - Integrations Page: Ensure it fully works.

### 9. Core Workflow & Smart Routing Configs
- **Post-Job Workflow:** After a job, send an alert to the user checking in: Was it resolved? How much was invoiced? Log outstanding details to the CRM.
- **Invoice Adjustments:** It must be easy to adjust the *Final Invoiced Amount* post-job via the chatbox OR the kanban cards.
- **Repair Glossary (Pricing & Multiple Fixes):**
  - Jobs often require multiple fixes. Build a "Glossary of Repair Items" so it's easy to log items via natural language.
  - **DO NOT build estimated prices into the glossary**. Leave pricing to the user to manually enter, and the system learns over time (*Explicit Feedback Loops*).
  - The agent should use the glossary to pick up known terms/typos.
- **Smart Routing (15km / 7 Days):**
  - If a non-urgent job comes in, the agent should optimize the booking for another existing job that is close by within the next 7 days.
  - *Sensitivity:* Needs rules on what constitutes "close" and how far out the agent will defer a booking just to match a route. Needs adaptation rules.
- **Email Lead Interception (Hipages):**
  - The app must parse jobs sourced from Hipages (which land in the user's email inbox). Use the email ingestion route to interact with these jobs inside the CRM.
  - *Note for Agent:* Figure out the most seamless solution for this.

### 10. Agent Operational Modes (Execute, Organise, Filter)
These modes must strictly dictate the AI's boundaries:
- **Execute:** Total autonomy. AI can book customers, schedule, and confirm instantly. Follows Smart Routing (15km / 7 days) parameters and just acts.
- **Organise:** Liaison mode. Creates **Draft Cards** (styled differently in Kanban/Chatbox so they are obvious). Proposes times, but **waits for human confirmation**. Clicking "Confirm" in chat/Kanban changes it to a real card. Triggers specific notifications.
- **Filter:** Receptionist only. Relays information and processes inbound jobs without making scheduling or pricing decisions.
- **Pricing Rule Engine (For all modes):**
  1. *Rule 1:* NEVER agree on pricing upfront without human confirmation. Focus on locking down the booking. Quote the standard generic "Call-out fee" (which must be adjustable/toggleable in Settings).
  2. *Rule 2 (Exception):* If the user has manually set a price range for a *Common Task* at setup/settings, the AI may quote that range. Make it easy for the tradie to add new items that capture slight wording variations.

### 11. Daily Action Notifications
- **Start of Day:** Push a notification presenting the User's Daily Agenda.
- **End of Day:** Push a notification detailing outstanding tasks from today + tomorrow's look-ahead.
- This logic should be toggleable/scheduled in Settings > Automations, using standard templates alongside custom NL generation.

### 12. Tutorial Constraints
- The interactive tutorial heavily misses: *Map View*, *Start Your Day*, and a run-through of *Every Sidebar Button & features inside*. This needs significant expansion.

---

### 🚨 Note to the Next Agent
Stick solely to **Explicit Feedback Loops** (auto-updating the pricing glossary based on their manual corrections) and **Dynamic Prompt Injections** (saving their chat feedback into a permanent "Rules" list). Review this list meticulously upon starting your session.
