import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

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

        if (
            session.payment_status === "paid" &&
            session.client_reference_id
        ) {
            const subscription = session.subscription as import("stripe").Stripe.Subscription;

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
                    stripeCurrentPeriodEnd: new Date(
                        (subscription as any).current_period_end * 1000
                    ),
                },
            });
        }
    } catch (error) {
        console.error("Billing success verification failed:", error);
        // Redirect back to /billing so the user can retry — NOT to
        // /dashboard, which would redirect back to /billing creating a loop.
        redirect("/billing");
    }

    redirect("/dashboard");
}
