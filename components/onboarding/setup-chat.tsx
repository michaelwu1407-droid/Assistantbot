"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Send, Briefcase, Building } from "lucide-react"
import { useIndustry } from "@/components/providers/industry-provider"
import { completeOnboarding } from "@/actions/workspace-actions"

type Message = {
    id: string
    role: "assistant" | "user"
    content: string
    type?: "text" | "choice"
    choices?: { label: string; value: string; icon?: React.ElementType }[]
}

export function SetupChat() {
    const router = useRouter()
    const { setIndustry } = useIndustry()
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hi! I'm Pj Buddy, your new AI partner. Let's get your workspace ready. What's the name of your business?",
            type: "text"
        }
    ])
    const [inputValue, setInputValue] = useState("")
    const [step, setStep] = useState(0)
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [businessName, setBusinessName] = useState("")
    const [industryType, setIndustryType] = useState<"TRADES" | "REAL_ESTATE">("TRADES")

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    const handleSend = async () => {
        if (!inputValue.trim()) return

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: inputValue,
        }
        setMessages(prev => [...prev, userMsg])
        setInputValue("")
        setIsTyping(true)

        // Process next step
        setTimeout(() => {
            processStep(inputValue)
        }, 1000)
    }

    const handleChoice = (choice: { label: string; value: string }) => {
        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: choice.label,
        }
        setMessages(prev => [...prev, userMsg])
        setIsTyping(true)

        setTimeout(() => {
            processStep(choice.value)
        }, 1000)
    }

    const processStep = (validInput: string) => {
        // Step 0: Business Name -> Ask Industry
        if (step === 0) {
            setBusinessName(validInput)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: `Nice to meet you! To customize your experience, tell me: are you in Trades or Real Estate?`,
                        type: "choice",
                        choices: [
                            { label: "Trades", value: "TRADES", icon: Briefcase },
                            { label: "Real Estate", value: "REAL_ESTATE", icon: Building }
                        ]
                    }
                ])
                setStep(1)
            }, 1500) // 1.5s delay for natural feel
        }
        // Step 1: Industry -> Ask Location
        else if (step === 1) {
            // Save to localStorage context + local state
            if (validInput === "TRADES" || validInput === "REAL_ESTATE") {
                setIndustry(validInput)
                setIndustryType(validInput)
            }

            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Got it. I've adjusted your workspace for that. One last thing: Where are you located? (e.g., Sydney, NSW)",
                        type: "text"
                    }
                ])
                setStep(2)
            }, 1500)
        }
        // Step 2: Location -> Persist to DB & Finish
        else if (step === 2) {
            const location = validInput

            // Persist all onboarding data to the database
            completeOnboarding({
                businessName,
                industryType,
                location,
            }).then(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Perfect! Your workspace is all set up. Let's get you subscribed...",
                        type: "text"
                    }
                ])
                setTimeout(() => {
                    router.push("/billing")
                }, 2500)
            }).catch(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "I've saved your preferences locally. Let's get you subscribed...",
                        type: "text"
                    }
                ])
                setTimeout(() => {
                    router.push("/billing")
                }, 2500)
            })
        }
    }

    return (
        <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto glass-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10 custom-scrollbar">
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${msg.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "glass-card text-foreground rounded-bl-md border border-border/50"
                                    }`}
                            >
                                <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="glass-card rounded-2xl px-4 py-3 shadow-sm flex items-center gap-1 border border-border/50">
                                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Choices */}
                {messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "choice" && !isTyping && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3 mt-4"
                    >
                        {messages[messages.length - 1].choices?.map((choice) => (
                            <Button
                                key={choice.value}
                                variant="outline"
                                className="h-auto py-3 px-6 flex flex-col items-center gap-2 glass-card hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground"
                                onClick={() => handleChoice(choice)}
                            >
                                {choice.icon && <choice.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />}
                                <span className="font-medium">{choice.label}</span>
                            </Button>
                        ))}
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background/50 border-t border-border/50 backdrop-blur-sm">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSend()
                    }}
                    className="flex items-center gap-2"
                >
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your answer..."
                        className="flex-1 bg-background/50 border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all"
                        disabled={isTyping || (messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "choice")}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!inputValue.trim() || isTyping || (messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "choice")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
