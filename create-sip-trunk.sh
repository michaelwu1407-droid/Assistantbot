#!/bin/bash

# Create SIP Trunk on LiveKit Server
# Run this script to create the SIP trunk needed for demo calls

LIVEKIT_URL="https://live.earlymark.ai"
API_KEY="APIAooiVTvuVU3w"
API_SECRET="hFjFKVYTm4C25HipisQUPw7TmY4u1xcTrjRsEDwPP5E"
TWILIO_SID="ACb425950f8b5a5c4a1b8c5a5b5c5a5b5"
TWILIO_TOKEN="[YOUR_TWILIO_AUTH_TOKEN]"
SIP_SERVER="${LIVEKIT_SIP_TERMINATION_URI:-earlymark-outbound.pstn.sydney.twilio.com}"

echo "Creating SIP trunk on LiveKit server..."
echo "Using Twilio SIP server: ${SIP_SERVER}"

curl -X POST "${LIVEKIT_URL}/sip/trunk" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Earlymark Outbound",
    "sip_server": "'${SIP_SERVER}'",
    "username": "'${TWILIO_SID}'",
    "password": "'${TWILIO_TOKEN}'",
    "outbound": true
  }'

echo ""
echo "If successful, copy the returned trunk_id (starts with ST_) and update your LIVEKIT_SIP_TRUNK_ID environment variable."
