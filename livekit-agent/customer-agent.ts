import { runVoiceWorker } from "./worker-entry";

runVoiceWorker({
  workerRole: "tracey-customer-agent",
  surfaces: ["normal"],
});
