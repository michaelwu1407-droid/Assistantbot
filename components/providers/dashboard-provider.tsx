"use client"

import React, { createContext, useContext, useState } from "react"

type DashboardMode = "chat" | "advanced"

interface DashboardContextType {
    mode: DashboardMode
    setMode: (mode: DashboardMode) => void
    toggleMode: () => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<DashboardMode>("advanced") // Default to Advanced (CRM) for now as requested

    const toggleMode = () => {
        setMode((prev) => (prev === "chat" ? "advanced" : "chat"))
    }

    return (
        <DashboardContext.Provider value={{ mode, setMode, toggleMode }}>
            {children}
        </DashboardContext.Provider>
    )
}

export function useDashboard() {
    const context = useContext(DashboardContext)
    if (context === undefined) {
        throw new Error("useDashboard must be used within a DashboardProvider")
    }
    return context
}
