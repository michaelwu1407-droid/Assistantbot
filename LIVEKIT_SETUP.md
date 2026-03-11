# LiveKit SIP Setup Guide

## Infrastructure Overview
- **LiveKit Server**: Self-hosted (NOT LiveKit Cloud)
- **SIP Flow**: LiveKit SIP trunk → Twilio SIP trunk → Phone network
- **Demo Call Flow**: User form → API → LiveKit SIP → Twilio → Phone
- **Lowest-latency Twilio edge for AU**: use `earlymark-outbound.pstn.sydney.twilio.com`

## Quick Setup Commands

### 1. Access Your LiveKit Server Admin
```bash
# If running locally
http://localhost:7880

# If on remote server
http://your-server-ip:7880
```

### 2. Create SIP Trunk via CLI (if you have access)
```bash
# List existing trunks
livekit-cli sip-trunk list

# Create new outbound trunk
livekit-cli sip-trunk create \
  --name "Earlymark Outbound" \
  --sip-server "earlymark-outbound.pstn.sydney.twilio.com" \
  --username "YOUR_TWILIO_SID" \
  --password "YOUR_TWILIO_AUTH_TOKEN" \
  --outbound

# This will return a trunk ID like: ST_abcdef12345...
```

### 3. Update Environment Variables

**Local (.env.local):**
```bash
LIVEKIT_SIP_TRUNK_ID="ST_YOUR_LIVEKIT_TRUNK_ID"  # NOT the Twilio TK_ ID!
LIVEKIT_SIP_TERMINATION_URI="earlymark-outbound.pstn.sydney.twilio.com"
```

**Vercel Dashboard:**
1. Go to Project → Settings → Environment Variables
2. Update `LIVEKIT_SIP_TRUNK_ID` with your LiveKit trunk ID
3. Set `LIVEKIT_SIP_TERMINATION_URI=earlymark-outbound.pstn.sydney.twilio.com`

## Twilio Console For Lowest Latency

Keep the trunk in place, but point Twilio origination toward your LiveKit ingress through the Sydney edge:

```text
sip:live.earlymark.ai:5060;edge=sydney
```

For outbound termination from LiveKit into Twilio, use:

```text
earlymark-outbound.pstn.sydney.twilio.com
```

## What I Need From You

To set this up for you, I need:

1. **Your LiveKit Server URL/IP**
2. **Admin credentials** (or you can run the CLI commands)
3. **Current SIP trunk list** from your LiveKit server

## Troubleshooting

### Error: "requested sip trunk does not exist"
- Cause: Using Twilio trunk ID (TK_) instead of LiveKit trunk ID (ST_)
- Fix: Get the correct trunk ID from your LiveKit server admin

### Error: "Missing LIVEKIT env vars"  
- Cause: Environment variables not set
- Fix: Update both local .env.local and Vercel environment

## Next Steps

1. **Provide your LiveKit server details** (URL/IP)
2. **Share your current SIP trunk configuration**
3. **I'll help you create the correct trunk ID**

Once you have the correct LiveKit SIP trunk ID, the demo calls will work perfectly!
