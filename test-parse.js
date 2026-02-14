const { parseCommandRegex } = require('./actions/chat-actions.js');

// Test the exact user example
const testMessage = "sally 12pm ymrw broken fan. 200$ 45 wyndham st alexandria";
const result = parseCommandRegex(testMessage);

console.log("Input:", testMessage);
console.log("Parsed result:", JSON.stringify(result, null, 2));

if (result && result.intent === "create_job_natural") {
  console.log("✅ SUCCESS: Parsed as job creation");
  console.log("Client:", result.params.clientName);
  console.log("Work:", result.params.workDescription);
  console.log("Price:", result.params.price);
  console.log("Address:", result.params.address);
  console.log("Schedule:", result.params.schedule);
} else {
  console.log("❌ FAILED: Did not parse as job creation");
}
