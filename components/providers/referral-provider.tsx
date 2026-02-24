"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { ReferralSuccessModal } from "@/components/referral/referral-success-modal"

interface ReferralContextType {
  isOpen: boolean
  trigger: string | null
  userId: string | null
  metadata: any
  openModal: (trigger: string, userId: string, metadata?: any) => void
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
  const [trigger, setTrigger] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<any>(null)

  const openModal = (newTrigger: string, newUserId: string, newMetadata?: any) => {
    setTrigger(newTrigger)
    setUserId(newUserId)
    setMetadata(newMetadata)
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
    const handleShowModal = (event: CustomEvent) => {
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
          trigger={trigger as any}
          userId={userId}
        />
      )}
    </ReferralContext.Provider>
  )
}
