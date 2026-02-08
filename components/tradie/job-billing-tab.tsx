"use client";

import { useState } from "react";
import { SignaturePad } from "./signature-pad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle } from "lucide-react";

export function JobBillingTab() {
    const [signature, setSignature] = useState<string | null>(null);
    const [invoiceSent, setInvoiceSent] = useState(false);

    const handleSignatureSave = (dataUrl: string) => {
        setSignature(dataUrl);
    };

    const handleSendInvoice = () => {
        setInvoiceSent(true);
        // In a real app, this would call a server action
    };

    if (invoiceSent) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center text-green-800 space-y-4">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold">Invoice Sent!</h3>
                    <p>The client has received the invoice via email and SMS.</p>
                    <Button variant="outline" className="bg-white" onClick={() => setInvoiceSent(false)}>
                        Send Another
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Sign Off</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Please ask the client to sign below to confirm the work is complete.
                    </p>

                    {signature ? (
                        <div className="border rounded-lg p-4 bg-slate-50 relative">
                            <img src={signature} alt="Client Signature" className="max-h-32 mx-auto" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setSignature(null)}
                            >
                                Clear
                            </Button>
                        </div>
                    ) : (
                        <SignaturePad onSave={handleSignatureSave} />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button
                        className="w-full h-12 text-lg"
                        size="lg"
                        disabled={!signature}
                        onClick={handleSendInvoice}
                    >
                        <FileText className="mr-2 h-5 w-5" />
                        Generate & Send Invoice
                    </Button>
                    {!signature && (
                        <p className="text-xs text-center text-red-400 mt-2">
                            Signature required to send invoice
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
