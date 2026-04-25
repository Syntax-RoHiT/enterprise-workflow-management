import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/useComments";
import { useSubtasks, useAttachments, useUploadAttachment, useDeleteAttachment, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import type { Task, TaskPriority, TaskStatus, Profile, Comment } from "@/lib/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Send, Trash2, Loader2, Paperclip, Calendar as CalendarIcon, CheckSquare, Plus, File as FileIcon, Download } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Props {
    task: Task | null;
    profiles: Profile[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (patch: Partial<Task>) => void;
    onDelete: () => void;
}

export const TaskDetailDrawer = ({
    task,
    profiles,
    open,
    onOpenChange,
    onChange,
    onDelete,
}: Props) => {
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [draft, setDraft] = useState("");
    const [aiBusy, setAiBusy] = useState(false);
    const [aiNote, setAiNote] = useState<string | null>(null);
    const { data: comments = [] } = useComments(task?.id ?? null);
    const createComment = useCreateComment();
    const deleteComment = useDeleteComment();
    const { data: subtasks = [] } = useSubtasks(task?.id ?? null);
    const { data: attachments = [] } = useAttachments(task?.id ?? null);
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const uploadAttachment = useUploadAttachment();
    const removeAttachment = useDeleteAttachment();

    const [newSubtask, setNewSubtask] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!task) return;
        setTitle(task.title);
        setDescription(task.description ?? "");
        setAiNote(null);
    }, [task?.id]);

    const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]));

    if (!task) return null;

    const initials = (uid: string) =>
        (profileMap[uid]?.display_name ?? "?").slice(0, 2).toUpperCase();

    const saveTitle = () => {
        if (title !== task.title && title.trim()) onChange({ title: title.trim() });
    };
    const saveDescription = () => {
        const next = description.trim() || null;
        if (next !== task.description) onChange({ description: next });
    };

    const postComment = async () => {
        if (!user || !draft.trim() || !task) return;
        const body = draft.trim();
        setDraft("");
        createComment.mutate({ taskId: task.id, authorId: user.id, body });
    };

    const removeComment = (id: string) => {
        if (!task) return;
        deleteComment.mutate({ id, taskId: task.id });
    };

    const aiSuggest = async () => {
        setAiBusy(true);
        setAiNote(null);
        try {
            const { data, error } = await supabase.functions.invoke("ai-prioritize", {
                body: { title, description },
            });
            if (error) throw error;
            if (data?.error) {
                toast.error(data.error);
                return;
            }
            const priority = data?.priority as TaskPriority;
            if (priority && priority !== task.priority) {
                onChange({ priority });
            }
            setAiNote(`AI: ${priority.toUpperCase()} — ${data?.reason ?? ""}`);
            toast.success(`Suggested: ${priority}`);
        } catch (e) {
            toast.error("AI suggestion failed");
        } finally {
            setAiBusy(false);
        }
    };

    const addSubtask = () => {
        if (!newSubtask.trim() || !user || !task) return;
        createTask.mutate({
            title: newSubtask.trim(),
            created_by: user.id,
            organization_id: task.organization_id,
            parent_task_id: task.id,
        });
        setNewSubtask("");
    };

    const toggleSubtask = (st: Task) => {
        updateTask.mutate({
            id: st.id,
            patch: { status: st.status === "done" ? "todo" : "done" },
            version: st.version,
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !task) return;
        uploadAttachment.mutate({ taskId: task.id, userId: user.id, file });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-card border-border scrollbar-thin">
                <SheetHeader>
                    <SheetTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        Task · {format(new Date(task.created_at), "MMM d, yyyy")}
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-5">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={saveTitle}
                        className="text-lg font-semibold border-0 bg-transparent focus-visible:ring-1 px-2"
                        placeholder="Task title"
                    />

                    <div className="grid grid-cols-3 gap-2">
                        <Select value={task.status} onValueChange={(v) => onChange({ status: v as TaskStatus })}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todo">To do</SelectItem>
                                <SelectItem value="in_progress">In progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={task.priority} onValueChange={(v) => onChange({ priority: v as TaskPriority })}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={task.assignee_id ?? "none"}
                            onValueChange={(v) => onChange({ assignee_id: v === "none" ? null : v })}
                        >
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Unassigned</SelectItem>
                                {profiles.map((p) => (
                                    <SelectItem key={p.user_id} value={p.user_id}>{p.display_name ?? "User"}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                        <Input
                            type="date"
                            className="h-8 text-xs w-[140px]"
                            value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                onChange({ due_date: val ? new Date(val).toISOString() : null });
                            }}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Description
                            </label>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={aiSuggest}
                                disabled={aiBusy}
                                className="h-7 text-xs gap-1.5 text-primary hover:text-primary"
                            >
                                {aiBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                AI prioritize
                            </Button>
                        </div>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={saveDescription}
                            rows={4}
                            placeholder="Add details..."
                            className="resize-none text-sm"
                        />
                        {aiNote && (
                            <p className="text-[11px] text-primary mt-1.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {aiNote}
                            </p>
                        )}
                    </div>

                    {}
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5" /> Subtasks
                        </label>
                        <div className="space-y-1.5 mb-2">
                            {subtasks.map(st => (
                                <div key={st.id} className="flex items-center gap-2 group">
                                    <input
                                        type="checkbox"
                                        checked={st.status === "done"}
                                        onChange={() => toggleSubtask(st as Task)}
                                        className="rounded border-input bg-transparent shadow-sm hover:border-primary/50 focus-visible:ring-1 cursor-pointer w-3.5 h-3.5 accent-primary"
                                    />
                                    <span className={`text-sm flex-1 ${st.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                                        {st.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newSubtask}
                                onChange={e => setNewSubtask(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") addSubtask() }}
                                placeholder="Add a subtask..."
                                className="h-8 text-xs"
                            />
                            <Button size="sm" variant="secondary" onClick={addSubtask} className="h-8">
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    {}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Paperclip className="w-3.5 h-3.5" /> Attachments
                            </label>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => fileInputRef.current?.click()}>
                                <Plus className="w-3 h-3 mr-1" /> Add file
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {attachments.map(att => (
                                <div key={att.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30 group">
                                    <FileIcon className="w-4 h-4 text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate" title={att.file_name}>{att.file_name}</p>
                                        <p className="text-[9px] text-muted-foreground">{(att.file_size / 1024).toFixed(0)} KB</p>
                                    </div>
                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6"
                                            onClick={async () => {
                                                const { data } = await supabase.storage.from("task-attachments").createSignedUrl(att.storage_path, 3600);
                                                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                            }}
                                        >
                                            <Download className="w-3 h-3 text-muted-foreground" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAttachment.mutate({ id: att.id, storagePath: att.storage_path, taskId: task.id })}>
                                            <Trash2 className="w-3 h-3 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {}
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                            Comments ({comments.length})
                        </label>
                        <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
                            {comments.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                            ) : (
                                comments.map((c) => (
                                    <div key={c.id} className="flex gap-2 group">
                                        <Avatar className="w-7 h-7 shrink-0">
                                            <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                                                {initials(c.author_id)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs font-medium">
                                                    {profileMap[c.author_id]?.display_name ?? "User"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap break-words">{c.body}</p>
                                        </div>
                                        {user?.id === c.author_id && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeComment(c.id)}
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        postComment();
                                    }
                                }}
                                placeholder="Write a comment... (Enter to send)"
                                className="text-sm"
                            />
                            <Button
                                size="icon"
                                onClick={postComment}
                                disabled={!draft.trim()}
                                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                onDelete();
                                onOpenChange(false);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete task
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
