"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

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
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"

const SPECIALTY_OPTIONS = [
    "Plumber",
    "Electrician",
    "Carpenter",
    "HVAC Technician",
    "Locksmith",
    "Painter",
    "Roofer",
    "Tiler",
    "Landscaper",
    "Pest Control",
    "Cleaner",
    "Handyman",
] as const

const OTHER_SPECIALTY_VALUE = "__other__"

const workspaceFormSchema = z.object({
    name: z.string().min(2, {
        message: "Workspace name must be at least 2 characters.",
    }),
    specialty: z.string().min(1, {
        message: "Please select your specialty."
    }),
    customSpecialty: z.string().optional(),
    location: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.specialty === OTHER_SPECIALTY_VALUE && !data.customSpecialty?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter your specialty.",
            path: ["customSpecialty"],
        })
    }
})

import { updateWorkspace } from "@/actions/workspace-actions"
import { useRouter } from "next/navigation"

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>

// Accept initial data
interface WorkspaceFormProps {
    workspaceId: string
    initialData?: Partial<WorkspaceFormValues>
}

// Default fallback
const defaultValues: Partial<WorkspaceFormValues> = {
    name: "My Awesome Business",
    specialty: "Plumber",
    customSpecialty: "",
}

export function WorkspaceForm({ workspaceId, initialData }: WorkspaceFormProps) {
    const router = useRouter()
    const initialSpecialty = (initialData?.specialty || defaultValues.specialty || "Plumber").trim()
    const usesPresetSpecialty = SPECIALTY_OPTIONS.includes(initialSpecialty as (typeof SPECIALTY_OPTIONS)[number])
    const initialValues: Partial<WorkspaceFormValues> = {
        name: initialData?.name ?? defaultValues.name,
        specialty: usesPresetSpecialty ? initialSpecialty : OTHER_SPECIALTY_VALUE,
        customSpecialty: usesPresetSpecialty ? "" : initialSpecialty,
        location: initialData?.location ?? defaultValues.location,
    }
    const form = useForm<WorkspaceFormValues>({
        resolver: zodResolver(workspaceFormSchema),
        defaultValues: initialValues,
    })
    const selectedSpecialty = form.watch("specialty")

    async function onSubmit(data: WorkspaceFormValues) {
        try {
            const resolvedSpecialty = data.specialty === OTHER_SPECIALTY_VALUE ? data.customSpecialty?.trim() || "" : data.specialty
            await updateWorkspace(workspaceId, {
                name: data.name,
                industryType: "TRADES",
                location: data.location,
                tradeType: resolvedSpecialty,
            })

            toast.success("Workspace updated", {
                description: "Your workspace settings have been saved."
            })
            router.refresh()
        } catch {
            toast.error("Something went wrong", {
                description: "Failed to update workspace. Please try again."
            })
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Business Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Acme Plumbing" {...field} />
                            </FormControl>
                            <FormDescription>
                                Your AI agent uses this when texting, calling, and emailing customers.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Specialty</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your specialty" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {SPECIALTY_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                    <SelectItem value={OTHER_SPECIALTY_VALUE}>Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                This should match your onboarding trade selection.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {selectedSpecialty === OTHER_SPECIALTY_VALUE && (
                    <FormField
                        control={form.control}
                        name="customSpecialty"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Specialty</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Glazier" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormDescription>
                                    Enter the trade or specialty you want Tracey to use.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Service Area</FormLabel>
                            <FormControl>
                                <Input placeholder="Sydney, AU" {...field} />
                            </FormControl>
                            <FormDescription>
                                Used for smart scheduling and geolocation routing.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">Update workspace</Button>
            </form>
        </Form>
    )
}
