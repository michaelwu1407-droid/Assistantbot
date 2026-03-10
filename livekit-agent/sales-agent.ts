import { runVoiceWorker } from "./worker-entry";

runVoiceWorker({
  workerRole: "tracey-sales-agent",
  surfaces: ["demo", "inbound_demo"],
});
