export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Optional: Add Logo here later */}
                <div className="relative">
                    {/* Background blob effect for auth cards */}
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 opacity-50 blur-xl transition duration-1000 group-hover:opacity-100 group-hover:duration-200" />
                    <div className="relative">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
