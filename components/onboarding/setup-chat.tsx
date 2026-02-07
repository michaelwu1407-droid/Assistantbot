"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Send, MapPin, Briefcase, Building } from "lucide-react"

type Message = {
    id: string
    role: "assistant" | "user"
    content: string
    type?: "text" | "choice"
    choices?: { label: string; value: string; icon?: React.ElementType }[]
}

export function SetupChat() {
    const router = useRouter()
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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    const handleSend = async () => {
        if (!inputValue.trim()) return

        const userMsg: Message = {
            id: Date.now().toString(),
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
            id: Date.now().toString(),
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
        setIsTyping(false)
        if (step === 0) {
            // Business Name received
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: `Nice to meet you! Are you in Trades or Real Estate?`,
                    type: "choice",
                    choices: [
                        { label: "Trades", value: "TRADES", icon: Briefcase },
                        { label: "Real Estate", value: "REAL_ESTATE", icon: Building }
                    ]
                }
            ])
            setStep(1)
        } else if (step === 1) {
            // Industry received
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: "Got it. Last question: Where are you located? (e.g., Sydney, NSW)",
                    type: "text"
                }
            ])
            setStep(2)
        } else if (step === 2) {
            // Location received
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: "Perfect! I'm setting up your workspace now...",
                    type: "text"
                }
            ])
            setTimeout(() => {
                router.push("/tutorial")
            }, 2000)
        }
    }

    return (
        <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === "user"
                                        ? "bg-slate-900 text-white"
                                        : "bg-white border border-slate-200 text-slate-800 shadow-sm"
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
                            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-1">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
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
                                className="h-auto py-3 px-6 flex flex-col items-center gap-2 hover:border-slate-900 hover:bg-slate-50 transition-all"
                                onClick={() => handleChoice(choice)}
                            >
                                {choice.icon && <choice.icon className="h-6 w-6 text-slate-600" />}
                                <span className="font-medium">{choice.label}</span>
                            </Button>
                        ))}
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
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
                        className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-slate-900"
                        disabled={isTyping || (messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "choice")}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!inputValue.trim() || isTyping || (messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "choice")}
                        className="bg-slate-900 hover:bg-slate-800"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
