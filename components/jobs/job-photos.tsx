"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  X, 
  Download, 
  Trash2, 
  Eye, 
  Plus,
  Image as ImageIcon,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { uploadJobPhoto, deleteJobPhoto, getJobPhotos } from "@/actions/job-media-actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface JobPhotosProps {
  dealId: string;
  isPastJob?: boolean;
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
  createdAt: string;
}

export function JobPhotos({ dealId, isPastJob = false }: JobPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isExpanded, setIsExpanded] = useState(!isPastJob);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);

  const loadPhotos = async () => {
    const result = await getJobPhotos(dealId);
    if (result.success && result.photos) {
      setPhotos(result.photos);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingFile) return;

    setUploading(true);
    try {
      const result = await uploadJobPhoto(dealId, uploadingFile, caption);
      if (result.success) {
        toast.success("Photo uploaded successfully");
        setShowUploadModal(false);
        setCaption("");
        setUploadingFile(null);
        await loadPhotos();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      const result = await deleteJobPhoto(photoId);
      if (result.success) {
        toast.success("Photo deleted successfully");
        await loadPhotos();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete photo");
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [dealId]);

  // For past jobs, only show first 2 photos by default
  const displayPhotos = isPastJob && !isExpanded 
    ? photos.slice(0, 2) 
    : photos;

  const hasMorePhotos = isPastJob && photos.length > 2 && !isExpanded;

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Job Photos
          <Badge variant="secondary">{photos.length}</Badge>
        </CardTitle>
        {isPastJob && photos.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {isExpanded ? "Show Less" : `Show ${photos.length - 2} More`}
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => setShowUploadModal(true)}
          className="text-xs"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Photo
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {displayPhotos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No photos uploaded yet</p>
            <Button
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="mt-4"
            >
              <Upload className="h-4 w-4 mr-2" />
              Add First Photo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {displayPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="aspect-square rounded-lg overflow-hidden border border-border">
                  <img
                    src={photo.url}
                    alt={photo.caption || "Job photo"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs">
                      <p className="truncate">{photo.caption}</p>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {formatDistanceToNow(new Date(photo.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {hasMorePhotos && (
          <div className="text-center py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-xs"
            >
              <Plus className="h-4 w-4 mr-1" />
              Show {photos.length - 2} More Photos
            </Button>
          </div>
        )}
      </CardContent>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Upload Job Photo</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Photo</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadingFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Caption (optional)</label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Describe what's in the photo..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Photo Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.caption || "Job photo"}
                    className="w-full rounded-lg max-h-96 object-contain"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedPhoto.url;
                      link.download = `job-photo-${selectedPhoto.id}.jpg`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                {selectedPhoto.caption && (
                  <div>
                    <h4 className="text-sm font-medium">Caption</h4>
                    <p className="text-sm text-muted-foreground">{selectedPhoto.caption}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Uploaded {formatDistanceToNow(new Date(selectedPhoto.createdAt), { addSuffix: true })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
