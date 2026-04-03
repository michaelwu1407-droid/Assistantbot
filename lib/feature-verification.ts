import type { WebhookDiagnostic } from "@/actions/webhook-actions";
import type { LaunchReadiness } from "@/lib/launch-readiness";

export type VerificationEvidenceStatus = "strong" | "partial" | "missing";
export type FeatureVerificationStatus = "verified" | "watch" | "gap";
export type FeatureReleaseTruth = "marketed" | "beta" | "internal";

export type FeatureVerificationEvidence = {
  status: VerificationEvidenceStatus;
  summary: string;
  lastVerifiedAt: string | null;
};

export type FeatureVerificationItem = {
  key: string;
  feature: string;
  promise: string;
  audience: string;
  owner: string;
  releaseTruth: FeatureReleaseTruth;
  overallStatus: FeatureVerificationStatus;
  trigger: string;
  destination: string;
  behavior: FeatureVerificationEvidence;
  delivery: FeatureVerificationEvidence;
  observability: FeatureVerificationEvidence;
  liveProof: FeatureVerificationEvidence;
  nextReinforcement: string;
  blockers: string[];
};

export type FeatureVerificationReport = {
  checkedAt: string;
  summary: {
    verifiedCount: number;
    watchCount: number;
    gapCount: number;
    marketedWithGapsCount: number;
  };
  items: FeatureVerificationItem[];
};

function evidence(
  status: VerificationEvidenceStatus,
  summary: string,
  lastVerifiedAt: string | null = null,
): FeatureVerificationEvidence {
  return { status, summary, lastVerifiedAt };
}

function deriveOverallStatus(params: {
  behavior: VerificationEvidenceStatus;
  delivery: VerificationEvidenceStatus;
  observability: VerificationEvidenceStatus;
  liveProof: VerificationEvidenceStatus;
}): FeatureVerificationStatus {
  if (
    params.behavior === "missing" ||
    params.delivery === "missing" ||
    (params.observability === "missing" && params.liveProof === "missing")
  ) {
    return "gap";
  }

  if (
    params.behavior === "strong" &&
    params.delivery === "strong" &&
    params.observability === "strong" &&
    params.liveProof !== "missing"
  ) {
    return "verified";
  }

  return "watch";
}

