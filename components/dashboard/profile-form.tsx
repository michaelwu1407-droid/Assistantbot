"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateUserProfile } from "@/actions/user-actions";
import { toast } from "sonner";
import { useShellStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  userId: string;
  initialData?: {
    username: string;
    email: string;
    viewMode?: "BASIC" | "ADVANCED";
  };
}

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const router = useRouter()
  const setViewMode = useShellStore((s) => s.setViewMode)
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: initialData?.username || "",
    viewMode: initialData?.viewMode || "BASIC" as "BASIC" | "ADVANCED",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        username: formData.username,
        viewMode: formData.viewMode,
      };

      await updateUserProfile(userId, updateData);
      setViewMode(formData.viewMode)
      if (formData.viewMode === "BASIC") {
        router.push("/dashboard")
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Manage your personal information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Display Name</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Your display name"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={initialData?.email}
                disabled
                className="bg-slate-50 text-slate-500 mt-1.5"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
          </div>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          {/* Advanced Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="advanced-mode" className="text-base font-medium">Advanced Mode</Label>
              <p className="text-sm text-slate-500">
                Enable advanced features, reports, and team views.
              </p>
            </div>
            <Switch
              id="advanced-mode"
              checked={formData.viewMode === "ADVANCED"}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, viewMode: checked ? "ADVANCED" : "BASIC" }))
              }
            />
          </div>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
