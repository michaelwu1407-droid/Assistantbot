"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form" // Assuming these exist, if not I'll need to create them or simpler form
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const profileFormSchema = z.object({
    username: z
        .string()
        .min(2, {
            message: "Username must be at least 2 characters.",
        })
        .max(30, {
            message: "Username must not be longer than 30 characters.",
        }),
    email: z
        .string()
        .email({
            message: "Please select a valid email.",
        }),
    bio: z.string().max(160).min(4),
    urls: z
        .array(
            z.object({
                value: z.string().url({ message: "Please enter a valid URL." }),
            })
        )
        .optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

// This can come from your database or API.
const defaultValues: Partial<ProfileFormValues> = {
    username: "pj_buddy_user",
    email: "user@example.com",
    bio: "I'm a tradie/agent using Pj Buddy to superpower my workflow.",
    urls: [
        { value: "https://pj-buddy.com" },
        { value: "https://twitter.com/pjbuddy" },
    ],
}

import { updateUserProfile } from "@/actions/user-actions"
import { useRouter } from "next/navigation"

interface ProfileFormProps {
    userId?: string
    initialData?: Partial<ProfileFormValues>
}

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
    const router = useRouter()
    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: initialData || defaultValues,
        mode: "onChange",
    })

    async function onSubmit(data: ProfileFormValues) {
        if (!userId) {
            toast.error("User ID missing")
            return
        }

        try {
            const result = await updateUserProfile(userId, {
                username: data.username,
                email: data.email,
                bio: data.bio || undefined,
                urls: data.urls
            })

            if (result.success) {
                toast.success("Profile updated", {
                    description: "Your changes have been saved successfully."
                })
                router.refresh()
            } else {
                toast.error("Failed to update profile", {
                    description: result.error
                })
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input placeholder="shadcn" {...field} />
                            </FormControl>
                            <FormDescription>
                                This is your public display name.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormDescription>
                                You can manage verified email addresses in your{" "}
                                <a href="/examples/forms">email settings</a>.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Tell us a little bit about yourself"
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                You can <span>@mention</span> other users and organizations.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">Update profile</Button>
            </form>
        </Form>
    )
}
