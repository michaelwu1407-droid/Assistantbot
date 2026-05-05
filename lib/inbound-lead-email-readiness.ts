import * as dns from "node:dns/promises";
import { db } from "@/lib/db";
import { resolveInboundLeadDomain } from "@/lib/lead-capture-email";

type ResendDomainSummary = {
  id: string;
  name: string;
  status: string;
  capabilities?: {
    sending?: string;
    receiving?: string;
  } | null;
};

type ResendDomainDetail = ResendDomainSummary & {
  records?: Array<{
    record?: string;
    name?: string;
    value?: string;
    type?: string;
    status?: string;
    priority?: number;
  }>;
};

const RECEIVING_CONFIRMATION_LOOKBACK_DAYS = 14;

export type InboundLeadEmailStage =
  | "reserved"
  | "dns_live"
  | "provider_verified"
  | "receiving_confirmed";

export type InboundLeadEmailReadiness = {
  ready: boolean;
  domain: string;
  issues: string[];
  warnings: string[];
  dnsMxHosts: string[];
  dnsReady: boolean;
  resendDomainStatus: string | null;
  resendReceivingEnabled: boolean | null;
  resendReceivingRecordStatus: string | null;
  providerVerified: boolean;
  receivingConfirmed: boolean;
  stage: InboundLeadEmailStage;
  receivingConfirmationLookbackDays: number;
  recentInboundEmailSuccessCount: number;
  recentInboundEmailFailureCount: number;
  lastInboundEmailSuccessAt: string | null;
  lastInboundEmailFailureAt: string | null;
};

function isVerifiedDomainStatus(status: string | null | undefined) {
  return (status || "").trim().toLowerCase() === "verified";
}

function toIso(value: Date | null | undefined) {
  return value?.toISOString() || null;
}

function buildStage(params: {
  dnsReady: boolean;
  providerVerified: boolean;
  receivingConfirmed: boolean;
}): InboundLeadEmailStage {
  if (params.receivingConfirmed) return "receiving_confirmed";
  if (params.providerVerified) return "provider_verified";
  if (params.dnsReady) return "dns_live";
  return "reserved";
}

async function listResendDomains(apiKey: string): Promise<ResendDomainSummary[]> {
  const response = await fetch("https://api.resend.com/domains", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Resend domains list returned HTTP ${response.status}`);
  }

  const body = await response.json();
  return Array.isArray(body?.data) ? (body.data as ResendDomainSummary[]) : [];
}

async function fetchResendDomainDetail(apiKey: string, domainId: string): Promise<ResendDomainDetail> {
  const response = await fetch(`https://api.resend.com/domains/${domainId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Resend domain detail returned HTTP ${response.status}`);
  }

  return (await response.json()) as ResendDomainDetail;
}

function isInboundMxHost(host: string) {
  return host.toLowerCase().includes("inbound-smtp.");
}

