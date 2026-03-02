import { config } from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

config({ path: '.env.local' });

async function generate() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET in livekit-agent/.env.local');
  }

  const identity = process.argv[2] || 'local-test-user';
  const room = process.argv[3] || 'test-room';

  const at = new AccessToken(apiKey, apiSecret, { identity });
  at.addGrant({ roomJoin: true, room });

  const token = await at.toJwt();
  console.log('\n--- LIVEKIT TEST TOKEN ---\n');
  console.log(`identity: ${identity}`);
  console.log(`room: ${room}`);
  console.log(token);
  console.log('\n--------------------------\n');
}

generate().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
