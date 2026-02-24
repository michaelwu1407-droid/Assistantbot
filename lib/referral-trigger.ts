import { createReferralLink, processReferralConversion } from "@/actions/referral-actions"

export interface TriggerReferralOptions {
  trigger: "onboardingComplete" | "keyActionSuccess" | "purchaseSuccess"
  userId: string
  metadata?: {
    action?: string
    value?: string
    description?: string
  }
}

// Global state to track if modal is already open
let isModalOpen = false

export async function triggerReferral({ trigger, userId, metadata }: TriggerReferralOptions) {
  // Prevent multiple modals from opening
  if (isModalOpen) {
    return { success: false, message: "Referral modal already open" }
  }

  try {
    // Create referral link if it doesn't exist
    await createReferralLink({ userId })

    // Track the trigger event
    console.log(`Referral triggered: ${trigger}`, { userId, metadata })

    // Set modal state
    isModalOpen = true

    // Dispatch custom event to show modal
    const event = new CustomEvent('showReferralModal', {
      detail: { trigger, userId, metadata }
    })
    window.dispatchEvent(event)

    // Reset state after a delay
    setTimeout(() => {
      isModalOpen = false
    }, 100)

    return { success: true }
  } catch (error) {
    console.error("Error triggering referral:", error)
    return { success: false, error: "Failed to trigger referral" }
  }
}

// Helper functions for common triggers
export const referralTriggers = {
  onboardingComplete: (userId: string) => 
    triggerReferral({ trigger: "onboardingComplete", userId }),
    
  keyActionSuccess: (userId: string, action: string, value?: string) => 
    triggerReferral({ 
      trigger: "keyActionSuccess", 
      userId, 
      metadata: { action, value } 
    }),
    
  purchaseSuccess: (userId: string, plan?: string) => 
    triggerReferral({ 
      trigger: "purchaseSuccess", 
      userId, 
      metadata: { action: "purchase", value: plan } 
    }),
}

// Process referral conversion when referred user completes key action
export async function processReferralConversionWithTracking(
  referralCode: string, 
  referredUserId: string, 
  conversionType: "signup" | "purchase" | "key_action"
) {
  try {
    const result = await processReferralConversion(referralCode, referredUserId)
    
    // Track conversion type
    console.log(`Referral conversion: ${conversionType}`, { referralCode, referredUserId })
    
    return result
  } catch (error) {
    console.error("Error processing referral conversion:", error)
    return { success: false, error: "Failed to process conversion" }
  }
}
