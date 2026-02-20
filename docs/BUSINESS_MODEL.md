# PJ Buddy - Business Model & Architecture Context

**Last Updated:** 2026-02-20

## Core Business Model
This application is a **B2B SaaS product** built for Tradespeople (Tradies).

The creator/developer of this app (Michael) is the **Platform Provider**.
He sells this software to **Tradies** (the Users of the platform).
The Tradies use this software to serve their **Customers** (homeowners, clients).

## The Three Personas & How They Interact

1. **The Tradie (Your SaaS User)**
   - Logs into the PJ Buddy Dashboard (the CRM).
   - Manages deals, contacts, schedules, and materials.
   - Interacts with the **Internal Chatbot** (Google Gemini) on the dashboard to quickly draft jobs, summarize data, and navigate the CRM.
   - *Crucially: The Tradie does NOT text the AI. They text their customers directly through the CRM interface.*

2. **The Customer Service Agent (The AI for the Customer)**
   - Acts as the digital receptionist for the Tradie's business.
   - Powered by **Retell AI** (for inbound/outbound Phone Calls) and **Twilio** (for SMS / WhatsApp messaging).
   - When a homeowner calls or texts the Tradie's dedicated business number, this AI Agent intercepts it, answers questions, qualifies leads, drafts jobs, and feeds everything directly into the CRM.

3. **The End Customer (The Homeowner)**
   - Never logs into PJ Buddy.
   - Interacts purely via Phone, SMS, WhatsApp, or Email with the Tradie's AI Customer Service Agent.
   - Assumes they are talking to the Tradie's actual business.

## Infrastructure Strategy (e.g., Twilio)
- **Master Account:** The Platform Provider (Michael) owns the master Twilio and Retell accounts.
- **Sub-Allocation:** Each new Tradie sign-up gets a unique Phone Number provisioned from the master Twilio/Retell account and linked to their specific `workspaceId` in the database.
- **Billing:** The Platform Provider pays the raw API costs (pennies) to Twilio/Retell and charges the Tradie a flat monthly SaaS subscription fee (or marks up the usage) to generate profit.
