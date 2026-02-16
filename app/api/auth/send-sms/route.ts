import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, countryCode } = await request.json();

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
    (globalThis as any).verificationCodes = (globalThis as any).verificationCodes || [];
    (globalThis as any).verificationCodes = (globalThis as any).verificationCodes.filter(
      (code: VerificationCode) => code.expires > Date.now()
    );
    (globalThis as any).verificationCodes.push(codeData);

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
