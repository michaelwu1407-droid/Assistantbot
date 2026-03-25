import { NextResponse } from 'next/server';
import fs from 'fs';
export async function POST(r: Request) {
    const j = await r.json();
    fs.writeFileSync('tmp-err.log', JSON.stringify(j));
    return NextResponse.json({});
}
