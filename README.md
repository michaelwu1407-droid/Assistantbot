# Earlymark - AI-Powered Tradie CRM Platform

**Version**: 2.1 (February 2026)  
**Target**: Australian Tradespeople & Service Businesses  
**Architecture**: Next.js 16.1.6 + Supabase + Gemini AI + Twilio

---

## 🎯 **Core Vision**

Earlymark is an **AI-first CRM** built exclusively for Tradies. We eliminate administrative overhead by providing a conversational interface where jobs can be quoted, scheduled, and invoiced entirely through natural language.

**Key Philosophy**: "Chat First, Click Second" - Our AI assistant handles 90% of tasks through simple commands, while the visual dashboard provides oversight when needed.

---

## 🚀 **Instant Lead Capture System** ⭐ (NEW)

Our revolutionary **Instant Lead Capture** automatically detects and responds to leads from major platforms:

### 🔄 **How It Works**
1. **One-Click Connection**: Connect Gmail/Outlook via OAuth
2. **Auto-Filter Creation**: We automatically create email filters for:
   - ✅ Hipages
   - ✅ Airtasker  
   - ✅ Oneflare
   - ✅ ServiceSeeking
   - ✅ ServiceTasker
   - ✅ Bark
3. **AI Parsing**: Gemini 2.0 Flash Lite extracts customer details
4. **Instant Response**: Creates deals + sends intro SMS in seconds

### 📈 **Speed-to-Lead Advantage**
- **Traditional**: 2-4 hour average response time
- **Earlymark**: **Under 60 seconds** automatic response
- **Result**: 3x higher win rate on competitive platforms

---

## 📞 **Phone Management System** ⭐ (NEW)

Dual-number architecture for complete communication control:

### 📱 **Personal Phone Number** (User Management)
- **Purpose**: App-to-user communication (verification, urgent messages)
- **Management**: Changeable via Settings with SMS verification (code sent to the **new** number)
- **Features**: 6-digit codes, 10-minute expiry, first-time setup (no verification required for first entry)
- **Location**: `/dashboard/settings/phone-settings`

### 🤖 **AI Agent Business Number** (Customer-Facing)
- **Purpose**: Customer communications via AI assistant
- **Management**: Support-only (security-focused)
- **Features**: Twilio subaccounts, voice agent integration
- **Changes**: Via support ticket system

---

## 🛠️ **Support System** ⭐ (NEW)

Multi-channel support with AI-powered assistance:

### 🤖 **AI Assistant Support**
- **24/7 Availability**: Instant help and ticket creation
- **Smart Categorization**: Phone, billing, features, bugs, accounts
- **Priority Detection**: Urgent, high, medium, low
- **Immediate Help**: Diagnostics and next steps

### 📞 **Human Support Channels**
- **Email**: support@earlymark.ai (24-hour response)
- **Phone**: 1300 EARLYMARK (Mon-Fri 9am-5pm AEST)
- **Tickets**: Integrated support system in settings
- **Website**: Contact section with all channels

---

## 🏗️ **Technical Architecture**

### **Frontend Stack**
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript (100% type-safe)
- **UI System**: Tailwind CSS + shadcn/ui (Glassmorphism design)
- **State Management**: React hooks + Server Components

### **Backend & Services**
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **ORM**: Prisma (type-safe queries)
- **Authentication**: Supabase Auth (not Clerk)
- **AI Engine**: Google Gemini 2.0 Flash Lite via Vercel AI SDK

### **Telephony & Communication**
- **Voice**: Retell AI (natural conversation)
- **SMS**: Twilio (multi-tenant subaccounts)
- **Email**: Resend (transactional)
- **Webhooks**: Real-time lead processing
- **Phone Verification**: Master Twilio number for codes

### **Infrastructure**
- **Hosting**: Vercel (Edge functions)
- **Monitoring**: Sentry + PostHog
- **Storage**: Supabase Storage (files/docs)
- **Security**: End-to-end encryption for OAuth tokens

---

## 📱 **Platform Features Overview**

### **🏠 The Hub - Main Dashboard** (`/dashboard`)
- **Kanban Pipeline**: Visual deal workflow (New → Quote → Scheduled → Complete)
- **KPI Cards**: Revenue, scheduled jobs, follow-ups
- **Activity Feed**: Real-time timeline of all interactions
- **Global Search**: Cmd+K fuzzy search across deals/contacts

