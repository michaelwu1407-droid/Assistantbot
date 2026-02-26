# 📞 Communication System Documentation

## 🎯 **CRITICAL CLARIFICATION - READ THIS FIRST**

### **👥 USER COMMUNICATION CAPABILITIES**

**Your users (the business owners/tradies) have MULTIPLE ways to communicate with their end customers:**

## **🤖 1. AI Agent Communication (Chatbot)**
**Location**: Inbox Tab → Chat with Travis AI

**What users can say to Travis:**
- "Call [customer name] about their job tomorrow"
- "Text [customer name] to confirm the appointment time"  
- "Message [customer name] that I'm running 10 minutes late"
- "Send a reminder to [customer name] about the payment"
- "Call [customer name] and ask if they're available for reschedule"

**AI Agent will:**
- ✅ Use the **provisioned Twilio phone number** (your app's number)
- ✅ Make calls/send texts automatically
- ✅ Log all communications as activities
- ✅ Handle the entire conversation

## **📱 2. Manual Communication (User's Own Number)**
**Location**: Any customer contact card → Call/Text buttons

**What happens when user clicks Call/Text:**
- ✅ **User's personal phone number** is used (NOT the app's Twilio number)
- ✅ Opens user's native phone app (iPhone Phone app, Android dialer, etc.)
- ✅ User talks/texts directly with customer
- ✅ User has full control over the conversation

## **📋 3. Communication Summary**

| Method | Who Talks | Phone Number Used | When to Use |
|--------|------------|-------------------|-------------|
| **AI Agent** | Travis AI | Your App's Twilio Number | Quick requests, automated outreach |
| **Manual** | User (You) | User's Personal Number | Direct conversations, complex discussions |

---

## **🚨 AI AGENT INSTRUCTIONS - DO NOT CONFUSE**

### **✅ CORRECT AI BEHAVIOR:**
When user says "Call John about his job", AI should:
1. Use the **provisioned Twilio number** 
2. Make the call automatically
3. Handle the conversation
4. Log the activity

### **❌ INCORRECT AI BEHAVIOR:**
- Do NOT tell user to "use your own phone"
- Do NOT open user's phone app
- Do NOT use user's personal number
- Do NOT ask user to call manually

### **✅ CORRECT USER INSTRUCTIONS:**
When user wants to use their own number:
1. User goes to customer contact card
2. User clicks "Call" or "Text" button
3. User's phone app opens with their number
4. User communicates directly

### **❌ INCORRECT USER INSTRUCTIONS:**
- Do NOT ask AI to "use my number"
- Do NOT ask AI to "let me call them"
- Do NOT ask AI to "open my phone"

---

## **🇦🇺 Australian Auth & Twilio Configuration**

### **Problem Solved ✅**
Clerk doesn't support Australian phone numbers for SMS authentication. This solution provides multiple workarounds.

### **Solution Overview**

#### **1. Enhanced Authentication UI ✅**
- **Tabbed interface**: Email, Social, Phone options
- **Clear messaging**: Explains Australian phone limitations
- **Graceful fallbacks**: Directs users to working alternatives

#### **2. Email-First Authentication ✅**
- **Primary method**: Email + password
- **Email verification**: Works globally including Australia
- **No phone required**: Complete signup without phone

#### **3. Social Login Integration ✅**
- **Google OAuth**: Full Australian support
- **GitHub OAuth**: Available for developers
- **More providers**: Easy to add (Apple, Microsoft, etc.)

#### **4. Custom SMS Solution ✅**
- **MessageBird integration**: Australian SMS provider
- **Phone verification**: Bypasses Clerk limitations
- **Local validation**: Australian phone number formatting

### **Twilio Live Credentials Setup**

