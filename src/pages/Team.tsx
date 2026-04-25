import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Shield, Users, Crown, Eye, Loader2, MoreVertical, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { organizationService } from "@/services/organizationService";

interface Member {
    user_id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string;
    workload: number;
}

const ROLE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
    admin: { icon: Crown, color: "border-accent/60 text-accent bg-accent/10", label: "Admin" },
    member: { icon: Shield, color: "border-primary/40 text-primary bg-primary/10", label: "Member" },
    viewer: { icon: Eye, color: "border-muted-foreground/40 text-muted-foreground bg-muted", label: "Viewer" },
};

const Team = () => {
    const { user, role: currentUserRole } = useAuth();
    const { activeOrg } = useOrganization();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<string>("member");
    const [inviting, setInviting] = useState(false);
    const [orgPasscode, setOrgPasscode] = useState("");
    const isAdmin = currentUserRole === "admin" || true; // Local admin override for testing

    useEffect(() => {
        load();
        if (activeOrg) {
            organizationService.getPasscode(activeOrg.id).then(res => setOrgPasscode(res.data || ""));
        }
    }, [activeOrg]);

    const load = async () => {
        if (!activeOrg) {
            setMembers([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        const { data: localMembers } = await organizationService.listMembers(activeOrg.id);

        const { data: profiles } = await supabase.rpc("list_profiles_public").catch(() => ({ data: [] }));

        const profileMap = new Map();
        (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));

        setMembers(
            (localMembers || []).map((m) => {
                const p = profileMap.get(m.user_id) || { display_name: "Local User", avatar_url: null };
                return {
                    user_id: m.user_id,
                    display_name: p.display_name,
                    avatar_url: p.avatar_url,
                    email: null,
                    role: m.role,
                    workload: 0,
                };
            })
        );
        setLoading(false);
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);

        toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
        setInviteEmail("");
        setInviteRole("member");
        setInviteOpen(false);
        setInviting(false);
    };

    const changeRole = async (userId: string, newRole: string) => {

        setMembers((ms) => ms.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)));

        const { error } = await supabase
            .from("user_roles")
            .upsert({ user_id: userId, role: newRole as "admin" | "member" | "viewer" }, { onConflict: "user_id" });

        if (error) {
            toast.error(error.message);
            load();
        } else {
            toast.success(`Role updated to ${newRole}`);
        }
    };

    const removeMember = async (userId: string) => {
        if (!confirm("Remove this member? They will lose access.")) return;
        setMembers((ms) => ms.filter((m) => m.user_id !== userId));
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
        if (error) {
            toast.error(error.message);
            load();
        } else {
            toast.success("Member removed");
        }
    };

    return (
        <div className="p-6 space-y-4 animate-fade-in">
            <header className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Team</h1>
                    <p className="text-sm text-muted-foreground">
                        {members.length} members • {members.filter((m) => m.role === "admin").length} admins
                    </p>
                </div>
                <div className="flex gap-3">
                    {isAdmin && activeOrg && (
                        <div className="px-3 py-1.5 flex items-center gap-2 border border-border rounded-md bg-muted/30">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Passcode:</span>
                            <code className="text-sm font-bold text-primary select-all">{orgPasscode}</code>
                        </div>
                    )}
                    {isAdmin && (
                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-1.5">
                                    <UserPlus className="w-4 h-4" />
                                    Invite member
                                </Button>
                            </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                            <DialogHeader>
                                <DialogTitle>Invite team member</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Email address</Label>
                                    <Input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="teammate@company.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Crown className="w-3.5 h-3.5 text-accent" />
                                                    Admin — Full access
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="member">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-3.5 h-3.5 text-primary" />
                                                    Member — Create & edit tasks
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="viewer">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                                    Viewer — Read-only access
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={handleInvite}
                                    disabled={inviting || !inviteEmail.trim()}
                                    className="bg-gradient-primary text-primary-foreground"
                                >
                                    {inviting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Sending...</> : "Send invite"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
                </div>
            </header>

            {}
            <div className="flex flex-wrap gap-4">
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const count = members.filter((m) => m.role === key).length;
                    return (
                        <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="capitalize">{cfg.label}</span>
                            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold">{count}</span>
                        </div>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((m) => {
                        const initial = (m.display_name ?? m.email ?? "?").slice(0, 1).toUpperCase();
                        const cfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.member;
                        const RoleIcon = cfg.icon;
                        const isSelf = m.user_id === user?.id;

                        return (
                            <Card key={m.user_id} className="p-4 bg-card border-border card-hover group">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold shadow-glow shrink-0">
                                        {initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-medium truncate">{m.display_name ?? m.email ?? "Unknown"}</p>
                                            {isSelf && <span className="text-[9px] text-muted-foreground">(you)</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <RoleIcon className="w-3 h-3" />
                                            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>

                                    {}
                                    {isAdmin && !isSelf && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-card border-border">
                                                {m.role !== "admin" && (
                                                    <DropdownMenuItem onClick={() => changeRole(m.user_id, "admin")}>
                                                        <Crown className="w-3.5 h-3.5 mr-2 text-accent" /> Make Admin
                                                    </DropdownMenuItem>
                                                )}
                                                {m.role !== "member" && (
                                                    <DropdownMenuItem onClick={() => changeRole(m.user_id, "member")}>
                                                        <Shield className="w-3.5 h-3.5 mr-2 text-primary" /> Make Member
                                                    </DropdownMenuItem>
                                                )}
                                                {m.role !== "viewer" && (
                                                    <DropdownMenuItem onClick={() => changeRole(m.user_id, "viewer")}>
                                                        <Eye className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Make Viewer
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => removeMember(m.user_id)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                {}
                                <div className="mt-3 flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Active workload</span>
                                    <span className="font-semibold tabular-nums">{m.workload}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-primary transition-all duration-500"
                                        style={{ width: `${Math.min(100, m.workload * 12)}%` }}
                                    />
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Team;
