"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapPin, Briefcase, ShieldX, Plus, X, Pencil, Trash2, Check, Loader2, Brain,
} from "lucide-react";
import {
  getKnowledgeRules,
  addKnowledgeRule,
  updateKnowledgeRule,
  deleteKnowledgeRule,
  getServiceArea,
  updateServiceArea,
  type KnowledgeRule,
} from "@/actions/knowledge-actions";
import {
  getUnresolvedDeviations,
  resolveDeviation,
  type DeviationEventData,
} from "@/actions/learning-actions";

export default function KnowledgeSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Service Area
  const [serviceRadius, setServiceRadius] = useState(20);
  const [baseSuburb, setBaseSuburb] = useState("");
  const [serviceSuburbs, setServiceSuburbs] = useState<string[]>([]);
  const [suburbDraft, setSuburbDraft] = useState("");

  // Service Menu
  const [services, setServices] = useState<KnowledgeRule[]>([]);
  const [serviceDraft, setServiceDraft] = useState("");
  const [servicePriceDraft, setServicePriceDraft] = useState("");
  const [serviceDurationDraft, setServiceDurationDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Negative Scope
  const [negativeRules, setNegativeRules] = useState<KnowledgeRule[]>([]);
  const [negativeDraft, setNegativeDraft] = useState("");

  // Deviations (AI Learning Insights)
  const [deviations, setDeviations] = useState<DeviationEventData[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [area, svcRules, negRules, devs] = await Promise.all([
        getServiceArea(),
        getKnowledgeRules("SERVICE"),
        getKnowledgeRules("NEGATIVE_SCOPE"),
        getUnresolvedDeviations(),
      ]);

      if (area) {
        setServiceRadius(area.serviceRadius);
        setBaseSuburb(area.baseSuburb);
        setServiceSuburbs(area.serviceSuburbs);
      }

      setServices(svcRules);
      setNegativeRules(negRules);
      setDeviations(devs);
    } catch {
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  };

  // ─── Service Area ─────────────────────────────────────────────────

  const saveServiceArea = async () => {
    setSaving(true);
    try {
      await updateServiceArea(serviceRadius, serviceSuburbs);
      toast.success("Service area updated");
    } catch {
      toast.error("Failed to save service area");
    } finally {
      setSaving(false);
    }
  };

  const addSuburb = () => {
    const val = suburbDraft.trim();
    if (!val || serviceSuburbs.includes(val)) return;
    setServiceSuburbs((prev) => [...prev, val]);
    setSuburbDraft("");
  };

  const removeSuburb = (index: number) => {
    setServiceSuburbs((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Service Menu ─────────────────────────────────────────────────

  const addService = async () => {
    const name = serviceDraft.trim();
    if (!name) return;
    const meta: Record<string, unknown> = {};
    if (servicePriceDraft.trim()) meta.priceRange = servicePriceDraft.trim();
    if (serviceDurationDraft.trim()) meta.duration = serviceDurationDraft.trim();

    const res = await addKnowledgeRule("SERVICE", name, meta);
    if (res.success) {
      setServiceDraft("");
      setServicePriceDraft("");
      setServiceDurationDraft("");
      const updated = await getKnowledgeRules("SERVICE");
      setServices(updated);
      toast.success("Service added");
    } else {
      toast.error(res.error || "Failed to add service");
    }
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    const res = await updateKnowledgeRule(id, editContent);
    if (res.success) {
      setEditingId(null);
      const updated = await getKnowledgeRules("SERVICE");
      setServices(updated);
    }
  };

  const deleteService = async (id: string) => {
    const res = await deleteKnowledgeRule(id);
    if (res.success) {
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Service removed");
    }
  };

  // ─── Negative Scope ───────────────────────────────────────────────

  const addNegativeRule = async () => {
    const text = negativeDraft.trim();
    if (!text) return;
    const res = await addKnowledgeRule("NEGATIVE_SCOPE", text);
    if (res.success) {
      setNegativeDraft("");
      const updated = await getKnowledgeRules("NEGATIVE_SCOPE");
      setNegativeRules(updated);
      toast.success("Refusal rule added");
    }
  };

  const deleteNegative = async (id: string) => {
    const res = await deleteKnowledgeRule(id);
    if (res.success) {
      setNegativeRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rule removed");
    }
  };

  // ─── Deviations ───────────────────────────────────────────────────

  const handleResolveDeviation = async (id: string, action: "REMOVE_RULE" | "KEEP_RULE") => {
    const res = await resolveDeviation(id, action);
    if (res.success) {
      setDeviations((prev) => prev.filter((d) => d.id !== id));
      if (action === "REMOVE_RULE") {
        // Refresh negative rules since one was removed
        const updated = await getKnowledgeRules("NEGATIVE_SCOPE");
        setNegativeRules(updated);
      }
      toast.success(action === "REMOVE_RULE" ? "Rule removed from negative scope" : "Rule kept");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading knowledge base...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          Knowledge Base
        </h3>
        <p className="text-sm text-muted-foreground">
          Control what Travis knows about your business: where you work, what you do, and what you refuse.
        </p>
      </div>

      {/* AI Learning Insights */}
      {deviations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-700 dark:text-amber-400">
              AI Learning Insights
            </CardTitle>
            <CardDescription>
              Travis noticed some mismatches between his recommendations and your actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deviations.map((dev) => (
              <div
                key={dev.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-3"
              >
                <div className="text-sm">
                  <p>
                    I recommended <strong>declining</strong> &quot;{dev.dealTitle}&quot;
                    {dev.ruleContent && (
                      <span className="text-slate-500"> (rule: {dev.ruleContent})</span>
                    )}
                    , but you <strong>{dev.userAction.toLowerCase()}</strong> it.
                  </p>
                  <p className="text-slate-500 mt-1">Should I remove this rule?</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleResolveDeviation(dev.id, "REMOVE_RULE")}
                  >
                    Remove Rule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveDeviation(dev.id, "KEEP_RULE")}
                  >
                    Keep Rule
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 1: Service Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            <CardTitle>Service Area</CardTitle>
          </div>
          <CardDescription>
            Where you work. Travis will flag jobs outside this area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Service Radius from {baseSuburb || "base"}</Label>
              <span className="text-sm font-medium text-emerald-600">{serviceRadius} km</span>
            </div>
            <Slider
              value={[serviceRadius]}
              onValueChange={(v) => setServiceRadius(v[0])}
              min={5}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <Label>Specific Suburbs (optional inclusions)</Label>
            <div className="flex gap-2">
              <Input
                value={suburbDraft}
                onChange={(e) => setSuburbDraft(e.target.value)}
                placeholder="e.g. Parramatta, Penrith"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSuburb();
                  }
                }}
              />
              <Button variant="outline" onClick={addSuburb}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {serviceSuburbs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {serviceSuburbs.map((s, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button
                      onClick={() => removeSuburb(i)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={saveServiceArea} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Service Area
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Service Menu */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-emerald-500" />
            <CardTitle>Service Menu</CardTitle>
          </div>
          <CardDescription>
            What jobs you do. Helps Travis triage and quote accurately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Row */}
          <div className="flex gap-2">
            <Input
              value={serviceDraft}
              onChange={(e) => setServiceDraft(e.target.value)}
              placeholder="Service name"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addService();
                }
              }}
            />
            <Input
              value={servicePriceDraft}
              onChange={(e) => setServicePriceDraft(e.target.value)}
              placeholder="Price range"
              className="w-32"
            />
            <Input
              value={serviceDurationDraft}
              onChange={(e) => setServiceDurationDraft(e.target.value)}
              placeholder="Duration"
              className="w-28"
            />
            <Button variant="outline" onClick={addService}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
          {services.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Service</th>
                    <th className="text-left px-3 py-2 font-medium">Price Range</th>
                    <th className="text-left px-3 py-2 font-medium">Duration</th>
                    <th className="w-20 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc) => {
                    const meta = (svc.metadata || {}) as Record<string, string>;
                    const isEditing = editingId === svc.id;
                    return (
                      <tr key={svc.id} className="border-t">
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="h-7 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(svc.id);
                              }}
                            />
                          ) : (
                            svc.ruleContent
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {meta.priceRange || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {meta.duration || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {isEditing ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => saveEdit(svc.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingId(svc.id);
                                  setEditContent(svc.ruleContent);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-600"
                              onClick={() => deleteService(svc.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No services added yet. Add your common jobs above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: The "No" List */}
      <Card className="border-red-200/50 dark:border-red-800/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-red-500" />
            <CardTitle>Refusal Rules (Negative Scope)</CardTitle>
          </div>
          <CardDescription>
            Jobs Travis must DECLINE automatically. These are injected as hard constraints into his triage logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={negativeDraft}
              onChange={(e) => setNegativeDraft(e.target.value)}
              placeholder='e.g. "No Gas Fitting", "No Roof Leaks", "No strata work"'
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNegativeRule();
                }
              }}
            />
            <Button variant="outline" onClick={addNegativeRule}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {negativeRules.length > 0 ? (
              negativeRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-3 py-2"
                >
                  <span className="text-sm text-red-700 dark:text-red-400">
                    {rule.ruleContent}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => deleteNegative(rule.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No refusal rules. Travis will accept all job types.
              </p>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Travis will politely decline any lead that matches these rules. You can always override by manually moving a declined lead to a positive stage — Travis will learn from your overrides.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
