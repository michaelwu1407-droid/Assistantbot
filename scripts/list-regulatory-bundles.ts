import twilio from "twilio";

/**
 * Script: List all Twilio Regulatory Bundles
 *
 * Lists every Regulatory Bundle in your Twilio account so you can
 * programmatically find your ABN/Address bundle SID and attach it
 * to new subaccounts for Australian number compliance.
 *
 * Run with:
 *   npx tsx scripts/list-regulatory-bundles.ts
 *
 * Required env vars:
 *   - TWILIO_ACCOUNT_SID
 *   - TWILIO_AUTH_TOKEN
 *
 * Optional flags (via env):
 *   - BUNDLE_STATUS=twilio-approved   (filter by status)
 *   - BUNDLE_ISO=AU                   (filter by ISO country)
 */

async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = twilio(accountSid, authToken);

  console.log("Fetching Regulatory Bundles...\n");

  const filters: Record<string, string> = {};
  if (process.env.BUNDLE_STATUS) {
    filters.status = process.env.BUNDLE_STATUS;
  }
  if (process.env.BUNDLE_ISO) {
    filters.isoCountry = process.env.BUNDLE_ISO;
  }

  const bundles = await client.numbers.v2.regulatoryCompliance
    .bundles.list(filters);

  if (bundles.length === 0) {
    console.log("No bundles found. Create one at https://console.twilio.com/us1/develop/phone-numbers/regulatory-compliance/bundles");
    return;
  }

  console.log(`Found ${bundles.length} bundle(s):\n`);
  console.log("─".repeat(90));

  for (const bundle of bundles) {
    console.log(`  SID:            ${bundle.sid}`);
    console.log(`  Friendly Name:  ${bundle.friendlyName}`);
    console.log(`  Status:         ${bundle.status}`);
    console.log(`  Regulation SID: ${bundle.regulationSid}`);
    console.log(`  ISO Country:    ${(bundle as any).isoCountry ?? "N/A"}`);
    console.log(`  Valid Until:    ${bundle.validUntil ?? "N/A"}`);
    console.log(`  Created:        ${bundle.dateCreated}`);
    console.log(`  Updated:        ${bundle.dateUpdated}`);
    console.log("─".repeat(90));

    // List the items (documents/addresses) inside each bundle
    try {
      const items = await client.numbers.v2.regulatoryCompliance
        .bundles(bundle.sid)
        .itemAssignments.list();

      if (items.length > 0) {
        console.log(`  Attached Items (${items.length}):`);
        for (const item of items) {
          console.log(`    - SID: ${item.sid}  Object SID: ${item.objectSid}`);
        }
        console.log("─".repeat(90));
      }
    } catch {
      // Some bundle statuses may not allow listing items
    }

    console.log();
  }

  console.log("\nTo attach a bundle to a subaccount's phone number:");
  console.log("  1. Copy the bundle SID above (BUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)");
  console.log("  2. Use it when purchasing numbers via the Twilio API:");
  console.log("     incomingPhoneNumbers.create({ phoneNumber: '+61...', bundleSid: 'BUxxx' })");
}

main().catch((err) => {
  console.error("Failed to list bundles:", err);
  process.exit(1);
});
