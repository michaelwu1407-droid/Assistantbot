# Multilingual AI Support Setup Guide

This guide explains how to set up Earlymark for multilingual customer support using Retell AI.

## 🎯 Overview

Earlymark now supports language preferences for customers through:
1. **Notes field in draft cards** - Add language preferences when creating new customers
2. **Retell AI multilingual support** - AI agent speaks the customer's preferred language
3. **AI system integration** - Travis AI knows customer language preferences

## 📝 Step 1: Using the Notes Field

When creating a new customer via the chatbot, a **Notes** field now appears at the bottom of the draft card:

### How to Use:
1. **Message Travis**: "New customer John Smith needs plumbing work"
2. **Draft Card Appears**: Review the customer details
3. **Add Language Notes**: In the Notes field, enter:
   - "speaks Chinese"
   - "prefers Mandarin" 
   - "hard of hearing, speak clearly"
   - "Spanish only"
   - "needs interpreter"

### Examples:
```
Notes: speaks Chinese, prefers Mandarin
Notes: Spanish only, no English
Notes: hard of hearing, speak slowly and clearly
Notes: Arabic speaker, uses formal address
```

## 🤖 Step 2: Retell AI Multilingual Setup

### Prerequisites:
- Retell AI API key
- Retell AI Agent ID
- Multilingual voice models

### 2.1 Get Retell Credentials

