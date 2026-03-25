"use client";

import { useState } from "react";
import { Plus, Trash2, File, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addDocument, deleteDocument, getUploadToken } from "@/actions/document-actions";
import { toast } from "sonner";

interface BusinessDocument {
    id: string;
    name: string;
    description: string;
    fileUrl: string;
    fileType: string | null;
}

export function AttachmentLibrarySection({ documents: initialDocuments }: { documents: BusinessDocument[] }) {
    const [docs, setDocs] = useState<BusinessDocument[]>(initialDocuments);
    const [isUploading, setIsUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    async function handleUpload() {
        if (!file || !name || !description) {
            toast.error("Please provide a file, name, and AI description.");
            return;
        }

        try {
            setIsUploading(true);

            // 1. Get pre-signed URL to upload directly to Supabase Storage
            const tokenRes = await getUploadToken(file.name);
            if (!tokenRes.success || !tokenRes.signedUrl || !tokenRes.path) {
                throw new Error(tokenRes.error || "Failed to initiate upload");
            }

            // 2. Upload file
            const uploadRes = await fetch(tokenRes.signedUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            });

            if (!uploadRes.ok) {
                throw new Error("Failed to upload file to storage bucket");
            }

            // 3. Save to database
            const saveRes = await addDocument({
                name,
                description,
                path: tokenRes.path,
                fileType: file.type,
                fileSize: file.size,
            });

            if (saveRes.success && saveRes.doc) {
                toast.success("Document added to AI Knowledge Base");
                setDocs([saveRes.doc, ...docs]);
                setFile(null);
                setName("");
                setDescription("");
            } else {
                throw new Error("Failed to save to database");
            }
        } catch (err: unknown) {
            console.error(err);
            toast.error("Upload failed: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsUploading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Remove this document from the AI library?")) return;
        try {
            await deleteDocument(id);
            setDocs(docs.filter(d => d.id !== id));
            toast.success("Document removed");
        } catch {
            toast.error("Could not remove document");
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                    <h5 className="text-sm font-medium text-slate-800 dark:text-slate-200">Upload New Attachment</h5>
                    <p className="text-xs text-slate-500 mb-4">
                        Give the AI context on what this file is so it knows exactly when to send it to customers.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Document Name</Label>
                        <Input
                            placeholder="e.g. 2026 Price Guide"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isUploading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>File Upload (PDF, Word, etc.)</Label>
                        <Input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            disabled={isUploading}
                            accept=".pdf,.doc,.docx,.jpg,.png"
                        />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label>AI Instructions (Description)</Label>
                        <Textarea
                            className="resize-none"
                            placeholder="Explain to the AI when it should send this document..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isUploading}
                            rows={2}
                        />
                        <p className="text-[11px] text-slate-400">
                            Example: &quot;Send this file whenever a customer asks about our Standard Pricing or Call-out fees.&quot;
                        </p>
                    </div>
                </div>

                <Button onClick={handleUpload} disabled={isUploading || !file || !name || !description}>
                    {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Upload & Train AI
                </Button>
            </div>

            <div className="space-y-3">
                {docs.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 text-sm">
                        No documents in your library yet.
                    </div>
                ) : (
                    docs.map(doc => (
                        <div key={doc.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950">
                            <div className="flex gap-3">
                                <div className="bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg shrink-0 h-fit">
                                    <File className="w-5 h-5" />
                                </div>
                                <div>
                                    <h6 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        {doc.name}
                                    </h6>
                                    <p className="text-xs text-slate-500 mt-1 italic">
                                        <span className="font-medium text-slate-600 dark:text-slate-400">AI Rules: </span>
                                        {doc.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" asChild>
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                        View
                                    </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(doc.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
