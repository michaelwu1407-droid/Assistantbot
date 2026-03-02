# 📚 Tutorial Handbook

## Table of Contents
1. [Getting Started](#getting-started)
2. [Core Features](#core-features)
3. [Advanced Features](#advanced-features)
4. [Multilingual Support](#multilingual-support)

---

## Getting Started

### Welcome to Earlymark
Earlymark is your AI-powered business assistant that helps you manage customers, jobs, and communications efficiently.

### First Steps
1. **Create Your Account**: Sign up with email or social login
2. **Set Up Your Business**: Add your business details and preferences
3. **Invite Your Team**: Add team members for collaboration
4. **Start Using**: Begin managing customers and jobs with AI assistance

---

## Core Features

### Customer Management
- Add new customers via chat interface
- View customer history and communications
- Track customer preferences and notes

### Job Management
- Create and track jobs through pipeline stages
- Assign jobs to team members
- Monitor job progress and completion

### AI Assistant (Tracey)
- Natural language commands for common tasks
- Automated communications with customers
- Intelligent scheduling and reminders

---

## Advanced Features

### Team Collaboration
- Role-based access (Owner, Manager, Team Member)
- Shared customer and job management
- Team communication and coordination

### Analytics & Reporting
- Revenue tracking and performance metrics
- Customer acquisition and retention data
- Job completion rates and team productivity

---

## Multilingual Support

Earlymark supports customers who speak different languages through our AI assistant Tracey.

### Adding Language Preferences

When creating a new customer, use the **Notes** field to specify language preferences:

#### How to Add Language Notes:
1. **Message Tracey**: "New customer John Smith needs plumbing work"
2. **Draft Card Appears**: Review the customer details
3. **Add Language Notes**: In the Notes field, enter:
   - "speaks Chinese"
   - "prefers Mandarin" 
   - "hard of hearing, speak clearly"
   - "Spanish only"
   - "needs interpreter"

#### Examples:
```
Notes: speaks Chinese, prefers Mandarin
Notes: Spanish only, no English
Notes: hard of hearing, speak slowly and clearly
Notes: Arabic speaker, uses formal address
```

### Supported Languages

Tracey AI can communicate with customers in:

- **Chinese (Mandarin)** - Uses `zh-CN-XiaoxiaoNeural` voice
- **Spanish** - Uses `es-ES-ElviraNeural` voice
- **French** - Uses `fr-FR-DeniseNeural` voice
- **German** - Uses `de-DE-KatjaNeural` voice
- **Japanese** - Uses `ja-JP-NanamiNeural` voice
- **Korean** - Uses `ko-KR-SunHiNeural` voice
- **Arabic** - Uses `ar-SA-ZariyahNeural` voice
- **English** - Default fallback language

### How Multilingual Support Works

#### AI Calls:
1. **Customer Creation**: User adds language preference in notes
2. **AI Call**: Tracey calls customer using appropriate voice
3. **Language Detection**: AI detects and responds in customer's language
4. **Natural Conversation**: Customer speaks their preferred language

#### SMS Communications:
- Tracey sends SMS in preferred language when possible
- Language preferences are noted in customer profile
- Automatic translation for common messages

### Testing Multilingual Support

#### Test Customer Example:
```
Message: "New customer Maria Garcia needs electrical work"
Notes: "speaks Spanish only"
```

**Expected Behavior:**
- Tracey calls using Spanish voice model
- AI responds in Spanish during conversation
- SMS messages sent in Spanish when appropriate

### Best Practices

#### For Language Notes:
- Be specific about dialect (e.g., "Mandarin Chinese" vs just "Chinese")
- Include communication preferences ("speak slowly", "formal address")
- Note any accessibility needs ("hard of hearing", "needs interpreter")

#### For Team Members:
- Check customer language preferences before calling
- Use Tracey AI for automatic language handling
- Review call logs for quality assurance

### Troubleshooting

#### Common Issues:
1. **Wrong Language Detected**
   - Check customer notes for accuracy
   - Verify language preference is clearly stated
   - Contact support if persistent issues

2. **Voice Quality Issues**
   - Ensure stable internet connection
   - Check Retell AI configuration
   - Report voice quality problems

3. **SMS Language Problems**
   - SMS may be limited to English in some cases
   - Use AI calls for complex multilingual conversations
   - Consider customer communication preferences

### Latency Diagnostics (Admin)

If responses feel slow, use the internal latency telemetry endpoint to isolate the bottleneck.

#### Endpoint
- `GET /api/internal/telemetry/latency`
- `DELETE /api/internal/telemetry/latency` (reset rolling samples)

#### Security
- In production, send header: `x-telemetry-key: <TELEMETRY_ADMIN_KEY>`

#### What to Inspect
- `chat.web.preprocessing_ms` / `chat.headless.preprocessing_ms`
- `chat.web.tool_calls_ms` / `chat.headless.tool_calls_ms`
- `chat.web.model_ms` / `chat.headless.model_ms`
- `chat.web.total_ms` / `chat.headless.total_ms`
- Per-tool timings: `chat.web.tool.<tool>_ms`, `chat.headless.tool.<tool>_ms`

Use `p50Ms` for typical performance and `p95Ms` for tail latency (slowest user experience).

---

## Need Help?

### Support Channels:
- **Email**: support@earlymark.com
- **Phone**: 1300 PJ BUDDY
- **AI Assistant**: Ask Tracey in the chat interface

### Additional Resources:
- Check the Settings → Help section for detailed guides
- Review the Issue Tracker for known problems and solutions
- Contact support for personalized assistance

---

*Last Updated: February 27, 2026*
