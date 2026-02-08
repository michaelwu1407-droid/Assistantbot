"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { toast } from "sonner";

interface CameraFABProps {
    onCapture: (file: File) => void;
}

export function CameraFAB({ onCapture }: CameraFABProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onCapture(file);
            toast.success("Photo captured!");
        }
    };

    return (
        <>
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />
            <Button
                onClick={handleClick}
                className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-2xl z-50 bg-neutral-900 text-white hover:bg-neutral-800 hover:scale-105 transition-transform"
                size="icon"
            >
                <Camera className="h-6 w-6" />
            </Button>
        </>
    );
}
