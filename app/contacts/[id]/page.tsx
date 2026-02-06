import { notFound } from "next/navigation"
import { getContact } from "@/actions/contact-actions"
import { getDeals } from "@/actions/deal-actions"
import { getActivities } from "@/actions/activity-actions"
import { ContactHeader } from "@/components/crm/contact-header"
import { ContactTimeline } from "@/components/crm/contact-timeline"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"

interface ContactPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params
  const workspace = await getOrCreateWorkspace("demo-user")
  
  const contact = await getContact(id)
  
  if (!contact) {
    return notFound()
  }

  // Fetch related data in parallel
  const [deals, activities] = await Promise.all([
    getDeals(workspace.id, id),
    getActivities({ contactId: id, workspaceId: workspace.id })
  ])

  return (
    <div className="flex flex-col h-full space-y-6 p-6 overflow-y-auto">
      <ContactHeader contact={contact} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <ContactTimeline activities={activities} deals={deals} />
        </div>
        
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">About</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><span className="font-medium">Email:</span> {contact.email || "N/A"}</p>
              <p><span className="font-medium">Phone:</span> {contact.phone || "N/A"}</p>
              <p><span className="font-medium">Company:</span> {contact.company || "N/A"}</p>
              <p><span className="font-medium">Address:</span> {contact.address || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
