import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useProfiles } from "@/hooks/useProfiles";
import type { Task, TaskStatus, TaskPriority, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, Calendar, MessageSquare, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";

const STATUS_LABEL: Record<TaskStatus, string> = {
    todo: "To do",
    in_progress: "In progress",
    done: "Done",
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
    low: "text-muted-foreground border-border",
    medium: "text-primary border-primary/40",
    high: "text-destructive border-destructive/40",
};

const Tasks = () => {
    const { user } = useAuth();
    const { activeOrgId } = useOrganization();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
    const [openId, setOpenId] = useState<string | null>(null);

    const { data: taskResult, isLoading } = useTasks(activeOrgId, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
        search: search || undefined,
    });
    const { data: profiles = [] } = useProfiles();
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    const tasks: Task[] = taskResult?.data ?? [];

    const profileMap = useMemo(() => {
        const m: Record<string, Profile> = {};
        profiles.forEach((p) => (m[p.user_id] = p));
        return m;
    }, [profiles]);

    const filtered = useMemo(() => {

        if (!search) return tasks;
        return tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
    }, [tasks, search]);

    const create = () => {
        if (!user) return;
        createTask.mutate({
            title: "New task",
            created_by: user.id,
            organization_id: activeOrgId,
        });
    };

    const update = (id: string, patch: Partial<Task>) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        updateTask.mutate({ id, patch, version: task.version ?? 1 });
    };

    const remove = (id: string) => {
        deleteTask.mutate(id);
    };

    return (
        <div className="p-6 space-y-4 animate-fade-in">
            <header className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
                    <p className="text-sm text-muted-foreground">{filtered.length} of {taskResult?.count ?? 0} shown</p>
                </div>
                <Button onClick={create} disabled={createTask.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                    <Plus className="w-4 h-4 mr-2" /> New task
                </Button>
            </header>

            <Card className="p-3 bg-card border-border">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="todo">To do</SelectItem>
                            <SelectItem value="in_progress">In progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All priorities</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All assignees</SelectItem>
                            {profiles.map((p) => (
                                <SelectItem key={p.user_id} value={p.user_id}>{p.display_name ?? p.email}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.length === 0 ? (
                        <Card className="p-10 text-center bg-card border-border">
                            <p className="text-muted-foreground">No tasks match your filters.</p>
                            <Button onClick={create} variant="outline" className="mt-4">
                                <Plus className="w-4 h-4 mr-2" /> Create your first task
                            </Button>
                        </Card>
                    ) : (
                        filtered.map((t) => (
                            <Card key={t.id} className="p-3 bg-card border-border card-hover group">
                                <div className="flex items-center gap-3">
                                    <Select value={t.status} onValueChange={(v) => update(t.id, { status: v as TaskStatus })}>
                                        <SelectTrigger className="w-[130px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                                                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <button
                                        type="button"
                                        onClick={() => setOpenId(t.id)}
                                        className="flex-1 text-left text-sm font-medium px-2 py-1 rounded hover:bg-muted/50 transition-colors truncate flex items-center gap-2 min-w-0"
                                    >
                                        <span className="truncate">{t.title}</span>
                                        <MessageSquare className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0" />
                                    </button>

                                    <span className={`hidden md:inline text-[10px] uppercase font-medium px-2 py-0.5 rounded border ${PRIORITY_COLOR[t.priority]}`}>
                                        {t.priority}
                                    </span>

                                    <Select value={t.priority} onValueChange={(v) => update(t.id, { priority: v as TaskPriority })}>
                                        <SelectTrigger className="w-[100px] h-8 text-xs md:hidden">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={t.assignee_id ?? "none"} onValueChange={(v) => update(t.id, { assignee_id: v === "none" ? null : v })}>
                                        <SelectTrigger className="w-[140px] h-8 text-xs hidden md:flex">
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Unassigned</SelectItem>
                                            {profiles.map((p) => (
                                                <SelectItem key={p.user_id} value={p.user_id}>{p.display_name ?? p.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {t.due_date && (
                                        <span className="hidden md:flex items-center text-xs text-muted-foreground gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(t.due_date), "MMM d")}
                                        </span>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(t.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            <TaskDetailDrawer
                task={tasks.find((t) => t.id === openId) ?? null}
                profiles={profiles}
                open={!!openId}
                onOpenChange={(o) => !o && setOpenId(null)}
                onChange={(patch) => openId && update(openId, patch)}
                onDelete={() => openId && remove(openId)}
            />
        </div>
    );
};

export default Tasks;
