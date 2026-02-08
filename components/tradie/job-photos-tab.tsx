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

interface JobPhotosTabProps {
    dealId: string;
}

export function JobPhotosTab({ dealId }: JobPhotosTabProps) {
    const [photos, setPhotos] = useState<Photo[]>([]);

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

            <CameraFAB dealId={dealId} />
        </div>
    );
}
