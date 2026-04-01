export type IntegrationServiceName = "stripe" | "twilio" | "resend" | "livekit" | "auth";

export type EnvRequirement = {
  key: string;
  required: boolean;
  note?: string;
};

export type ServiceReadiness = {
  name: IntegrationServiceName;
  required: string[];
  optional: string[];
  missingRequired: string[];
  presentRequired: string[];
  missingOptional: string[];
  ready: boolean;
};

const SERVICE_REQUIREMENTS: Record<IntegrationServiceName, EnvRequirement[]> = {
  stripe: [
    { key: "STRIPE_SECRET_KEY", required: true },
    { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", required: true },
    { key: "STRIPE_WEBHOOK_SECRET", required: true },
    { key: "STRIPE_PRO_MONTHLY_PRICE_ID", required: true },
    { key: "STRIPE_PRO_YEARLY_PRICE_ID", required: true },
    { key: "NEXT_PUBLIC_APP_URL", required: true, note: "Checkout and webhook redirect consistency" },
  ],
  twilio: [
    { key: "TWILIO_ACCOUNT_SID", required: true },
    { key: "TWILIO_AUTH_TOKEN", required: true },
    { key: "TWILIO_PHONE_NUMBER", required: true },
    { key: "NEXT_PUBLIC_APP_URL", required: true, note: "Webhook target generation" },
    { key: "TWILIO_WHATSAPP_NUMBER", required: false },
    { key: "EARLYMARK_INBOUND_PHONE_NUMBER", required: false },
    { key: "EARLYMARK_INBOUND_PHONE_NUMBERS", required: false },
  ],
  resend: [
    { key: "RESEND_API_KEY", required: true },
    { key: "RESEND_FROM_DOMAIN", required: true },
    { key: "RESEND_WEBHOOK_SECRET", required: true },
    { key: "SUPPORT_EMAIL_FROM", required: false },
    { key: "SUPPORT_EMAIL_TO", required: false },
    { key: "INBOUND_LEAD_DOMAIN", required: false },
  ],
  livekit: [
    { key: "LIVEKIT_URL", required: true },
    { key: "LIVEKIT_API_KEY", required: true },
    { key: "LIVEKIT_API_SECRET", required: true },
    { key: "VOICE_AGENT_WEBHOOK_SECRET", required: true },
    { key: "LIVEKIT_SIP_URI", required: false },
    { key: "LIVEKIT_SIP_TRUNK_ID", required: false },
    { key: "LIVEKIT_SIP_TERMINATION_URI", required: false },
    { key: "NEXT_PUBLIC_APP_URL", required: true, note: "Worker/app routing checks" },
  ],
  auth: [
    { key: "NEXT_PUBLIC_SUPABASE_URL", required: true },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
    { key: "SUPABASE_SERVICE_ROLE_KEY", required: true },
    { key: "DATABASE_URL", required: true },
    { key: "DIRECT_URL", required: true },
    { key: "NEXT_PUBLIC_APP_URL", required: true },
    { key: "GOOGLE_CLIENT_ID", required: false },
    { key: "GOOGLE_CLIENT_SECRET", required: false },
  ],
};

export function getIntegrationRequirements(): Record<IntegrationServiceName, EnvRequirement[]> {
  return SERVICE_REQUIREMENTS;
}

export function getServiceReadiness(
  env: Record<string, string | undefined>,
  service: IntegrationServiceName,
): ServiceReadiness {
  const requirements = SERVICE_REQUIREMENTS[service];
  const required = requirements.filter((item) => item.required).map((item) => item.key);
  const optional = requirements.filter((item) => !item.required).map((item) => item.key);
  const missingRequired = required.filter((key) => !env[key]?.trim());
  const presentRequired = required.filter((key) => !!env[key]?.trim());
  const missingOptional = optional.filter((key) => !env[key]?.trim());

  return {
    name: service,
    required,
    optional,
    missingRequired,
    presentRequired,
    missingOptional,
    ready: missingRequired.length === 0,
  };
}

export function getAllServiceReadiness(env: Record<string, string | undefined>): ServiceReadiness[] {
  return (Object.keys(SERVICE_REQUIREMENTS) as IntegrationServiceName[]).map((service) =>
    getServiceReadiness(env, service),
  );
}

