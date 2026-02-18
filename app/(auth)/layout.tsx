export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 relative bg-background">
            {/* Ottorize-style mint glow background */}
            <div className="absolute inset-0 ott-glow -z-10" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] -z-10 rounded-full bg-primary/8 blur-3xl" />
            <div className="w-full max-w-md">
                {children}
            </div>
        </div>
    )
}
