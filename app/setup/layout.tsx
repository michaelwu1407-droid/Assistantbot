import { Toaster } from "@/components/ui/sonner"

export default function SetupLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
