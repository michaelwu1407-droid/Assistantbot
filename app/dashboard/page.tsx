import { redirect } from "next/navigation";

export default function DashboardPage() {
    // For now, redirect to Tradie mode as the default "Hub" experience or show a dashboard
    // redirect("/dashboard/tradie");

    return (
        <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-200">Welcome to the Hub</h2>
                <p className="text-slate-500">Select a module from the sidebar to begin.</p>
            </div>
        </div>
    )
}
