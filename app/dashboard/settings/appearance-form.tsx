"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const appearanceFormSchema = z.object({
    theme: z.enum(["light", "dark", "premium"]),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

const themes = [
    {
        value: "light" as const,
        label: "Light",
        description: "Clean and bright",
        preview: {
            bg: "bg-[#F8FAFC]",
            card: "bg-white",
            cardBorder: "border-[#E2E8F0]",
            text: "bg-[#E2E8F0]",
            accent: "bg-[#00D28B]",
            dot: "bg-[#E2E8F0]",
        },
    },
    {
        value: "dark" as const,
        label: "Dark",
        description: "Easy on the eyes",
        preview: {
            bg: "bg-[#020617]",
            card: "bg-[#0F172A]",
            cardBorder: "border-[#1E293B]",
            text: "bg-slate-600",
            accent: "bg-[#00D28B]",
            dot: "bg-slate-600",
        },
    },
    {
        value: "premium" as const,
        label: "Premium",
        description: "Deep indigo vibes",
        preview: {
            bg: "bg-[#0C0A1D]",
            card: "bg-[#161331]",
            cardBorder: "border-[#2A2456]",
            text: "bg-indigo-700",
            accent: "bg-[#00D28B]",
            dot: "bg-indigo-700",
        },
    },
]

export function AppearanceForm() {
    const { theme, setTheme } = useTheme()

    const form = useForm<AppearanceFormValues>({
        resolver: zodResolver(appearanceFormSchema),
        defaultValues: {
            theme: (theme as "light" | "dark" | "premium") || "light",
        },
    })

    function onSubmit(data: AppearanceFormValues) {
        setTheme(data.theme)
        toast.success("Theme updated successfully")
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                        <FormItem className="space-y-1">
                            <FormLabel>Theme</FormLabel>
                            <FormDescription>
                                Select the theme for the dashboard.
                            </FormDescription>
                            <FormMessage />
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid max-w-lg grid-cols-3 gap-4 pt-2"
                            >
                                {themes.map((t) => (
                                    <FormItem key={t.value}>
                                        <FormLabel className="[&:has([data-state=checked])>div]:border-primary [&:has([data-state=checked])>div]:ring-2 [&:has([data-state=checked])>div]:ring-primary/20 cursor-pointer">
                                            <FormControl>
                                                <RadioGroupItem value={t.value} className="sr-only" />
                                            </FormControl>
                                            <div className="rounded-xl border-2 border-muted p-1.5 hover:border-accent transition-all">
                                                <div className={cn("space-y-2 rounded-lg p-2.5", t.preview.bg)}>
                                                    <div className={cn("space-y-2 rounded-md p-2.5 shadow-sm border", t.preview.card, t.preview.cardBorder)}>
                                                        <div className={cn("h-2 w-3/4 rounded-full", t.preview.accent)} />
                                                        <div className={cn("h-2 w-full rounded-full", t.preview.text)} />
                                                    </div>
                                                    <div className={cn("flex items-center gap-2 rounded-md p-2.5 shadow-sm border", t.preview.card, t.preview.cardBorder)}>
                                                        <div className={cn("h-4 w-4 rounded-full shrink-0", t.preview.dot)} />
                                                        <div className={cn("h-2 w-full rounded-full", t.preview.text)} />
                                                    </div>
                                                    <div className={cn("flex items-center gap-2 rounded-md p-2.5 shadow-sm border", t.preview.card, t.preview.cardBorder)}>
                                                        <div className={cn("h-4 w-4 rounded-full shrink-0", t.preview.dot)} />
                                                        <div className={cn("h-2 w-full rounded-full", t.preview.text)} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-2 pb-1 text-center">
                                                <span className="block text-sm font-medium">{t.label}</span>
                                                <span className="block text-xs text-muted-foreground">{t.description}</span>
                                            </div>
                                        </FormLabel>
                                    </FormItem>
                                ))}
                            </RadioGroup>
                        </FormItem>
                    )}
                />

                <Button type="submit">Update preferences</Button>
            </form>
        </Form>
    )
}
