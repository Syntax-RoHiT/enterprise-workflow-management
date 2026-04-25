import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
    id: string;
    actor_id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
}

const STORAGE_KEY = "nexus:notifications:lastSeen";

export const NotificationsBell = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<Activity[]>([]);
    const [profiles, setProfiles] = useState<Record<string, string>>({});
    const [open, setOpen] = useState(false);
    const [lastSeen, setLastSeen] = useState<number>(() => {
        const v = localStorage.getItem(STORAGE_KEY);
        return v ? parseInt(v, 10) : 0;
    });

    useEffect(() => {
        if (!user) return;
        load();
        loadProfiles();
        const ch = supabase
            .channel("activity-feed")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "activity" },
                (payload) => {
                    setItems((cur) => [payload.new as Activity, ...cur].slice(0, 30));
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(ch);
        };
    }, [user]);

    const load = async () => {
        const { data } = await supabase
            .from("activity")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(30);
        setItems((data ?? []) as Activity[]);
    };

    const loadProfiles = async () => {
        const { data } = await supabase.rpc("list_profiles_public");
        const map: Record<string, string> = {};
        (data ?? []).forEach((p: { user_id: string; display_name: string | null }) => {
            map[p.user_id] = p.display_name ?? "Someone";
        });
        setProfiles(map);
    };

    const unread = items.filter(
        (i) => i.actor_id !== user?.id && new Date(i.created_at).getTime() > lastSeen,
    ).length;

    const markRead = () => {
        const now = Date.now();
        setLastSeen(now);
        localStorage.setItem(STORAGE_KEY, String(now));
    };

    const handleOpenChange = (o: boolean) => {
        setOpen(o);
        if (o) markRead();
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" title="Notifications">
                    <Bell className="w-4 h-4" />
                    {unread > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-glow">
                            {unread > 9 ? "9+" : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                    <p className="text-sm font-semibold">Activity</p>
                    <span className="text-[10px] text-muted-foreground">{items.length} recent</span>
                </div>
                <div className="max-h-[380px] overflow-y-auto scrollbar-thin">
                    {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-6 text-center">No activity yet.</p>
                    ) : (
                        items.map((it) => {
                            const isYou = it.actor_id === user?.id;
                            const name = isYou ? "You" : profiles[it.actor_id] ?? "Someone";
                            const meta = it.metadata as { title?: string } | null;
                            return (
                                <div
                                    key={it.id}
                                    className="px-3 py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                                >
                                    <p className="text-xs leading-snug">
                                        <span className={isYou ? "text-muted-foreground" : "font-medium"}>{name}</span>{" "}
                                        <span className="text-muted-foreground">{it.action}</span>
                                        {meta?.title && (
                                            <span className="text-foreground"> "{meta.title}"</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
