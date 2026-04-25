import { LayoutDashboard, ListChecks, KanbanSquare, GitBranch, Users, Settings, Sparkles, Shield, ChevronsUpDown, Building2 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle, KeyRound } from "lucide-react";
import { useState } from "react";
import { organizationService } from "@/services/organizationService";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const baseItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tasks", url: "/tasks", icon: ListChecks },
    { title: "Board", url: "/board", icon: KanbanSquare },
    { title: "Workflows", url: "/workflows", icon: GitBranch },
    { title: "Team", url: "/team", icon: Users },
    { title: "Settings", url: "/settings", icon: Settings },
];

const adminItems = [
    { title: "Audit Log", url: "/audit", icon: Shield },
];

export function AppSidebar() {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";
    const { pathname } = useLocation();
    const { role, user } = useAuth();
    const { organizations, activeOrg, setActiveOrgId } = useOrganization();
    const items = [...baseItems, ...(role === 'admin' ? adminItems : [])];

    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [joinOpen, setJoinOpen] = useState(false);
    const [orgName, setOrgName] = useState("");
    const [passcode, setPasscode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateOrg = async () => {
        if (!orgName.trim() || !user) return;
        setIsSubmitting(true);
        const { data, error } = await organizationService.create(orgName, user.id);
        setIsSubmitting(false);
        if (error) {
            toast.error(error.message);
        } else if (data) {
            toast.success("Organization created");
            setCreateOpen(false);
            setOrgName("");
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            setActiveOrgId(data.id);
        }
    };

    const handleJoinOrg = async () => {
        if (!passcode.trim() || !user) return;
        setIsSubmitting(true);
        const { data, error } = await organizationService.joinWithPasscode(passcode, user.id);
        setIsSubmitting(false);
        if (error) {
            toast.error(error.message);
        } else if (data) {
            toast.success(`Joined ${data.name}`);
            setJoinOpen(false);
            setPasscode("");
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            setActiveOrgId(data.id);
        }
    };

    return (
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
            <SidebarHeader className="p-4 space-y-3">
                {}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    {!collapsed && <span className="font-semibold text-sidebar-foreground tracking-tight">Nexus</span>}
                </div>

                {}
                {!collapsed && organizations.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="w-full flex items-center gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 text-left hover:bg-sidebar-accent/50 transition-colors"
                            >
                                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate text-sidebar-foreground">
                                        {activeOrg?.name ?? "Select organization"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {activeOrg?.slug ?? ""}
                                    </p>
                                </div>
                                <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 bg-card border-border">
                            {organizations.map((org) => (
                                <DropdownMenuItem
                                    key={org.id}
                                    onClick={() => setActiveOrgId(org.id)}
                                    className={org.id === activeOrg?.id ? "bg-sidebar-accent" : ""}
                                >
                                    <Building2 className="w-3.5 h-3.5 mr-2" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{org.name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{org.slug}</p>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                                <PlusCircle className="w-3.5 h-3.5 mr-2" />
                                <span>Create Organization</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setJoinOpen(true)}>
                                <KeyRound className="w-3.5 h-3.5 mr-2" />
                                <span>Join with Passcode</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => {
                                const active = pathname === item.url;
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={active}>
                                            <NavLink
                                                to={item.url}
                                                end
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 rounded-md px-2 py-2 transition-colors ${isActive
                                                        ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                                                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                                                    }`
                                                }
                                            >
                                                <item.icon className="w-4 h-4 shrink-0" />
                                                {!collapsed && <span className="text-sm">{item.title}</span>}
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Organization</DialogTitle>
                        <DialogDescription>
                            Create a new workspace for your team. You will be assigned as the admin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Organization Name</Label>
                            <Input 
                                placeholder="e.g. Acme Corp" 
                                value={orgName} 
                                onChange={e => setOrgName(e.target.value)} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateOrg} disabled={isSubmitting || !orgName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {}
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Join Organization</DialogTitle>
                        <DialogDescription>
                            Enter the 6-character passcode provided by your organization admin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Passcode</Label>
                            <Input 
                                placeholder="e.g. ABCDEF" 
                                className="uppercase"
                                value={passcode} 
                                onChange={e => setPasscode(e.target.value.toUpperCase())} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
                        <Button onClick={handleJoinOrg} disabled={isSubmitting || !passcode.trim()}>
                            Join
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sidebar>
    );
}