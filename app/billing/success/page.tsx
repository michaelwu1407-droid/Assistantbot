import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";

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
        const userId = await getAuthUserId();

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ["subscription"],
        });

        if (
            session.payment_status === "paid" &&
            session.client_reference_id
        ) {
            const subscription = session.subscription as import("stripe").Stripe.Subscription;

            // Verify the workspace belongs to the authenticated user
            const workspace = await db.workspace.findUnique({
                where: { id: session.client_reference_id },
                select: { ownerId: true },
            });

            if (workspace?.ownerId === userId) {
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
        }
    } catch (error) {
        console.error("Billing success verification failed:", error);
        // Fall through to redirect — the webhook will eventually catch up
    }

    redirect("/dashboard");
}
