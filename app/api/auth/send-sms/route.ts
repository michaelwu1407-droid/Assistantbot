import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// MessageBird API configuration for Australian SMS
const MESSAGEBIRD_API_KEY = process.env.MESSAGEBIRD_API_KEY;
const MESSAGEBIRD_API_URL = 'https://rest.messagebird.com/messages';

// Type for verification codes
interface VerificationCode {
  phone: string;
  code: string;
  timestamp: number;
  expires: number;
}

declare global {
  var verificationCodes: VerificationCode[] | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    // Cost guard: cap OTP sends to 3/min by IP and 3/min by phone, plus 10/day per phone.
    const ip = getClientIp(request);
    const phoneKey = (phoneNumber || "no-phone").toString();
    const ipRl = await rateLimit(`auth.send-sms.ip:${ip}`, 3, 60_000);
    if (!ipRl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests from this device; try again shortly.' },
        { status: 429, headers: { "Retry-After": String(Math.ceil(ipRl.retryAfterMs / 1000)) } },
      );
    }
    const phoneRl = await rateLimit(`auth.send-sms.phone-min:${phoneKey}`, 3, 60_000);
    if (!phoneRl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests for this number; try again shortly.' },
        { status: 429, headers: { "Retry-After": String(Math.ceil(phoneRl.retryAfterMs / 1000)) } },
      );
    }
    const phoneDailyRl = await rateLimit(`auth.send-sms.phone-day:${phoneKey}`, 10, 24 * 60 * 60_000);
    if (!phoneDailyRl.allowed) {
      return NextResponse.json(
        { error: 'Daily verification limit reached for this number.' },
        { status: 429, headers: { "Retry-After": String(Math.ceil(phoneDailyRl.retryAfterMs / 1000)) } },
      );
    }

    if (!MESSAGEBIRD_API_KEY) {
      return NextResponse.json(
        { error: 'MessageBird not configured' },
        { status: 500 }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code temporarily (use Redis/DB in production)
    const codeData: VerificationCode = {
      phone: phoneNumber,
      code: verificationCode,
      timestamp: Date.now(),
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };

    // Store in global storage
    globalThis.verificationCodes = globalThis.verificationCodes || [];
    globalThis.verificationCodes = globalThis.verificationCodes.filter(
      (code: VerificationCode) => code.expires > Date.now()
    );
    globalThis.verificationCodes.push(codeData);

    // Send SMS via MessageBird
    const messagePayload = {
      recipients: [phoneNumber],
      originator: 'AssistantBot',
      body: `Your verification code is: ${verificationCode}. Valid for 10 minutes.`,
    };

    const response = await fetch(MESSAGEBIRD_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `AccessKey ${MESSAGEBIRD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent' 
    });

  } catch (error) {
    console.error('SMS sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
