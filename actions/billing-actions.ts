"use server";

import { stripe } from "@/lib/stripe";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function createCheckoutSession(workspaceId: string) {
    const userId = await getAuthUserId();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerId !== userId) {
        throw new Error("Unauthorized or Workspace not found");
    }

    const headersList = await headers();
    const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let customerId = workspace.stripeCustomerId;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        billing_address_collection: "auto",
        customer: customerId || undefined,
        line_items: [
            {
                price: process.env.STRIPE_PRO_PRICE_ID,
                quantity: 1,
            },
        ],
        mode: "subscription",
        client_reference_id: workspaceId,
        success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/billing`,
    });

    if (!session.url) {
        throw new Error("Failed to create Checkout Session");
    }

    redirect(session.url);
}

export async function createCustomerPortalSession(workspaceId: string) {
    const userId = await getAuthUserId();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerId !== userId || !workspace.stripeCustomerId) {
        throw new Error("Unauthorized or Customer not found");
    }

    const headersList = await headers();
    const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
        customer: workspace.stripeCustomerId,
        return_url: `${origin}/dashboard/settings`,
    });

    if (!session.url) {
        throw new Error("Failed to create Portal Session");
    }

    redirect(session.url);
}