1. **Sign up** at [retellai.com](https://www.retellai.com)
2. **Get API Key**: Dashboard → Settings → API Keys
3. **Create Agent**: Dashboard → Agents → Create New

### 2.2 Configure Multilingual Voices

Retell supports multiple languages through voice models:

#### Popular Language Options:
- **Chinese**: `zh-CN-XiaoxiaoNeural` (Mandarin)
- **Spanish**: `es-ES-ElviraNeural` 
- **French**: `fr-FR-DeniseNeural`
- **German**: `de-DE-KatjaNeural`
- **Japanese**: `ja-JP-NanamiNeural`
- **Korean**: `ko-KR-SunHiNeural`
- **Arabic**: `ar-SA-ZariyahNeural`

### 2.3 Create Multilingual Agent

```bash
# Run the Retell agent creation script
npm run retell:create-agent
```

**Environment Variables Needed:**
```bash
RETELL_API_KEY="your-retell-api-key"
RETELL_AGENT_ID="your-agent-id"
RETELL_RESPONSE_ENGINE_ID="your-response-engine-id"
RETELL_PRIMARY_VOICE_ID="zh-CN-XiaoxiaoNeural"  # Default voice
RETELL_FALLBACK_VOICE_ID="en-US-JennyNeural"   # Fallback to English
```

### 2.4 Configure Response Engine

In your Retell Dashboard:

1. **Create Response Engine**
2. **Set Language Detection**: Enable automatic language detection
3. **Add Language Instructions**:
   ```
   You are Travis, an AI assistant for Earlymark.
   
   Language Rules:
   - If customer speaks Chinese, respond in Mandarin
   - If customer speaks Spanish, respond in Spanish
   - If customer speaks French, respond in French
   - Default to English if unsure
   
   Customer Notes:
   - Check customer metadata for language preferences
   - Respect any language preferences noted in customer profile
   - If customer has "speaks Chinese" in notes, use Mandarin
   ```

## 🔧 Step 3: Environment Configuration

Add these to your `.env.local`:

```bash
# Retell AI Configuration
RETELL_API_KEY="retell-api-key-here"
RETELL_AGENT_ID="agent-id-here"
RETELL_RESPONSE_ENGINE_ID="response-engine-id-here"
RETELL_PRIMARY_VOICE_ID="zh-CN-XiaoxiaoNeural"
RETELL_FALLBACK_VOICE_ID="en-US-JennyNeural"

# For multiple languages, you can also configure:
RETELL_CHINESE_VOICE_ID="zh-CN-XiaoxiaoNeural"
RETELL_SPANISH_VOICE_ID="es-ES-ElviraNeural"
RETELL_FRENCH_VOICE_ID="fr-FR-DeniseNeural"
RETELL_GERMAN_VOICE_ID="de-DE-KatjaNeural"
```

## 📚 Step 4: AI System Integration

The AI system (Travis) automatically:

1. **Detects Language Notes**: When a customer has language preferences in their notes
2. **Selects Appropriate Voice**: Uses the correct voice model for calls
3. **Adapts Communication**: Speaks in the customer's preferred language
4. **SMS Language**: Sends SMS in preferred language when possible

### Example Workflow:

1. **Customer Creation**: User adds "speaks Chinese" in notes
2. **AI Call**: Travis calls customer using Chinese voice
3. **Language Detection**: Retell detects Chinese and responds in Mandarin
4. **SMS Follow-up**: Travis sends SMS in Chinese when appropriate

## 🎨 Step 5: Tutorial Integration

### Add to Onboarding:

Update the onboarding tutorial to include:

```markdown
## Multilingual Support

Earlymark supports customers who speak different languages:

### Adding Language Preferences:
1. When creating a new customer, use the **Notes** field
2. Enter language preferences like "speaks Chinese"
3. Travis AI will automatically use the correct language

### Supported Languages:
- Chinese (Mandarin)
- Spanish
- French
- German
- Japanese
- Korean
- Arabic
- And more...

### AI Calls:
- Travis automatically detects customer language
- Uses appropriate voice model
- Speaks in customer's preferred language
```

## 🚀 Step 6: Testing

### Test Multilingual Support:

1. **Create Test Customer**:
   ```
   Message: "New customer Maria Garcia needs electrical work"
   Notes: "speaks Spanish only"
   ```

2. **Test AI Call**:
   - Travis should call with Spanish voice
   - Retell should detect Spanish and respond accordingly

3. **Test SMS**:
   - Travis should send SMS in Spanish when possible

## 📞 Step 7: Voice Configuration

### Retell Voice Setup:

For each language, configure in Retell Dashboard:

1. **Chinese Setup**:
   - Voice: `zh-CN-XiaoxiaoNeural`
   - Language: Chinese (Mandarin)
   - Accent: Neutral

2. **Spanish Setup**:
   - Voice: `es-ES-ElviraNeural`
   - Language: Spanish
   - Accent: Spain

3. **French Setup**:
   - Voice: `fr-FR-DeniseNeural`
   - Language: French
   - Accent: France

## 🔍 Troubleshooting

### Common Issues:

1. **Voice Not Working**:
   - Check Retell API credentials
   - Verify voice ID is correct
   - Ensure Retell agent is configured

2. **Wrong Language**:
   - Check customer notes for language preference
   - Verify Retell language detection settings
   - Update response engine instructions

3. **SMS Language Issues**:
   - SMS may be limited to English
   - Consider using translation services
   - Add language preference to SMS content

### Debug Commands:

```bash
# Check Retell configuration
npm run retell:create-agent

# Test customer creation
# (Use chat interface to create customer with language notes)

# Verify metadata storage
# Check deal metadata for notes field
```

## 📈 Advanced Features

### Dynamic Voice Selection:

You can extend the system to dynamically select voices based on customer notes:

```javascript
// In call-making logic
function getVoiceForCustomer(customerNotes) {
  if (customerNotes?.includes('Chinese')) return 'zh-CN-XiaoxiaoNeural';
  if (customerNotes?.includes('Spanish')) return 'es-ES-ElviraNeural';
  if (customerNotes?.includes('French')) return 'fr-FR-DeniseNeural';
  return 'en-US-JennyNeural'; // Default
}
```

### Translation Integration:

For SMS and written communication:
- Integrate Google Translate API
- Store translation preferences
- Auto-translate important messages

## 🎯 Success Metrics

Track multilingual support effectiveness:
- Customer satisfaction scores by language
- Call completion rates
- SMS response rates
- Support ticket reduction

---

**Need Help?**
- Check Retell AI documentation
- Review customer notes in deal metadata
- Test with different language configurations
- Monitor AI call logs for language detection

**Support**: support@earlymark.com
