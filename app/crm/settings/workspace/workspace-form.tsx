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

const workspaceFormSchema = z.object({
    name: z.string().min(2, {
        message: "Workspace name must be at least 2 characters.",
    }),
    specialty: z.string().min(1, {
        message: "Please select your specialty."
    }),
    location: z.string().optional(),
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
}

export function WorkspaceForm({ workspaceId, initialData }: WorkspaceFormProps) {
    const router = useRouter()
    const form = useForm<WorkspaceFormValues>({
        resolver: zodResolver(workspaceFormSchema),
        defaultValues: initialData || defaultValues,
    })

    async function onSubmit(data: WorkspaceFormValues) {
        try {
            await updateWorkspace(workspaceId, {
                name: data.name,
                industryType: "TRADES",
                location: data.location,
                tradeType: data.specialty,
            })

            toast.success("Workspace updated", {
                description: "Your workspace settings have been saved."
            })
            router.refresh()
        } catch (error) {
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your specialty" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Plumber">Plumber</SelectItem>
                                    <SelectItem value="Electrician">Electrician</SelectItem>
                                    <SelectItem value="Carpenter">Carpenter</SelectItem>
                                    <SelectItem value="HVAC Technician">HVAC Technician</SelectItem>
                                    <SelectItem value="Painter">Painter</SelectItem>
                                    <SelectItem value="Roofer">Roofer</SelectItem>
                                    <SelectItem value="Handyman">Handyman</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                This should match your onboarding trade selection.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
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
