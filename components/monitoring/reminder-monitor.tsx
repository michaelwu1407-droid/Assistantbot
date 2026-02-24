"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Car, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Send,
  Settings,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

interface ReminderStats {
  recentReminders: number;
  recentTripSms: number;
  upcomingJobs: number;
}

interface RecentActivity {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  deal: {
    id: string;
    title: string;
    contact: {
      name: string;
    };
  };
}

export function ReminderMonitor() {
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [recentReminders, setRecentReminders] = useState<RecentActivity[]>([]);
  const [recentTripSms, setRecentTripSms] = useState<RecentActivity[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reminders");
      const result = await response.json();
      
      if (result.success) {
        setStats(result.stats);
        setRecentReminders(result.details.recentReminders);
        setRecentTripSms(result.details.recentTripSms);
        setUpcomingJobs(result.details.upcomingJobs);
      } else {
        toast.error("Failed to load stats");
      }
    } catch (error) {
      toast.error("Error loading stats");
    } finally {
      setLoading(false);
    }
  };

  const manualSendReminder = async (dealId: string) => {
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendReminder", dealId }),
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success("Reminder sent manually");
        loadStats(); // Refresh stats
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to send reminder");
    }
  };

  const manualSendTripSms = async (dealId: string) => {
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendTripSms", dealId }),
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success("Trip SMS sent manually");
        loadStats(); // Refresh stats
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to send trip SMS");
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-AU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Reminder Monitor</h2>
          <Badge variant="outline">Live</Badge>
        </div>
        <Button onClick={loadStats} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Reminders</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentReminders}</div>
              <p className="text-xs text-muted-foreground">Last 50 reminders sent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trip SMS</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentTripSms}</div>
              <p className="text-xs text-muted-foreground">Last 50 trip messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingJobs}</div>
              <p className="text-xs text-muted-foreground">Scheduled jobs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Job Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentReminders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent reminders</p>
              ) : (
                recentReminders.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.deal.contact.name} • {formatTime(activity.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => manualSendReminder(activity.deal.id)}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Trip SMS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Recent Trip SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentTripSms.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent trip SMS</p>
              ) : (
                recentTripSms.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.deal.contact.name} • {formatTime(activity.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => manualSendTripSms(activity.deal.id)}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {upcomingJobs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No upcoming jobs</p>
            ) : (
              upcomingJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.contact.name} • {new Date(job.scheduledAt).toLocaleString("en-AU", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {job.workspace.enableJobReminders ? "Reminders ON" : "Reminders OFF"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => manualSendReminder(job.id)}
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => manualSendTripSms(job.id)}
                      >
                        <Car className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