### **💬 AI Assistant** (Every Page)
- **Natural Language**: "New job for John worth $5000"
- **Voice Input**: Microphone for hands-free commands
- **Context Awareness**: Knows current page and suggests actions
- **Magic Commands**: `/draft`, `/summarize`, `/schedule`
- **Support Handling**: Automatic ticket creation and categorization

### **📅 Schedule** (`/dashboard/schedule`)
- **Calendar View**: Month/Week/Day views
- **Job Pins**: Interactive markers on calendar
- **Quick Reschedule**: Drag-and-drop date changes

### **🗺️ Map View** (`/dashboard/map`)
- **Route Planning**: Today's jobs plotted on map
- **Start Travel**: One-click navigation + ETA SMS
- **Live Tracking**: Uber-style arrival tracking

### **👥 Contacts** (`/dashboard/contacts`)
- **CRM Database**: All clients and leads
- **Lifetime Value**: Customer revenue tracking
- **Communication History**: All interactions in one place

### **📨 Inbox** (`/dashboard/inbox`)
- **Unified Feed**: SMS, calls, emails, notes
- **Rich Media**: Call transcripts, email snippets
- **Quick Actions**: Call/text/email shortcuts

### **⚙️ Settings Hub** (`/dashboard/settings`)
- **Workspace Profile**: Business details & hours
- **Agent Capabilities**: AI behavior & limits
- **Automations**: Custom IF/THEN workflows
- **Integrations**: Connect external tools
- **Appearance**: UI themes & preferences

---

## 🎨 **User Experience Design**

### **Glassmorphism UI System**
- **Premium Aesthetic**: Frosted glass effects
- **Corner Layout**: Optimized for desktop workflow
- **Dark/Light Modes**: Full theme support
- **Responsive**: Mobile-first design principles

### **Chat-First Interface**
- **Right Panel**: Always-accessible AI assistant
- **Contextual Help**: Page-specific suggestions
- **Voice Support**: Hands-free operation
- **Quick Commands**: Slash commands for power users

---

## 🔄 **Industry-Specific Workflows**

### **Tradies (Primary Focus)**
- **Job Stages**: New → Quote Sent → Scheduled → In Progress → Complete
- **Field Tools**: Map routing, material picker, photo capture
- **Invoicing**: One-tap PDF generation
- **Safety Checks**: Built-in risk assessments

### **Real Estate (Available)**
- **Sales Stages**: New Listing → Appraisal → Under Offer → Exchanged → Settled
- **Matchmaking**: Buyer-listing compatibility scoring
- **Speed-to-Lead**: Response time tracking

---

## 🔧 **Developer Resources**

### **Environment Setup**
```bash
# Clone and install
git clone [repo-url]
cd earlymark
npm install

# Environment variables
cp .env.example .env.local
# Fill in Supabase, Twilio, Gemini keys

# Database setup
npx prisma db push
npx prisma generate

# Development
npm run dev
```

### **Key Configuration**
```env
# Core Services
SUPABASE_URL=your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token

# AI Services
GEMINI_API_KEY=your-gemini-key
RETELL_API_KEY=your-retell-key

# OAuth for Lead Capture
GMAIL_CLIENT_ID=your-gmail-client
OUTLOOK_CLIENT_ID=your-outlook-client
ENCRYPTION_KEY=your-32-byte-key
```

---

## 📚 **Documentation Structure**

- **`README.md`**: This overview and architecture guide
- **`APP_MANUAL.md`**: Detailed feature walkthrough
- **`project_status_log.md`**: Development history and changes
- **`DEPLOYMENT_CHECKLIST.md`**: Production deployment guide
- **`docs/`**: Additional technical documentation

---

## 🆘 **Support & Community**

- **Issues**: GitHub Issues for bug reports
- **Documentation**: See `/docs` folder for detailed guides
- **Status**: Real-time status at status.earlymark.ai
- **Updates**: Follow @earlymark on Twitter for updates

---

## 📄 **License & Legal**

- **License**: Proprietary - All rights reserved © 2026 Michael Wu
- **Privacy**: GDPR-compliant data handling
- **Security**: SOC2 Type II compliant infrastructure
- **Support**: 24/7 support for Enterprise plans

---

**Last Updated**: February 24, 2026  
**Version**: 2.1 - Communication Clarification Edition  
**Maintained by**: Earlymark Engineering Team

---

*"We're building the future of trade business management - one conversation at a time."*
