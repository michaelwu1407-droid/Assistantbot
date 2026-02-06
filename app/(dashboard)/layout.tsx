export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full flex-col md:flex-row">
            {/* Sidebar/CommandBar Placeholder */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
