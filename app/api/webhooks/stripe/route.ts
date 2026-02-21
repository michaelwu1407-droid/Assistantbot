import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        console.error("Stripe webhook verification failed:", error.message);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.client_reference_id) {
                    const subscription = await stripe.subscriptions.retrieve(
                        session.subscription as string
                    );

                    await db.workspace.update({
                        where: { id: session.client_reference_id },
                        data: {
                            stripeCustomerId: session.customer as string,
                            stripeSubscriptionId: subscription.id,
                            subscriptionStatus: subscription.status,
                            stripePriceId: subscription.items.data[0].price.id,
                            stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                        },
                    });
                }
                break;
            }

            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
                const subscriptionEvent = event.data.object as Stripe.Subscription;

                // Find the generic workspace using the customer ID
                const workspace = await db.workspace.findUnique({
                    where: { stripeCustomerId: subscriptionEvent.customer as string },
                });

                if (workspace) {
                    await db.workspace.update({
                        where: { id: workspace.id },
                        data: {
                            subscriptionStatus: subscriptionEvent.status,
                            stripePriceId: subscriptionEvent.items.data[0].price.id,
                            stripeCurrentPeriodEnd: new Date((subscriptionEvent as any).current_period_end * 1000),
                        },
                    });
                }
                break;
            }

            default:
                console.log(`Unhandled Stripe event type: ${event.type}`);
        }
    } catch (err: any) {
        console.error("Error handling Stripe event:", err);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}
