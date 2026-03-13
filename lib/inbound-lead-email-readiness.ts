import * as dns from "node:dns/promises";
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

export type InboundLeadEmailReadiness = {
  ready: boolean;
  domain: string;
  issues: string[];
  dnsMxHosts: string[];
  resendReceivingEnabled: boolean | null;
  resendReceivingRecordStatus: string | null;
};

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
  let dnsMxHosts: string[] = [];
  let resendReceivingEnabled: boolean | null = null;
  let resendReceivingRecordStatus: string | null = null;

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
  }

  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  if (!resendKey) {
    issues.push("RESEND_API_KEY is missing, so inbound email receiving cannot be verified.");
    return {
      ready: false,
      domain,
      issues: Array.from(new Set(issues)),
      dnsMxHosts,
      resendReceivingEnabled,
      resendReceivingRecordStatus,
    };
  }

  try {
    const domains = await listResendDomains(resendKey);
    const exactDomain = domains.find((entry) => entry.name.toLowerCase() === domain) || null;

    if (!exactDomain) {
      issues.push(`Configured inbound domain ${domain} is not configured in Resend.`);
    } else {
      resendReceivingEnabled = exactDomain.capabilities?.receiving === "enabled";
      if (!resendReceivingEnabled) {
        issues.push(`Resend receiving is not enabled for ${domain}.`);
      }

      const detail = await fetchResendDomainDetail(resendKey, exactDomain.id);
      const receivingRecord =
        detail.records?.find((record) => (record.record || "").toLowerCase() === "receiving") ||
        detail.records?.find((record) => isInboundMxHost(record.value || ""));

      resendReceivingRecordStatus = receivingRecord?.status || null;
      if ((receivingRecord?.status || "").toLowerCase() !== "verified") {
        issues.push(`Resend inbound receiving record for ${domain} is not verified.`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Resend verification failure";
    issues.push(`Inbound email receiving verification failed: ${message}`);
  }

  return {
    ready: issues.length === 0,
    domain,
    issues: Array.from(new Set(issues)),
    dnsMxHosts,
    resendReceivingEnabled,
    resendReceivingRecordStatus,
  };
}
