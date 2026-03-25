"use client";
import { X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

interface Photo {
    id: string;
    url: string; // Blob URL or remote URL
    caption?: string;
    createdAt: Date;
}

interface PhotoGalleryProps {
    photos: Photo[];
    onRemove?: (id: string) => void;
}

export function PhotoGallery({ photos, onRemove }: PhotoGalleryProps) {
    if (photos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                <div className="bg-slate-50 p-4 rounded-full mb-3">
                    <ZoomIn className="h-6 w-6" />
                </div>
                <p className="font-medium">No photos yet</p>
                <p className="text-xs">Tap the camera button to start documenting</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
                <Dialog key={photo.id}>
                    <DialogTrigger asChild>
                        <div className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden cursor-pointer group border shadow-sm">
                            <div className="relative w-full h-full">
                                <Image
                                    src={photo.url}
                                    alt={photo.caption || "Job photo"}
                                    fill
                                    unoptimized
                                    className="object-cover transition-transform group-hover:scale-105"
                                />
                            </div>

                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                            {onRemove && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(photo.id);
                                    }}
                                    className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-none">
                        <div className="relative w-full h-[80vh] flex items-center justify-center">
                            <Image
                                src={photo.url}
                                alt={photo.caption || "Preview"}
                                fill
                                unoptimized
                                className="object-contain"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            ))}
        </div>
    );
}
