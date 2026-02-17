"use client";

import { useState, useMemo } from "react";
import { GeocodedDeal, batchGeocode } from "@/actions/geo-actions";
import { MapPin, Navigation, RefreshCw, Calendar, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isToday, isValid } from "date-fns";

// Dynamically import Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
      <div className="flex flex-col items-center gap-2">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading Map...</span>
      </div>
    </div>
  ),
});

export interface JobMapViewProps {
  initialDeals: GeocodedDeal[];
  workspaceId: string;
  pendingCount: number;
}

export function JobMapView({ initialDeals, workspaceId, pendingCount }: JobMapViewProps) {
  const router = useRouter();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today'>('all');

  const filteredDeals = useMemo(() => {
    if (filter === 'all') return initialDeals;
    return initialDeals.filter(deal => {
      if (!deal.scheduledAt) return false;
      const date = new Date(deal.scheduledAt);
      return isValid(date) && isToday(date);
    });
  }, [initialDeals, filter]);

  const handleBatchGeocode = async () => {
    setIsGeocoding(true);
    try {
      await batchGeocode(workspaceId);
      router.refresh();
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-md border-b border-border/50 px-4 md:px-6 py-4 flex flex-col md:flex-row md:justify-between md:items-center shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Job Map & Locations
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredDeals.length} locations mapped {filter === 'today' ? 'today' : ''} • {pendingCount} pending geocoding
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="bg-muted/50 p-1 rounded-lg border border-border/50 flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${filter === 'all'
                ? 'bg-background text-foreground shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Filter className="h-3.5 w-3.5" />
              All Jobs
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${filter === 'today'
                ? 'bg-background text-primary shadow-sm border border-primary/20'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Today Only
            </button>
          </div>

          {pendingCount > 0 && (
            <button
              onClick={handleBatchGeocode}
              disabled={isGeocoding}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors ml-2 shadow-lg shadow-primary/20"
            >
              <RefreshCw className={`h-4 w-4 ${isGeocoding ? "animate-spin" : ""}`} />
              {isGeocoding ? "Geocoding..." : "Update Locations"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar List - Responsive Width */}
        <div className="w-full md:w-72 lg:w-80 h-1/3 md:h-full bg-background border-r border-border/50 overflow-y-auto flex flex-col shrink-0 order-2 md:order-1">
          <div className="p-4 border-b border-border/50 bg-muted/10 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {filter === 'today' ? "Today's Schedule" : "All Scheduled Jobs"}
            </h2>
          </div>

          {filteredDeals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="text-sm font-medium text-foreground mb-1">No jobs found</h3>
              <p className="text-xs text-muted-foreground/80">
                {filter === 'today'
                  ? "No mapped jobs scheduled for today."
                  : "No mapped jobs found in your workspace."}
              </p>
              {pendingCount > 0 && (
                <p className="text-xs mt-4 text-primary">
                  You have {pendingCount} jobs waiting to be mapped.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredDeals.map((deal) => (
                <div key={deal.id} className="p-4 hover:bg-muted/50 transition-colors group">
                  <div className="flex justify-between items-start mb-1">
                    <h3
                      className="font-medium text-foreground truncate pr-2 cursor-help"
                      title={deal.title}
                    >
                      {deal.title}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${deal.stage === 'won' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      deal.stage === 'negotiation' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-muted text-muted-foreground border-border/50'
                      }`}>
                      {deal.stage}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-muted-foreground">{deal.contactName}</p>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground/80 mb-3">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="line-clamp-2" title={deal.address}>{deal.address}</span>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${deal.latitude},${deal.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-border/50 rounded text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Navigation className="h-3 w-3" />
                      Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Stage - Flexible Width */}
        <div className="flex-1 h-2/3 md:h-full bg-muted/20 relative z-0 min-w-0 order-1 md:order-2">
          <LeafletMap deals={filteredDeals} />
        </div>
      </div>
    </div>
  );
}
