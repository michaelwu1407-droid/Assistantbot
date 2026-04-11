"use server";

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { BillingInterval, getStripePriceIdForInterval } from "@/lib/billing-plan";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";

function getWorkspaceSettings(settings: unknown): Record<string, unknown> {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        return {};
    }

    return settings as Record<string, unknown>;
}

export async function createCheckoutSession(
    workspaceId: string,
    billingInterval: BillingInterval,
    provisionPhoneNumberRequested: boolean
) {
    const actor = await requireCurrentWorkspaceAccess();
    if (actor.workspaceId !== workspaceId || actor.role === "TEAM_MEMBER") throw new Error("Unauthorized");

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            id: true,
            ownerId: true,
            stripeCustomerId: true,
            settings: true,
        },
    });

    if (!workspace) {
        throw new Error("Unauthorized or Workspace not found");
    }

    const settings = getWorkspaceSettings(workspace.settings);
    const provisioningStatus = provisionPhoneNumberRequested ? "requested" : "not_requested";
    const provisioningRequestedAt = provisionPhoneNumberRequested ? new Date().toISOString() : null;
    await db.workspace.update({
        where: { id: workspaceId },
        data: {
            settings: {
                ...settings,
                provisionPhoneNumberRequested,
                onboardingProvisioningStatus: provisioningStatus,
                onboardingProvisioningError: null,
                onboardingProvisioningUpdatedAt: new Date().toISOString(),
                onboardingProvisioningRequestedAt: provisioningRequestedAt,
            },
        },
    });

    const headersList = await headers();
    const origin = headersList.get("origin") || headersList.get("x-forwarded-host") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const baseUrl = origin.includes("127.0.0.1") ? "http://localhost:3000" : origin;

    const customerId = workspace.stripeCustomerId;

    const priceId = getStripePriceIdForInterval(billingInterval);

    const session = await stripe.checkout.sessions.create({
        metadata: {
            workspace_id: workspaceId,
            referred_user_id: actor.id,
            referral_code: (await cookies()).get("referral_code")?.value || "",
            billing_interval: billingInterval,
        },
        payment_method_types: ["card"],
        billing_address_collection: "auto",
        customer: customerId || undefined,
        allow_promotion_codes: true,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: "subscription",
        client_reference_id: workspaceId,
        success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/billing`,
    });

    if (!session.url) {
        throw new Error("Failed to create Checkout Session");
    }

    redirect(session.url);
}

export async function createCustomerPortalSession(workspaceId: string) {
    const actor = await requireCurrentWorkspaceAccess();
    if (actor.workspaceId !== workspaceId || actor.role === "TEAM_MEMBER") throw new Error("Unauthorized");

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
    });

    if (!workspace || !workspace.stripeCustomerId) {
        throw new Error("Unauthorized or Customer not found");
    }

    const headersList = await headers();
    const origin = headersList.get("origin") || headersList.get("x-forwarded-host") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const baseUrl = origin.includes("127.0.0.1") ? "http://localhost:3000" : origin;

    const session = await stripe.billingPortal.sessions.create({
        customer: workspace.stripeCustomerId,
        return_url: `${baseUrl}/crm/settings`,
    });

    if (!session.url) {
        throw new Error("Failed to create Portal Session");
    }

    redirect(session.url);
}
