"use client";

import { useState } from "react";
import { CameraFAB } from "./camera-fab";
import { PhotoGallery } from "./photo-gallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Photo {
    id: string;
    url: string;
    createdAt: Date;
}

export function JobPhotosTab() {
    const [photos, setPhotos] = useState<Photo[]>([]);

    const handleCapture = (file: File) => {
        const newPhoto: Photo = {
            id: Math.random().toString(36).substring(7),
            url: URL.createObjectURL(file), // Create local URL for preview
            createdAt: new Date(),
        };
        setPhotos((prev) => [newPhoto, ...prev]);
    };

    const handleRemove = (id: string) => {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Job Photos ({photos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <PhotoGallery photos={photos} onRemove={handleRemove} />
                </CardContent>
            </Card>

            <CameraFAB onCapture={handleCapture} />
        </div>
    );
}