export async function getInboundLeadEmailReadiness(
  configuredDomain = process.env.INBOUND_LEAD_DOMAIN,
): Promise<InboundLeadEmailReadiness> {
  const domain = resolveInboundLeadDomain(configuredDomain).toLowerCase();
  const issues: string[] = [];
  const warnings: string[] = [];
  let dnsMxHosts: string[] = [];
  let dnsReady = false;
  let resendDomainStatus: string | null = null;
  let resendReceivingEnabled: boolean | null = null;
  let resendReceivingRecordStatus: string | null = null;
  let providerVerified = false;
  let recentInboundEmailSuccessCount = 0;
  let recentInboundEmailFailureCount = 0;
  let lastInboundEmailSuccessAt: Date | null = null;
  let lastInboundEmailFailureAt: Date | null = null;

  const inboundEmailEvents = await db.webhookEvent.findMany({
    where: {
      provider: "resend",
      eventType: "email.received",
      createdAt: {
        gte: new Date(Date.now() - RECEIVING_CONFIRMATION_LOOKBACK_DAYS * 24 * 60 * 60 * 1_000),
      },
    },
    select: {
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  for (const event of inboundEmailEvents) {
    if (event.status === "success") {
      recentInboundEmailSuccessCount += 1;
      if (!lastInboundEmailSuccessAt) {
        lastInboundEmailSuccessAt = event.createdAt;
      }
      continue;
    }

    recentInboundEmailFailureCount += 1;
    if (!lastInboundEmailFailureAt) {
      lastInboundEmailFailureAt = event.createdAt;
    }
  }

  try {
    const records = await dns.resolveMx(domain);
    dnsMxHosts = records
      .slice()
      .sort((left, right) => left.priority - right.priority)
      .map((record) => record.exchange.toLowerCase());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MX lookup failure";
    issues.push(`Inbound domain ${domain} has no valid MX record (${message}).`);
  }

  if (dnsMxHosts.length === 0) {
    issues.push(`Inbound domain ${domain} is not accepting email in DNS.`);
  } else if (!dnsMxHosts.some(isInboundMxHost)) {
    issues.push(`Inbound domain ${domain} MX does not point to an inbound mail processor.`);
  } else {
    dnsReady = true;
  }

  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  if (!resendKey) {
    issues.push("RESEND_API_KEY is missing, so inbound email receiving cannot be verified.");
    const receivingConfirmed = recentInboundEmailSuccessCount > 0;
    return {
      ready: false,
      domain,
      issues: Array.from(new Set(issues)),
      warnings: Array.from(new Set(warnings)),
      dnsMxHosts,
      dnsReady,
      resendDomainStatus,
      resendReceivingEnabled,
      resendReceivingRecordStatus,
      providerVerified,
      receivingConfirmed,
      stage: buildStage({ dnsReady, providerVerified, receivingConfirmed }),
      receivingConfirmationLookbackDays: RECEIVING_CONFIRMATION_LOOKBACK_DAYS,
      recentInboundEmailSuccessCount,
      recentInboundEmailFailureCount,
      lastInboundEmailSuccessAt: toIso(lastInboundEmailSuccessAt),
      lastInboundEmailFailureAt: toIso(lastInboundEmailFailureAt),
    };
  }

  try {
    const domains = await listResendDomains(resendKey);
    const exactDomain = domains.find((entry) => entry.name.toLowerCase() === domain) || null;

    if (!exactDomain) {
      issues.push(`Configured inbound domain ${domain} is not configured in Resend.`);
    } else {
      resendDomainStatus = exactDomain.status || null;
      resendReceivingEnabled = exactDomain.capabilities?.receiving === "enabled";
      if (!resendReceivingEnabled) {
        issues.push(`Resend receiving is not enabled for ${domain}.`);
      }

      try {
        const detail = await fetchResendDomainDetail(resendKey, exactDomain.id);
        const receivingRecord =
          detail.records?.find((record) => (record.record || "").toLowerCase() === "receiving") ||
          detail.records?.find((record) => isInboundMxHost(record.value || ""));

        resendReceivingRecordStatus = receivingRecord?.status || null;
        providerVerified =
          resendReceivingEnabled === true &&
          (receivingRecord?.status || "").toLowerCase() === "verified";
        if (!providerVerified) {
          issues.push(`Resend inbound receiving record for ${domain} is not verified.`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Resend verification failure";
        if (message.includes("HTTP 429") && resendReceivingEnabled && isVerifiedDomainStatus(resendDomainStatus)) {
          providerVerified = true;
          resendReceivingRecordStatus = "rate_limited_assumed_verified";
          warnings.push(
            `Resend admin verification is rate-limited: ${message}. Using the verified domain summary for ${domain} for now.`,
          );
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Resend verification failure";
    if (message.includes("HTTP 429")) {
      const recentTrafficSuffix =
        recentInboundEmailSuccessCount > 0
          ? " Recent inbound email traffic has still been observed."
          : "";
      issues.push(`Resend admin verification is rate-limited: ${message}.${recentTrafficSuffix}`);
    } else {
      issues.push(`Resend admin verification failed: ${message}`);
    }
  }

  const receivingConfirmed = recentInboundEmailSuccessCount > 0;

  return {
    ready: issues.length === 0,
    domain,
    issues: Array.from(new Set(issues)),
    warnings: Array.from(new Set(warnings)),
    dnsMxHosts,
    dnsReady,
    resendDomainStatus,
    resendReceivingEnabled,
    resendReceivingRecordStatus,
    providerVerified,
    receivingConfirmed,
    stage: buildStage({ dnsReady, providerVerified, receivingConfirmed }),
    receivingConfirmationLookbackDays: RECEIVING_CONFIRMATION_LOOKBACK_DAYS,
    recentInboundEmailSuccessCount,
    recentInboundEmailFailureCount,
    lastInboundEmailSuccessAt: toIso(lastInboundEmailSuccessAt),
    lastInboundEmailFailureAt: toIso(lastInboundEmailFailureAt),
  };
}
