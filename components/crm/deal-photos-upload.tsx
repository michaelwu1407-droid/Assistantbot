"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, ImageIcon } from "lucide-react"
import { uploadDealPhoto } from "@/actions/deal-actions"
import { toast } from "sonner"

interface Photo {
  id: string
  url: string
  caption?: string | null
  createdAt: Date
}

interface DealPhotosUploadProps {
  dealId: string
  initialPhotos: Photo[]
}

export function DealPhotosUpload({ dealId, initialPhotos }: DealPhotosUploadProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadDealPhoto(dealId, formData)
      if (result.success) {
        toast.success("Photo uploaded")
        router.refresh()
      } else {
        toast.error(result.error ?? "Upload failed")
      }
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading…" : "Upload photo"}
        </Button>
      </div>
      {initialPhotos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {initialPhotos.map((photo) => (
            <div key={photo.id} className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              <img src={photo.url} alt={photo.caption || "Job"} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          No photos yet. Use the button above to upload one.
        </p>
      )}
    </div>
  )
}
