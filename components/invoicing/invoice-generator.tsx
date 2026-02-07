"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Printer, Mail, Share2, FileText } from "lucide-react"
import { toast } from "sonner"
import { generateQuotePDF } from "@/actions/tradie-actions"

interface InvoiceGeneratorProps {
    invoiceId: string
    invoiceNumber: string
}

export function InvoiceGenerator({ invoiceId, invoiceNumber }: InvoiceGeneratorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [htmlContent, setHtmlContent] = useState<string | null>(null)

    const handleOpen = async () => {
        setIsOpen(true)
        setIsLoading(true)
        try {
            const result = await generateQuotePDF(invoiceId)
            if (result.success && result.html) {
                setHtmlContent(result.html)
            } else {
                toast.error("Failed to load invoice preview")
                setIsOpen(false)
            }
        } catch (e) {
            toast.error("Error generating invoice")
            setIsOpen(false)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePrint = () => {
        if (!htmlContent) return

        // Create a hidden iframe to print
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        document.body.appendChild(iframe)

        const doc = iframe.contentWindow?.document
        if (doc) {
            doc.open()
            doc.write(htmlContent)
            doc.close()

            // Wait for resources to load then print
            iframe.contentWindow?.focus()
            setTimeout(() => {
                iframe.contentWindow?.print()
                document.body.removeChild(iframe)
            }, 500)
        }
    }

    const handleEmail = () => {
        toast.success("Email sent to client (Mock)")
        setIsOpen(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button variant="outline" size="sm" onClick={handleOpen}>
                <FileText className="mr-2 h-4 w-4" />
                View / Print
            </Button>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Invoice {invoiceNumber}</DialogTitle>
                    <DialogDescription>
                        Preview and send invoice to client.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 bg-slate-100 rounded-md border p-4 overflow-hidden relative">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                        </div>
                    ) : htmlContent ? (
                        <iframe
                            srcDoc={htmlContent}
                            className="w-full h-full bg-white shadow-sm"
                            title="Invoice Preview"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            Failed to load preview
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handlePrint} disabled={!htmlContent}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print / PDF
                    </Button>
                    <Button onClick={handleEmail} disabled={!htmlContent}>
                        <Mail className="mr-2 h-4 w-4" />
                        Email Client
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
