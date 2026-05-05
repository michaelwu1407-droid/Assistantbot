import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { ensureWorkspaceProvisioned } from "@/lib/onboarding-provision";
import { logger } from "@/lib/logging";
import { BillingSuccessState } from "@/components/billing/billing-success-state";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * After Stripe checkout, users are redirected here with a session_id.
 * We verify the session directly with Stripe and update the workspace
 * subscription status immediately, avoiding the race condition where
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
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });

    console.log("[billing/success] Session retrieved:", {
      payment_status: session.payment_status,
      client_reference_id: session.client_reference_id,
      subscription: session.subscription ? "present" : "missing",
    });

    if (
      session.payment_status !== "paid" ||
      !session.client_reference_id ||
      !session.subscription
    ) {
      redirect("/billing");
    }

    const startedAt = Date.now();
    const subscription = session.subscription as import("stripe").Stripe.Subscription;
    const periodEnd = (subscription as any).current_period_end;

    await db.workspace.update({
      where: { id: session.client_reference_id },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        stripePriceId: subscription.items.data[0].price.id,
        ...(periodEnd ? { stripeCurrentPeriodEnd: new Date(periodEnd * 1000) } : {}),
      },
    });

    const workspace = await db.workspace.findUnique({
      where: { id: session.client_reference_id },
      select: { id: true, name: true, ownerId: true },
    });

    if (!workspace) {
      redirect("/billing");
    }

    const owner = workspace.ownerId
      ? await db.user.findUnique({
          where: { id: workspace.ownerId },
          select: { phone: true },
        })
      : null;

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

    console.log("[billing/success] Workspace updated successfully:", session.client_reference_id);

    const title =
      provisionResult.provisioningStatus === "provisioned" ||
      provisionResult.provisioningStatus === "already_provisioned"
        ? "Payment confirmed. Tracey is getting ready."
        : "Payment confirmed. We’re setting up your workspace.";

    const description =
      provisionResult.provisioningStatus === "provisioned" ||
      provisionResult.provisioningStatus === "already_provisioned"
        ? "Your subscription is active and your communication setup is ready. We’ll take you into Earlymark in a moment."
        : provisionResult.provisioningStatus === "not_requested"
          ? "Your subscription is active. You can finish onboarding now and add a dedicated number later from billing or settings."
          : "Your subscription is active. We’re taking you to the next setup step now so you can finish getting Tracey ready.";

    const detail = provisionResult.phoneNumber
      ? `Your Earlymark number is ${provisionResult.phoneNumber}.`
      : null;

    return (
      <BillingSuccessState
        title={title}
        description={description}
        detail={detail}
        nextPath="/auth/next"
      />
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Billing success verification failed:", error);
    redirect("/billing");
  }
}
