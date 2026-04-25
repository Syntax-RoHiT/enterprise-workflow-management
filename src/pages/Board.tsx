import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useProfiles } from "@/hooks/useProfiles";
import type { Task, TaskStatus, Profile } from "@/lib/types";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Plus, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";

const COLUMNS: { id: TaskStatus; title: string; wip: number }[] = [
    { id: "todo", title: "To do", wip: 8 },
    { id: "in_progress", title: "In progress", wip: 4 },
    { id: "done", title: "Done", wip: 999 },
];

const Board = () => {
    const { user } = useAuth();
    const { activeOrgId } = useOrganization();
    const { data: taskResult, isLoading } = useTasks(activeOrgId);
    const { data: profiles = [] } = useProfiles();
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    const tasks: Task[] = taskResult?.data ?? [];
    const [openId, setOpenId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [quickAdd, setQuickAdd] = useState<Record<string, string>>({});
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

    const onDragEnd = (e: DragEndEvent) => {
        setActiveId(null);
        const overId = e.over?.id;
        if (!overId) return;
        const taskId = String(e.active.id);
        const newStatus = String(overId) as TaskStatus;
        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.status === newStatus) return;
        updateTask.mutate({ id: taskId, patch: { status: newStatus }, version: task.version ?? 1 });
    };

    const addToColumn = (status: TaskStatus) => {
        const title = (quickAdd[status] || "").trim();
        if (!title || !user) return;
        setQuickAdd((q) => ({ ...q, [status]: "" }));
        createTask.mutate({ title, status, created_by: user.id, organization_id: activeOrgId });
    };

    const update = (id: string, patch: Partial<Task>) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        updateTask.mutate({ id, patch, version: task.version ?? 1 });
    };

    const remove = (id: string) => {
        deleteTask.mutate(id);
    };

    const active = tasks.find((t) => t.id === activeId);

    if (isLoading) {
        return (
            <div className="p-6 flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 animate-fade-in">
            <header className="mb-4">
                <h1 className="text-2xl font-bold tracking-tight">Board</h1>
                <p className="text-sm text-muted-foreground">Drag cards to update status. Watch WIP limits.</p>
            </header>

            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {COLUMNS.map((col) => {
                        const colTasks = tasks.filter((t) => t.status === col.id);
                        const overWip = colTasks.length > col.wip;
                        return (
                            <Column key={col.id} id={col.id}>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-semibold">{col.title}</h2>
                                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {colTasks.length}{col.wip < 999 && `/${col.wip}`}
                                        </span>
                                        {overWip && (
                                            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "hsl(var(--warning))" }}>
                                                <AlertTriangle className="w-3 h-3" /> Over WIP
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 min-h-[100px]">
                                    {colTasks.map((t) => (
                                        <DraggableCard key={t.id} task={t} onOpen={() => setOpenId(t.id)} />
                                    ))}
                                </div>

                                <div className="mt-3 flex gap-1">
                                    <Input
                                        placeholder="+ Add task"
                                        value={quickAdd[col.id] ?? ""}
                                        onChange={(e) => setQuickAdd((q) => ({ ...q, [col.id]: e.target.value }))}
                                        onKeyDown={(e) => e.key === "Enter" && addToColumn(col.id)}
                                        className="h-8 text-xs"
                                    />
                                    <Button size="icon" variant="ghost" onClick={() => addToColumn(col.id)} className="h-8 w-8">
                                        <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </Column>
                        );
                    })}
                </div>

                <DragOverlay>
                    {active && <TaskCardView task={active} dragging />}
                </DragOverlay>
            </DndContext>

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

const Column = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={`rounded-xl border p-3 transition-colors ${isOver ? "border-primary/60 bg-primary/5" : "border-border bg-card/50"
                }`}
        >
            {children}
        </div>
    );
};

const DraggableCard = ({ task, onOpen }: { task: Task; onOpen: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
    return (
        <div
            ref={setNodeRef}
            style={{
                transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
                opacity: isDragging ? 0 : 1,
            }}
        >
            <div {...attributes} {...listeners}>
                <TaskCardView task={task} onOpen={onOpen} />
            </div>
        </div>
    );
};

const PRI: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-primary/15 text-primary",
    high: "bg-destructive/15 text-destructive",
};

const TaskCardView = ({ task, dragging, onOpen }: { task: Task; dragging?: boolean; onOpen?: () => void }) => (
    <Card
        onDoubleClick={onOpen}
        className={`p-3 bg-card border-border cursor-grab active:cursor-grabbing card-hover ${dragging ? "shadow-glow rotate-1" : ""
            }`}
    >
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
        <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded ${PRI[task.priority]}`}>
                {task.priority}
            </span>
            {onOpen && (
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpen();
                    }}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                >
                    Open →
                </button>
            )}
        </div>
    </Card>
);

export default Board;
