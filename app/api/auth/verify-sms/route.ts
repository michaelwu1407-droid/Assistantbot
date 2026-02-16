import { NextRequest, NextResponse } from 'next/server';

interface VerificationCode {
  phone: string;
  code: string;
  timestamp: number;
  expires: number;
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code } = await request.json();

    // Get stored verification codes
    const verificationCodes: VerificationCode[] = (global as any).verificationCodes || [];
    
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
    (global as any).verificationCodes = verificationCodes.filter(
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
