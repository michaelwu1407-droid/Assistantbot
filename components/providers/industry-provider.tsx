"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type IndustryType = "TRADES" | "REAL_ESTATE" | null

interface IndustryContextType {
    industry: IndustryType
    setIndustry: (industry: IndustryType) => void
    isLoading: boolean
}

const IndustryContext = createContext<IndustryContextType | undefined>(undefined)

export function IndustryProvider({ children }: { children: React.ReactNode }) {
    const [industry, setIndustryState] = useState<IndustryType>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Hydrate from localStorage on client mount
        const stored = localStorage.getItem("pj_industry_type") as IndustryType
        if (stored) {
            setIndustryState(stored)
        }
        setIsLoading(false)
    }, [])

    const setIndustry = (type: IndustryType) => {
        setIndustryState(type)
        if (type) {
            localStorage.setItem("pj_industry_type", type)
        } else {
            localStorage.removeItem("pj_industry_type")
        }
    }

    return (
        <IndustryContext.Provider value={{ industry, setIndustry, isLoading }}>
            {children}
        </IndustryContext.Provider>
    )
}

export function useIndustry() {
    const context = useContext(IndustryContext)
    if (context === undefined) {
        throw new Error("useIndustry must be used within an IndustryProvider")
    }
    return context
}
