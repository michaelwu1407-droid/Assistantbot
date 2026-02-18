"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-full text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap cursor-pointer",
    {
        variants: {
            variant: {
                default: "bg-[#020617] text-white hover:bg-[#0F172A] shadow-md hover:shadow-lg dark:bg-white dark:text-[#020617]",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
                outline: "border border-border bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:bg-transparent dark:text-white dark:border-white/20",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
                mint: "bg-primary text-white hover:bg-mint-600 shadow-md hover:shadow-lg",
            },
            size: {
                default: "h-11 px-6 py-2",
                sm: "h-9 px-4 text-xs",
                lg: "h-12 px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {

        if (asChild) {
            return (
                <Slot
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref}
                    {...props}
                />
            )
        }

        return (
            <motion.button
                ref={ref as React.Ref<HTMLButtonElement>}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(buttonVariants({ variant, size, className }))}
                {...props as HTMLMotionProps<"button">}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
