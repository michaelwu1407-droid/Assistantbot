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
    industry: z.string().min(1, {
        message: "Please select an industry type."
    }),
    location: z.string().optional(),
})

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>

const defaultValues: Partial<WorkspaceFormValues> = {
    name: "My Awesome Business",
    // industry: "TRADES", // Default
}

export function WorkspaceForm() {
    const form = useForm<WorkspaceFormValues>({
        resolver: zodResolver(workspaceFormSchema),
        defaultValues,
    })

    function onSubmit(data: WorkspaceFormValues) {
        toast.success("Workspace updated", {
            description: "Your workspace settings have been saved."
        })
        console.log(data)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Workspace Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Acme Inc." {...field} />
                            </FormControl>
                            <FormDescription>
                                This is the name of your organization visible to clients.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your industry" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="TRADES">Trades & Services</SelectItem>
                                    <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                This helps us tailor your experience.
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
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                                <Input placeholder="Sydney, AU" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">Update workspace</Button>
            </form>
        </Form>
    )
}
