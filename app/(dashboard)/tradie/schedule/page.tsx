import SchedulerView from "@/components/scheduler/scheduler-view";

export default function SchedulerPage() {
    return (
        <div className="h-[calc(100vh-4rem)]"> {/* Minus header height approx */}
            <SchedulerView />
        </div>
    );
}