export function buildFeatureVerificationReport(params: {
  launch: LaunchReadiness;
  webhookDiagnostics: WebhookDiagnostic[];
  env?: NodeJS.ProcessEnv;
  checkedAt?: string;
}): FeatureVerificationReport {
  const env = params.env ?? process.env;
  const checkedAt = params.checkedAt ?? new Date().toISOString();
  const resendDiagnostics = params.webhookDiagnostics.find((provider) => provider.provider === "resend") ?? null;
  const supportInbox = env.SUPPORT_EMAIL_TO || "support@earlymark.ai";
  const supportEmailConfigured = Boolean((env.RESEND_API_KEY || "").trim());
  const globalSmsTraffic = params.launch.passiveProduction.sms.recentReplySmsSuccessCount;
  const resendLastSuccess = resendDiagnostics?.lastSuccess ?? null;
  const multilingualCanarySuccess = params.launch.canary.monitor.lastSuccessAt ?? null;

  const whatsappBehavior = evidence(
    "strong",
    "Webhook auth, phone normalization, fallback reply path, and CRM agent handoff are covered in code and tests.",
  );
  const whatsappDelivery = evidence(
    "partial",
    "The assistant can reply via Twilio WhatsApp, but there is no WhatsApp-specific delivery receipt or transcript audit in ops yet.",
  );
  const whatsappObservability = evidence(
    "partial",
    params.launch.communications.sms.status === "healthy"
      ? "Twilio messaging routing is monitored at the channel level, but not specifically for WhatsApp assistant conversations."
      : "Twilio messaging routing is currently degraded, and there is still no WhatsApp-specific success surface.",
  );
  const whatsappLiveProof =
    globalSmsTraffic > 0
      ? evidence(
          "partial",
          "Recent SMS/Twilio reply traffic proves messaging is alive, but it does not isolate WhatsApp assistant usage.",
        )
      : evidence("missing", "No dedicated live proof currently shows the internal WhatsApp assistant completed a real conversation.");

  const feedbackBehavior = evidence(
    "strong",
    "Feedback-like chat prompts are classified into the support lane and covered by regression tests for ticket plus email creation.",
  );
  const feedbackDelivery = supportEmailConfigured
    ? evidence(
        "strong",
        `Chatbot feedback now creates an internal ticket and attempts delivery to ${supportInbox} via Resend.`,
      )
    : evidence(
        "missing",
        "The chatbot support email path depends on RESEND_API_KEY. Without it, feedback only lives in the database.",
      );
  const feedbackObservability = resendLastSuccess
    ? evidence(
        "partial",
        "Resend webhook diagnostics confirm email activity exists, but they do not isolate chatbot-originated feedback deliveries.",
        resendLastSuccess,
      )
    : evidence("missing", "There is no dedicated dashboard row showing the last successful chatbot feedback email delivery.");
  const feedbackLiveProof = resendLastSuccess
    ? evidence(
        "partial",
        "The email provider has recorded recent successes, but there is no end-to-end synthetic proving a chatbot feedback message reached support.",
        resendLastSuccess,
      )
    : evidence("missing", "No live proof currently confirms a chatbot feedback report reached the support inbox end to end.");

  const multilingualBehavior = evidence(
    "strong",
    "Voice prompts and runtime configuration enforce replying in the caller's language, with regression tests around the prompt contract.",
  );
  const multilingualDelivery = evidence(
    "partial",
    "The live voice stack is configured for multilingual STT/TTS, but there is no language-tagged delivery audit for real calls.",
  );
  const multilingualObservability = multilingualCanarySuccess
    ? evidence(
        "partial",
        "Voice canary health is monitored, but the canary does not currently verify non-English turns specifically.",
        multilingualCanarySuccess,
      )
    : evidence("missing", "No multilingual-specific monitor or audit currently shows the last successful translated conversation.");
  const multilingualLiveProof = multilingualCanarySuccess
    ? evidence(
        "partial",
        "The synthetic voice probe proves the voice surface is up, but not that multilingual calls succeeded in production recently.",
        multilingualCanarySuccess,
      )
    : evidence("missing", "No live multilingual conversation proof is currently recorded.");

  const bookingBehavior = evidence(
    "strong",
    "Both scheduled-entry transitions now call the booking confirmation sender and are covered by deal action tests.",
  );
  const bookingDelivery = evidence(
    "partial",
    "Confirmation sending updates deal metadata and activity notes, but there is no dedicated proof surface for every scheduled transition.",
  );
  const bookingObservability = evidence(
    "partial",
    "Activity logs exist after successful sends, but there is no ops rollup showing the last scheduled-trigger confirmation succeeded or failed.",
  );
  const bookingLiveProof = evidence(
    "missing",
    "No synthetic check or dashboard row currently proves a real scheduled transition produced a booking confirmation recently.",
  );

  const portalBehavior = evidence(
    "partial",
    "Signed token generation, the public portal page, and portal status fetching now have direct regression coverage, but there is still no full synthetic exercising provider-backed message delivery into the portal journey.",
  );
  const portalDelivery = evidence(
    "partial",
    "Messages can include a job portal link, and portal opens now create a deduped activity note, but there is still no provider-level proof that a customer actually received and opened a specific portal link end to end.",
  );
  const portalObservability = evidence(
    "partial",
    "Portal opens now create a deduped activity note on the job timeline, but there is no aggregated ops row yet showing the last successful portal open across workspaces.",
  );
  const portalLiveProof = evidence(
    "missing",
    "There is no synthetic or production check proving a customer-specific job portal page rendered successfully recently.",
  );

  const items: FeatureVerificationItem[] = [
    {
      key: "internal-whatsapp-assistant",
      feature: "Internal WhatsApp assistant",
      promise: "Admins and tradies can message the Earlymark WhatsApp number and talk directly to the CRM assistant.",
      audience: "Admin + tradies",
      owner: "CRM assistant + messaging",
      releaseTruth: "beta",
      trigger: "A workspace user sends a WhatsApp message from the personal mobile saved on their Earlymark user profile.",
      destination: "The inbound message is authenticated, handed to the CRM AI agent, and replied to over WhatsApp.",
      behavior: whatsappBehavior,
      delivery: whatsappDelivery,
      observability: whatsappObservability,
      liveProof: whatsappLiveProof,
      nextReinforcement: "Add a WhatsApp-specific success/failure log and a synthetic assistant ping that verifies a full round-trip.",
      blockers: [
        "No WhatsApp-specific delivery receipt surface.",
        "No automated round-trip proof for the assistant channel.",
      ],
      overallStatus: deriveOverallStatus({
        behavior: whatsappBehavior.status,
        delivery: whatsappDelivery.status,
        observability: whatsappObservability.status,
        liveProof: whatsappLiveProof.status,
      }),
    },
    {
      key: "chatbot-feedback-escalation",
      feature: "Chatbot feedback reaches support",
      promise: "When a user gives product feedback in chat, it becomes a support ticket and reaches the monitored support inbox.",
      audience: "Admin + tradies",
      owner: "Chatbot + support ops",
      releaseTruth: "marketed",
      trigger: "A user types obvious feedback, suggestion, complaint, or feature-request language into the internal chatbot.",
      destination: "The app creates an internal activity ticket and emails the support inbox for follow-up.",
      behavior: feedbackBehavior,
      delivery: feedbackDelivery,
      observability: feedbackObservability,
      liveProof: feedbackLiveProof,
      nextReinforcement: "Record a dedicated 'chatbot feedback delivered' event with the provider message id and last success timestamp.",
      blockers: feedbackDelivery.status === "missing"
        ? ["Support email delivery depends on Resend configuration.", "No dedicated feedback-delivery monitor exists yet."]
        : ["No dedicated feedback-delivery monitor exists yet."],
      overallStatus: deriveOverallStatus({
        behavior: feedbackBehavior.status,
        delivery: feedbackDelivery.status,
        observability: feedbackObservability.status,
        liveProof: feedbackLiveProof.status,
      }),
    },
    {
      key: "multilingual-voice-calls",
      feature: "Multilingual Tracey calls",
      promise: "Tracey can continue the phone conversation in the caller's language.",
      audience: "End customers on calls",
      owner: "Voice runtime",
      releaseTruth: "marketed",
      trigger: "An inbound caller speaks to Tracey in a non-English language.",
      destination: "The voice stack detects the caller language and replies in that language during the call.",
      behavior: multilingualBehavior,
      delivery: multilingualDelivery,
      observability: multilingualObservability,
      liveProof: multilingualLiveProof,
      nextReinforcement: "Add a multilingual voice probe and capture detected language on completed voice call audits.",
      blockers: [
        "No multilingual-specific canary exists.",
        "The onboarding multilingual toggle is still preference data, not a runtime switch.",
      ],
      overallStatus: deriveOverallStatus({
        behavior: multilingualBehavior.status,
        delivery: multilingualDelivery.status,
        observability: multilingualObservability.status,
        liveProof: multilingualLiveProof.status,
      }),
    },
    {
      key: "scheduled-booking-confirmation",
      feature: "Booking confirmation on schedule",
      promise: "When a job enters Scheduled, the customer automatically gets the booking confirmation.",
      audience: "End customers on scheduled jobs",
      owner: "Deals + messaging",
      releaseTruth: "marketed",
      trigger: "A deal transitions into the Scheduled stage through kanban drag/drop or direct deal editing.",
      destination: "The scheduled transition fires the confirmation sender and logs the outcome on the deal timeline.",
      behavior: bookingBehavior,
      delivery: bookingDelivery,
      observability: bookingObservability,
      liveProof: bookingLiveProof,
      nextReinforcement: "Add a scheduled-confirmation monitor that records the last successful fire and the last failed attempt.",
      blockers: [
        "No scheduled-confirmation success metric exists in ops.",
        "No synthetic schedule-transition proof currently runs.",
      ],
      overallStatus: deriveOverallStatus({
        behavior: bookingBehavior.status,
        delivery: bookingDelivery.status,
        observability: bookingObservability.status,
        liveProof: bookingLiveProof.status,
      }),
    },
    {
      key: "public-job-portal",
      feature: "Public job-status portal",
      promise: "Customers can open their portal link and see the current status of their specific job.",
      audience: "End customers with portal links",
      owner: "Messaging + portal",
      releaseTruth: "beta",
      trigger: "A message includes the signed portal link and the customer opens it.",
      destination: "The token is verified and the portal renders the job title, schedule, and current status.",
      behavior: portalBehavior,
      delivery: portalDelivery,
      observability: portalObservability,
      liveProof: portalLiveProof,
      nextReinforcement: "Audit portal opens plus add a smoke test that exercises token creation, page render, and status fetch.",
      blockers: [
        "No portal-open audit trail exists.",
        "No live or synthetic proof currently exercises the portal end to end.",
      ],
      overallStatus: deriveOverallStatus({
        behavior: portalBehavior.status,
        delivery: portalDelivery.status,
        observability: portalObservability.status,
        liveProof: portalLiveProof.status,
      }),
    },
  ];

  return {
    checkedAt,
    summary: {
      verifiedCount: items.filter((item) => item.overallStatus === "verified").length,
      watchCount: items.filter((item) => item.overallStatus === "watch").length,
      gapCount: items.filter((item) => item.overallStatus === "gap").length,
      marketedWithGapsCount: items.filter(
        (item) => item.releaseTruth === "marketed" && item.overallStatus !== "verified",
      ).length,
    },
    items,
  };
}
