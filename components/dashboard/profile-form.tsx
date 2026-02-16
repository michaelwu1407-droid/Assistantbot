"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateUserProfile } from "@/actions/user-actions";

interface ProfileFormProps {
  userId: string;
  initialData?: {
    username: string;
    email: string;
    bio?: string;
    urls: { value: string }[];
  };
}

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: initialData?.username || "",
    bio: initialData?.bio || "",
    urls: initialData?.urls || [],
    viewMode: "BASIC" as "BASIC" | "ADVANCED",
  });
  const [newUrl, setNewUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        username: formData.username,
        bio: formData.bio,
        urls: formData.urls,
        viewMode: formData.viewMode,
      };

      await updateUserProfile(userId, updateData);

      alert("Profile updated successfully!");
    } catch (error) {
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addUrl = () => {
    if (newUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        urls: [...prev.urls, { value: newUrl.trim() }]
      }));
      setNewUrl("");
    }
  };

  const removeUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      urls: prev.urls.filter((_, i) => i !== index)
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Manage your personal information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Display Name</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Your display name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={initialData?.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
            
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Advanced Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="advanced-mode">Advanced Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable advanced features and additional interface options
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

          <Separator />

          {/* URLs */}
          <div>
            <Label>Links</Label>
            <div className="space-y-2">
              {formData.urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={url.value}
                    onChange={(e) => {
                      const newUrls = [...formData.urls];
                      newUrls[index] = { value: e.target.value };
                      setFormData(prev => ({ ...prev, urls: newUrls }));
                    }}
                    placeholder="https://example.com"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeUrl(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              
              <div className="flex gap-2">
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addUrl}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
