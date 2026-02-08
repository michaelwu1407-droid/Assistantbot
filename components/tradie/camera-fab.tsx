"use client"

import { useState, useRef } from "react"
import { Camera, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUploadUrl, getPublicUrl } from "@/actions/storage-actions"
import { saveJobPhoto } from "@/actions/tradie-actions"
import { toast } from "sonner"

interface CameraFABProps {
    dealId: string
    onPhotoUploaded?: () => void
}

export function CameraFAB({ dealId, onPhotoUploaded }: CameraFABProps) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // 1. Get signed URL
            const { signedUrl, path, error } = await getUploadUrl(file.name)
            if (error || !signedUrl || !path) throw new Error(error || "Failed to get upload URL")

            // 2. Upload to Supabase Storage
            const uploadRes = await fetch(signedUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            })

            if (!uploadRes.ok) throw new Error("Upload failed")

            // 3. Get public URL
            const publicUrl = await getPublicUrl(path)
            if (!publicUrl) throw new Error("Failed to get public URL")

            // 4. Save record to DB
            const saveRes = await saveJobPhoto(dealId, publicUrl, "Site photo")
            if (!saveRes.success) throw new Error(saveRes.error)

            toast.success("Photo uploaded successfully")
            if (onPhotoUploaded) onPhotoUploaded()

        } catch (err) {
            console.error(err)
            toast.error("Failed to upload photo")
        } finally {
            setIsUploading(false)
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    return (
        <>
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />
            <Button
                size="icon"
                className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-xl bg-slate-900 hover:bg-slate-800 text-white z-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <Camera className="h-6 w-6" />
                )}
            </Button>
        </>
    )
}
