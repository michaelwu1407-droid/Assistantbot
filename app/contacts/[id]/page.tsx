import { getContact } from "@/actions/contact-actions"
import { ContactProfile } from "@/components/crm/contact-profile"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContactPage({ params }: PageProps) {
  const { id } = await params

  const contact = await getContact(id)

  if (!contact) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Simple Navbar substitute or Back button */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 mb-6">
        <div className="max-w-4xl mx-auto flex items-center">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <main className="px-6">
        <ContactProfile contact={contact} />

        <div className="max-w-4xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="hidden md:block" />

          <div className="md:col-span-2 -mt-12 h-[600px] overflow-visible">
            <h3 className="font-semibold text-slate-900 mb-4 px-1">Activity & History</h3>
            <ActivityFeedWrapper contactId={contact.id} />
          </div>
        </div>
      </main>
    </div>
  )
}

function ActivityFeedWrapper({ contactId }: { contactId: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full min-h-[500px]">
      <ActivityFeed contactId={contactId} />
    </div>
  )
}
