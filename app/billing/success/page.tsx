import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { ensureWorkspaceProvisioned } from "@/lib/onboarding-provision";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * After Stripe checkout, users are redirected here with a session_id.
 * We verify the session directly with Stripe and update the workspace
 * subscription status immediately — avoiding the race condition where
 * the webhook hasn't fired yet when the user lands back on the app.
 */
export default async function BillingSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>;
}) {
    const { session_id } = await searchParams;

    if (!session_id) {
        redirect("/billing");
    }

    try {
        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ["subscription"],
        });

        console.log("[billing/success] Session retrieved:", {
            payment_status: session.payment_status,
            client_reference_id: session.client_reference_id,
            subscription: session.subscription ? "present" : "missing",
        });

        if (
            session.payment_status === "paid" &&
            session.client_reference_id
        ) {
            const startedAt = Date.now();
            const subscription = session.subscription as import("stripe").Stripe.Subscription;

            // Safely extract current_period_end — field name varies by Stripe API version
            const periodEnd = (subscription as any).current_period_end;

            // The client_reference_id is the workspace ID — set by our own
            // createCheckoutSession() which already validated ownership.
            // Update the workspace directly without an additional ownership
            // check, since a user can only reach this page via a checkout
            // session that was scoped to their workspace.
            await db.workspace.update({
                where: { id: session.client_reference_id },
                data: {
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: subscription.id,
                    subscriptionStatus: subscription.status,
                    stripePriceId: subscription.items.data[0].price.id,
                    ...(periodEnd
                        ? { stripeCurrentPeriodEnd: new Date(periodEnd * 1000) }
                        : {}),
                },
            });

            const workspace = await db.workspace.findUnique({
                where: { id: session.client_reference_id },
                select: { id: true, name: true, ownerId: true },
            });
            const owner = workspace?.ownerId
                ? await db.user.findUnique({
                    where: { id: workspace.ownerId },
                    select: { phone: true },
                })
                : null;

            if (workspace) {
                const provisionResult = await ensureWorkspaceProvisioned({
                    workspaceId: workspace.id,
                    businessName: workspace.name,
                    ownerPhone: owner?.phone,
                    triggerSource: "billing-success",
                });

                logger.info("ONBOARDING PROVISION: Billing success triggered provisioning", {
                    workspaceId: workspace.id,
                    paymentStatus: session.payment_status,
                    provisioningStatus: provisionResult.provisioningStatus,
                    elapsedMs: provisionResult.elapsedMs,
                    totalPageMs: Date.now() - startedAt,
                    phoneNumber: provisionResult.phoneNumber,
                });
            }

            console.log("[billing/success] Workspace updated successfully:", session.client_reference_id);
        }
    } catch (error) {
        console.error("Billing success verification failed:", error);
        // Redirect back to /billing so the user can retry — NOT to
        // /dashboard, which would redirect back to /billing creating a loop.
        redirect("/billing");
    }

    redirect("/auth/next");
}
