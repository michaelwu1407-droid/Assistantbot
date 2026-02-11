"use client";

import { useState, useMemo } from "react";
import { GeocodedDeal, batchGeocode } from "@/actions/geo-actions";
import { MapPin, Navigation, RefreshCw, Calendar, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isToday } from "date-fns";

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
    return initialDeals.filter(deal =>
      deal.scheduledAt && isToday(new Date(deal.scheduledAt))
    );
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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Job Map & Locations
          </h1>
          <p className="text-sm text-slate-500">
            {filteredDeals.length} locations mapped {filter === 'today' ? 'today' : ''} • {pendingCount} pending geocoding
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="bg-slate-100 p-1 rounded-lg border flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <Filter className="h-3.5 w-3.5" />
              All Jobs
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${filter === 'today'
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                  : 'text-slate-500 hover:text-slate-900'
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors ml-2"
            >
              <RefreshCw className={`h-4 w-4 ${isGeocoding ? "animate-spin" : ""}`} />
              {isGeocoding ? "Geocoding..." : "Update Locations"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar List */}
        <div className="w-80 bg-white border-r overflow-y-auto flex flex-col shrink-0">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {filter === 'today' ? "Today's Schedule" : "All Scheduled Jobs"}
            </h2>
          </div>

          {filteredDeals.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <MapPin className="h-8 w-8 mx-auto mb-3 text-slate-300" />
              <p>No mapped jobs found{filter === 'today' ? ' for today' : ''}.</p>
              <p className="text-xs mt-1">
                {filter === 'today'
                  ? "Check your 'All Jobs' view or schedule some tasks."
                  : "Add addresses to your deals to see them here."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredDeals.map((deal) => (
                <div key={deal.id} className="p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-slate-900 truncate pr-2">{deal.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${deal.stage === 'won' ? 'bg-green-50 text-green-700 border-green-200' :
                      deal.stage === 'negotiation' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                      {deal.stage}
                    </span>
                  </div>

                  <p className="text-sm font-medium">{deal.contactName}</p>

                  <div className="flex items-start gap-2 text-xs text-slate-500 mb-3">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{deal.address}</span>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${deal.latitude},${deal.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
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

        {/* Map Stage */}
        <div className="flex-1 bg-slate-100 relative z-0">
          <LeafletMap deals={filteredDeals} />
        </div>
      </div>
    </div>
  );
}
