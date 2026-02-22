import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import * as Sentry from "@sentry/nextjs";
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
        Sentry.captureException(error, {
            tags: { webhook: "stripe", stage: "verification" },
        });

        // Log the verification failure
        await db.webhookEvent.create({
            data: {
                provider: "stripe",
                eventType: "verification_failed",
                status: "error",
                error: error.message,
            },
        }).catch(() => {}); // Don't fail the response if logging fails

        return new NextResponse("Webhook signature verification failed", { status: 400 });
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

        // Log the successful webhook event
        await db.webhookEvent.create({
            data: {
                provider: "stripe",
                eventType: event.type,
                status: "success",
                payload: JSON.parse(JSON.stringify({ id: event.id, type: event.type })),
            },
        }).catch(() => {});

    } catch (err: any) {
        Sentry.captureException(err, {
            tags: { webhook: "stripe", stage: "processing" },
            extra: { eventType: event.type, eventId: event.id },
        });

        await db.webhookEvent.create({
            data: {
                provider: "stripe",
                eventType: event.type,
                status: "error",
                error: err.message,
            },
        }).catch(() => {});

        return new NextResponse("Internal server error", { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}
