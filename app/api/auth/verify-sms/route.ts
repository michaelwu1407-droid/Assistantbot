import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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
    const { phoneNumber, code } = await request.json();

    // Brute-force guard: 5 attempts per 15 min keyed by IP + phone.
    const ip = getClientIp(request);
    const ipPhoneKey = `auth.verify-sms:${ip}:${phoneNumber || "no-phone"}`;
    const rl = await rateLimit(ipPhoneKey, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts; try again later.' },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // Get stored verification codes
    const verificationCodes: VerificationCode[] = globalThis.verificationCodes || [];
    
    // Find matching code
    const matchingCode = verificationCodes.find(
      (vc: VerificationCode) => 
        vc.phone === phoneNumber && 
        vc.code === code && 
        vc.expires > Date.now()
    );

    if (!matchingCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Remove used code
    globalThis.verificationCodes = verificationCodes.filter(
      (vc: VerificationCode) => vc !== matchingCode
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Phone number verified successfully' 
    });

  } catch (error) {
    console.error('SMS verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
