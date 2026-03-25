"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { ReferralSuccessModal } from "@/components/referral/referral-success-modal"

type ReferralTrigger = "onboarding" | "purchase" | "keyAction"

interface ReferralContextType {
  isOpen: boolean
  trigger: ReferralTrigger | null
  userId: string | null
  metadata: Record<string, unknown> | null
  openModal: (trigger: ReferralTrigger, userId: string, metadata?: Record<string, unknown>) => void
  closeModal: () => void
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined)

export function useReferral() {
  const context = useContext(ReferralContext)
  if (context === undefined) {
    throw new Error("useReferral must be used within a ReferralProvider")
  }
  return context
}

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [trigger, setTrigger] = useState<ReferralTrigger | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null)

  const openModal = (newTrigger: ReferralTrigger, newUserId: string, newMetadata?: Record<string, unknown>) => {
    setTrigger(newTrigger)
    setUserId(newUserId)
    setMetadata(newMetadata ?? null)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setTrigger(null)
    setUserId(null)
    setMetadata(null)
  }

  // Listen for custom events
  useEffect(() => {
    const handleShowModal = (event: CustomEvent<{ trigger: ReferralTrigger; userId: string; metadata?: Record<string, unknown> }>) => {
      const { trigger: eventTrigger, userId: eventUserId, metadata: eventMetadata } = event.detail
      openModal(eventTrigger, eventUserId, eventMetadata)
    }

    window.addEventListener('showReferralModal', handleShowModal as EventListener)
    
    return () => {
      window.removeEventListener('showReferralModal', handleShowModal as EventListener)
    }
  }, [])

  return (
    <ReferralContext.Provider value={{ isOpen, trigger, userId, metadata, openModal, closeModal }}>
      {children}
      {isOpen && userId && (
        <ReferralSuccessModal
          isOpen={isOpen}
          onClose={closeModal}
          trigger={trigger ?? "keyAction"}
          userId={userId}
        />
      )}
    </ReferralContext.Provider>
  )
}
