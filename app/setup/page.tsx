import { SetupChat } from "@/components/onboarding/setup-chat"

export default function SetupPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8 space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Welcome to Pj Buddy</h1>
                <p className="text-slate-600">Let&apos;s personalize your assistant.</p>
            </div>

            <SetupChat />

            <div className="mt-8 text-xs text-slate-400">
                Press Enter to send &bull; All data is secure
            </div>
        </div>
    )
}
