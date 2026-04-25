import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { LayoutDashboard, ListChecks, KanbanSquare, GitBranch, Users, Settings, Plus, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const go = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    const quickCreateTask = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from("tasks")
            .insert({ title: "New task", created_by: user.id })
            .select()
            .single();
        setOpen(false);
        if (error) return toast.error(error.message);
        toast.success("Task created");
        if (data) navigate("/tasks");
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Quick actions">
                    <CommandItem onSelect={quickCreateTask}>
                        <Plus className="mr-2 h-4 w-4" /> Create task
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Navigate">
                    <CommandItem onSelect={() => go("/")}><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</CommandItem>
                    <CommandItem onSelect={() => go("/tasks")}><ListChecks className="mr-2 h-4 w-4" /> Tasks</CommandItem>
                    <CommandItem onSelect={() => go("/board")}><KanbanSquare className="mr-2 h-4 w-4" /> Board</CommandItem>
                    <CommandItem onSelect={() => go("/workflows")}><GitBranch className="mr-2 h-4 w-4" /> Workflows</CommandItem>
                    <CommandItem onSelect={() => go("/team")}><Users className="mr-2 h-4 w-4" /> Team</CommandItem>
                    <CommandItem onSelect={() => go("/settings")}><Settings className="mr-2 h-4 w-4" /> Settings</CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Account">
                    <CommandItem onSelect={() => { setOpen(false); signOut(); }}>
                        <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}