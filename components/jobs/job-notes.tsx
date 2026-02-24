"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Edit3, 
  Trash2, 
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Save,
  X
} from "lucide-react";
import { createJobNote, deleteJobNote, updateJobNote, getJobNotes } from "@/actions/job-media-actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getAuthUser } from "@/lib/auth-client";

interface JobNotesProps {
  dealId: string;
  isPastJob?: boolean;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { name: string | null };
}

export function JobNotes({ dealId, isPastJob = false }: JobNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(!isPastJob);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  const loadNotes = async () => {
    const result = await getJobNotes(dealId);
    if (result.success && result.notes) {
      setNotes(result.notes);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !user) return;

    setSaving(true);
    try {
      const result = await createJobNote(dealId, newNoteContent, user.id);
      if (result.success) {
        toast.success("Note added successfully");
        setNewNoteContent("");
        setShowAddForm(false);
        await loadNotes();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    setSaving(true);
    try {
      const result = await updateJobNote(noteId, content);
      if (result.success) {
        toast.success("Note updated successfully");
        setEditingNote(null);
        await loadNotes();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to update note");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const result = await deleteJobNote(noteId);
      if (result.success) {
        toast.success("Note deleted successfully");
        await loadNotes();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  useEffect(() => {
    loadNotes();
    getAuthUser().then(setUser).catch(() => setUser(null));
  }, [dealId]);

  // For past jobs, only show first 3 notes by default
  const displayNotes = isPastJob && !isExpanded 
    ? notes.slice(0, 3) 
    : notes;

  const hasMoreNotes = isPastJob && notes.length > 3 && !isExpanded;

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Job Notes
          <Badge variant="secondary">{notes.length}</Badge>
        </CardTitle>
        {isPastJob && notes.length > 3 && (
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
            {isExpanded ? "Show Less" : `Show ${notes.length - 3} More`}
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="text-xs"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {displayNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No notes added yet</p>
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="mt-4"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add First Note
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayNotes.map((note) => (
              <div
                key={note.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">
                        {note.author?.name || "Unknown"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingNote(note.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteNote(note.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {editingNote === note.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={note.content}
                      onChange={(e) => setEditingNote(note.id)}
                      className="min-h-[80px]"
                      placeholder="Update your note..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNote(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateNote(note.id, note.content)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        
        {hasMoreNotes && (
          <div className="text-center py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-xs"
            >
              <Plus className="h-4 w-4 mr-1" />
              Show {notes.length - 3} More Notes
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add Note Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Job Note</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddNote} className="space-y-4">
                <Textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Add a note about this job..."
                  rows={4}
                  required
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