#### **Environment Variables Required:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Live Account SID
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Live Auth Token
RETELL_API_KEY=retell_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Retell API Key
RETELL_AGENT_ID=agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Retell Agent ID
```

#### **Regulatory Bundle Requirements (Error 21631)**
For Australian (+61) numbers, you must complete:
1. **ABN/Identity Verification** in Twilio Console
2. **Australian Regulatory Bundle** setup
3. **Business Address** verification
4. **Compliance documentation** submission

#### **Provisioning Flow:**
1. **Authentication Test** → Verify live credentials
2. **Number Search** → Find AU numbers with SMS + Voice
3. **Number Purchase** → Handle regulatory bundle requirements
4. **SIP Trunk Creation** → For Retell AI integration
5. **Retell Import** → Bind voice agent to number
6. **Welcome SMS** → Send to tradie's mobile

### **Implementation Details**

#### **Files Created/Modified:**
1. **Enhanced Auth Components**:
   - `/components/auth/enhanced-signin.tsx`
   - `/components/auth/enhanced-signup.tsx`
   - `/components/auth/phone-verification.tsx`

2. **API Endpoints**:
   - `/app/api/auth/send-sms/route.ts`
   - `/app/api/auth/verify-sms/route.ts`
   - `/app/api/test-simple-provision/route.ts` (Live testing)

3. **Provisioning Logic**:
   - `/lib/comms-simple.ts` (Live account provisioning)
   - `/lib/twilio.ts` (Master client initialization)

### **Setup Instructions**

#### **1. Clerk Dashboard Configuration**
```
Go to: https://dashboard.clerk.com
→ User & Authentication → Settings
→ Authentication Methods
→ DISABLE "Phone number"
→ KEEP "Email address" ENABLED
→ Social Connections → Enable Google, GitHub
```

#### **2. Twilio Live Setup**
```
1. Upgrade from Trial to Paid account
2. Complete Australian Regulatory Bundle (Error 21631)
3. Add live credentials to Vercel environment
4. Test with /api/test-simple-provision endpoint
```

#### **3. MessageBird Setup (Optional)**
```
1. Sign up: https://www.messagebird.com
2. Get API key: Dashboard → Developers → Access
3. Add to .env.local: MESSAGEBIRD_API_KEY="your-key-here"
4. Australian numbers work perfectly
```

### **Current Status**
- ✅ **Email authentication**: Working globally
- ✅ **Social login**: Google, GitHub available
- ✅ **Phone verification**: MessageBird integration ready
- ✅ **Live Twilio**: Ready for paid account deployment
- ✅ **Regulatory compliance**: Error handling implemented

### **Testing Checklist**
1. **Test email signup**: Should work immediately
2. **Test social login**: Configure Google in Clerk dashboard
3. **Test phone verification**: Add MessageBird API key
4. **Test Twilio provisioning**: Use /api/test-simple-provision
5. **Test user flow**: Complete signup → setup process

---

## **📞 How Manual Communication Works**

### **Call Button Flow:**
1. User clicks "Call" on customer card
2. System opens `tel:[customer-phone]` 
3. User's phone app opens with customer's number
4. User's personal phone number is used
5. User talks directly to customer

### **Text Button Flow:**
1. User clicks "Text" on customer card  
2. System opens `sms:[customer-phone]`
3. User's messaging app opens with customer's number
4. User's personal phone number is used
5. User texts directly to customer

---

## **🎯 USER EXPERIENCE**

### **For Quick/Automated Communication:**
- **Use Travis AI**: "Text Mary about the job tomorrow"
- **Result**: AI sends text using app's Twilio number

### **For Personal/Direct Communication:**
- **Use Call/Text Buttons**: Click on customer contact card
- **Result**: User's phone app opens, user uses their own number

### **Both Methods Are Available:**
- User can choose AI automation OR manual communication
- User can use both for the same customer
- No restrictions on either method

---

## **🔧 Technical Implementation**

### **AI Agent Communication:**
```javascript
// Uses Twilio API with provisioned number
await twilioClient.calls.create({
  from: workspace.twilioPhoneNumber,  // App's number
  to: customer.phone,
  // AI handles the call
});
```

### **Manual Communication:**
```javascript
// Opens user's phone app with their number
window.location.href = `tel:${customer.phone}`;
window.location.href = `sms:${customer.phone}`;
```

---

## **📚 TRAINING FOR AI AGENTS**

### **Key Phrases to Recognize:**
- "Call [customer]" → Use AI agent (Twilio number)
- "Text [customer]" → Use AI agent (Twilio number)  
- "Message [customer]" → Use AI agent (Twilio number)
- "Ask Travis to call" → Use AI agent (Twilio number)

### **When User Wants Manual:**
- User will click Call/Text buttons directly
- User will not ask AI to use their number
- User will not ask AI to open their phone

---

## **⚠️ IMPORTANT REMINDERS**

1. **AI ALWAYS uses Twilio number** for automated calls/texts
2. **User ALWAYS uses their own number** for manual calls/texts
3. **Both methods are available** - user chooses based on preference
4. **Never confuse the two** - they serve different purposes
5. **Document this clearly** to prevent AI agent mistakes

---

## **🎯 Bottom Line**

**Your users have FULL communication flexibility:**
- ✅ **AI Agent**: Automated calls/texts using app's number
- ✅ **Manual**: Direct calls/texts using user's own number  
- ✅ **Both Available**: User can choose either method anytime

**AI agents must understand the difference and use the correct method based on user requests!**
