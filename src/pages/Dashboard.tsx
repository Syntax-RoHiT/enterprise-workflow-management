import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useTasks, useCreateTask } from "@/hooks/useTasks";
import { useProfileMap } from "@/hooks/useProfiles";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card } from "@/components/ui/card";
import { ListChecks, CheckCircle2, AlertCircle, Activity as ActivityIcon, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
} from "recharts";
import { format, subDays, isAfter } from "date-fns";

const Dashboard = () => {
    const { user } = useAuth();
    const { activeOrgId } = useOrganization();
    const navigate = useNavigate();
    const createTask = useCreateTask();

    const { data: taskResult, isLoading: tasksLoading } = useTasks(activeOrgId);
    const profileMap = useProfileMap();
    const { data: auditResult, isLoading: auditLoading } = useAuditLog(
        { tableName: "tasks" },
        { page: 1, pageSize: 10 },
    );

    const tasks = taskResult?.data ?? [];
    const now = new Date();

    const stats = useMemo(() => ({
        total: tasks.length,
        done: tasks.filter((x) => x.status === "done").length,
        inProgress: tasks.filter((x) => x.status === "in_progress").length,
        overdue: tasks.filter((x) => x.due_date && x.status !== "done" && isAfter(now, new Date(x.due_date))).length,
    }), [tasks, now]);

    const trend = useMemo(() => {
        const days = Array.from({ length: 7 }).map((_, i) => subDays(now, 6 - i));
        return days.map((d) => ({
            date: format(d, "MMM d"),
            completed: tasks.filter(
                (x) => x.status === "done" && format(new Date(x.updated_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"),
            ).length,
        }));
    }, [tasks, now]);

    const distribution = useMemo(() => [
        { name: "To do", value: tasks.filter((x) => x.status === "todo").length },
        { name: "In progress", value: tasks.filter((x) => x.status === "in_progress").length },
        { name: "Done", value: tasks.filter((x) => x.status === "done").length },
    ], [tasks]);

    const activity = auditResult?.data ?? [];

    const quickCreate = () => {
        if (!user) return;
        createTask.mutate({ title: "New task", created_by: user.id, organization_id: activeOrgId });
    };

    const COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(var(--success))"];

    if (tasksLoading) {
        return (
            <div className="p-6 flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <header className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
                    <p className="text-sm text-muted-foreground">Real-time overview of your team's work</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={quickCreate} disabled={createTask.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                        <Plus className="w-4 h-4 mr-2" /> New task
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/board")}>Open board</Button>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total tasks" value={stats.total} icon={ListChecks} accent="text-primary" />
                <StatCard label="Completed" value={stats.done} icon={CheckCircle2} accent="text-success" />
                <StatCard label="In progress" value={stats.inProgress} icon={ActivityIcon} accent="text-accent" />
                <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} accent="text-destructive" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 p-5 bg-card border-border card-hover">
                    <h2 className="font-semibold mb-4">Productivity trend</h2>
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trend}>
                                <defs>
                                    <linearGradient id="lineG" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                                        <stop offset="100%" stopColor="hsl(var(--accent))" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: 8,
                                        color: "hsl(var(--card-foreground))",
                                    }}
                                />
                                <Line type="monotone" dataKey="completed" stroke="url(#lineG)" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-5 bg-card border-border card-hover">
                    <h2 className="font-semibold mb-4">Task distribution</h2>
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                                    {distribution.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i]} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: 8,
                                        color: "hsl(var(--card-foreground))",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {distribution.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                                {d.name}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <Card className="p-5 bg-card border-border">
                <h2 className="font-semibold mb-4">Recent activity</h2>
                {auditLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet — create a task to get started.</p>
                ) : (
                    <ul className="space-y-3">
                        {activity.map((a) => (
                            <li key={a.id} className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                                    {(profileMap[a.user_id ?? ""]?.display_name ?? "?").slice(0, 1).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <span className="font-medium">{profileMap[a.user_id ?? ""]?.display_name ?? "System"}</span>{" "}
                                    <span className="text-muted-foreground">
                                        {a.operation.toLowerCase()} on {a.table_name}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{format(new Date(a.changed_at), "MMM d, HH:mm")}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
};

const StatCard = ({
    label,
    value,
    icon: Icon,
    accent,
}: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
}) => (
    <Card className="p-4 bg-card border-border card-hover">
        <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
            <Icon className={`w-4 h-4 ${accent}`} />
        </div>
        <div className="text-3xl font-bold mt-2 tabular-nums">{value}</div>
    </Card>
);

export default Dashboard;
