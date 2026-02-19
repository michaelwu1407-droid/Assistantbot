"use client"

import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { updateWorkspacePipelineSettings, type PipelineHealthSettings } from "@/actions/workspace-actions"
import { useRouter } from "next/navigation"

const schema = z.object({
  followUpDays: z.coerce.number().int().min(1).max(365),
  urgentDays: z.coerce.number().int().min(1).max(365),
}).refine((data) => data.urgentDays >= data.followUpDays, {
  message: "Urgent days must be the same or more than Follow up days.",
  path: ["urgentDays"],
})

type FormValues = z.infer<typeof schema>

interface PipelineHealthFormProps {
  workspaceId: string
  initialSettings: PipelineHealthSettings
}

const DEFAULT_FOLLOW_UP = 7
const DEFAULT_URGENT = 14

export function PipelineHealthForm({ workspaceId, initialSettings }: PipelineHealthFormProps) {
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      followUpDays: initialSettings.followUpDays ?? DEFAULT_FOLLOW_UP,
      urgentDays: initialSettings.urgentDays ?? DEFAULT_URGENT,
    },
  })

  async function onSubmit(data: FormValues) {
    try {
      await updateWorkspacePipelineSettings(workspaceId, {
        followUpDays: data.followUpDays,
        urgentDays: data.urgentDays,
      })
      toast.success("Pipeline health settings saved", {
        description: "Deal cards will use these thresholds for Follow up and Urgent.",
      })
      router.refresh()
    } catch (error) {
      toast.error("Failed to save", {
        description: "Please try again.",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="followUpDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Days until Follow up</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={365} {...field} />
              </FormControl>
              <FormDescription>
                After this many days without activity, a deal is marked &quot;Follow up&quot; on the board.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="urgentDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Days until Urgent</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={365} {...field} />
              </FormControl>
              <FormDescription>
                After this many days without activity, a deal is marked &quot;Urgent&quot;. Must be at least the Follow up value.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save pipeline settings</Button>
      </form>
    </Form>
  )
}
