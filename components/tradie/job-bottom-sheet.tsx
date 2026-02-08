"use client";

import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, Phone } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function JobBottomSheet() {
    const [open, setOpen] = useState(true); // Always visible/peeking
    const router = useRouter();

    const handleStartTravel = () => {
        toast.success("SMS Sent: On my way!");
        router.push("/dashboard/tradie/jobs/job-123"); // Mock ID
    };

    return (
        <Drawer.Root shouldScaleBackground>
            <Drawer.Trigger asChild>
                {/* Floating Trigger if needed, but we used fixed UI */}
                <Button className="hidden">Open</Button>
            </Drawer.Trigger>

            {/* 
         We want a "Persistent" bottom sheet for the Tradie view.
         for this demo, we'll just put a fixed trigger bar at the bottom 
         that acts as the handle.
      */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-8 z-20 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] md:hidden">
                <Drawer.Trigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Up Next</p>
                            <h3 className="font-bold text-slate-900">Mrs. Jones - Leaky Tap</h3>
                        </div>
                        <Button size="sm" className="bg-slate-900 text-white rounded-full px-6">
                            View
                        </Button>
                    </div>
                </Drawer.Trigger>
            </div>

            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
                    <div className="p-4 bg-white rounded-t-[10px] flex-1">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />

                        <div className="max-w-md mx-auto space-y-6">
                            <Drawer.Title className="font-bold text-2xl mb-2">Mrs. Jones - Leaky Tap</Drawer.Title>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                                    <Clock className="text-slate-500 h-5 w-5" />
                                    <div>
                                        <p className="text-xs text-slate-500">Time</p>
                                        <p className="font-semibold">2:00 PM</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                                    <MapPin className="text-slate-500 h-5 w-5" />
                                    <div>
                                        <p className="text-xs text-slate-500">Distance</p>
                                        <p className="font-semibold">12 mins</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <MapPin className="mt-1 h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="font-medium">123 Maple Avenue</p>
                                        <p className="text-sm text-muted-foreground">Surry Hills, NSW 2010</p>
                                    </div>
                                </div>
                                <hr className="border-slate-200" />
                                <div className="flex items-start gap-3">
                                    <Phone className="mt-1 h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="font-medium">0400 123 456</p>
                                        <p className="text-sm text-muted-foreground">Contact: Jenny</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleStartTravel}
                                className="w-full h-14 text-lg font-bold bg-green-500 hover:bg-green-600 text-slate-900 rounded-xl shadow-lg shadow-green-200"
                            >
                                <Navigation className="mr-2 h-5 w-5" />
                                Start Travel
                            </Button>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
