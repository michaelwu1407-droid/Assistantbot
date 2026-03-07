"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap cursor-pointer",
    {
        variants: {
            variant: {
                default: "bg-primary text-white hover:bg-primary-hover shadow-xs",
                destructive: "bg-red-500 text-white hover:bg-red-600 shadow-xs",
                outline: "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 dark:bg-transparent dark:text-white dark:border-white/20",
                secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300",
                ghost: "bg-transparent text-primary border border-primary hover:bg-primary-muted",
                link: "text-primary underline-offset-4 hover:underline",
                mint: "bg-primary text-white hover:bg-primary-hover shadow-xs",
            },
            size: {
                default: "h-10 px-5 py-2 rounded-md",
                sm: "h-8 px-3 text-xs rounded-md",
                lg: "h-11 px-6 text-base font-semibold rounded-md",
                icon: "h-10 w-10 rounded-md",
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
