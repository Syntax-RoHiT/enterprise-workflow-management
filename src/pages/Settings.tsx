import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, THEMES, type ThemeId } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { EmailConfirmationStatus } from "@/components/EmailConfirmationStatus";
import {
    User, Shield, Palette, Bell, AlertTriangle,
    Check, Monitor, LogOut, Trash2, Lock,
} from "lucide-react";

const Settings = () => {
    const { user, role, signOut } = useAuth();
    const { theme, useSystemTheme, setTheme, setUseSystemTheme } = useTheme();
    const [displayName, setDisplayName] = useState("");
    const [notif, setNotif] = useState(true);
    const [emailDigest, setEmailDigest] = useState(false);
    const [compactMode, setCompactMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPw, setChangingPw] = useState(false);

    useEffect(() => {
        if (!user) return;
        supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .maybeSingle()
            .then(({ data }) => setDisplayName(data?.display_name ?? ""));
        setNotif(localStorage.getItem("notifications") !== "false");
        setEmailDigest(localStorage.getItem("emailDigest") === "true");
        setCompactMode(localStorage.getItem("compactMode") === "true");
    }, [user]);

    const save = async () => {
        if (!user) return;
        setSaving(true);
        const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
        localStorage.setItem("notifications", String(notif));
        localStorage.setItem("emailDigest", String(emailDigest));
        localStorage.setItem("compactMode", String(compactMode));
        setSaving(false);
        if (error) return toast.error(error.message);
        toast.success("Settings saved");
    };

    const changePassword = async () => {
        if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
        if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
        setChangingPw(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setChangingPw(false);
        if (error) return toast.error(error.message);
        setNewPassword("");
        setConfirmPassword("");
        toast.success("Password updated");
    };

    const deleteAccount = async () => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;
        toast.error("Account deletion requires admin assistance. Contact support.");
    };

    const roleBadge = (r: string | null) => {
        const colors = {
            admin: "border-accent/60 text-accent bg-accent/10",
            member: "border-primary/40 text-primary bg-primary/10",
            viewer: "border-muted-foreground/40 text-muted-foreground bg-muted",
        };
        return colors[(r as keyof typeof colors) ?? "member"] ?? colors.member;
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in max-w-3xl">
            <header>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your profile, appearance, and preferences</p>
            </header>

            {}
            <Card className="p-5 bg-card border-border space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Profile</h2>
                </div>
                <EmailConfirmationStatus />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user?.email ?? ""} disabled className="opacity-60" />
                    </div>
                    <div className="space-y-2">
                        <Label>Display name</Label>
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Role</Label>
                    <div>
                        <span className={`text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full border ${roleBadge(role)}`}>
                            {role ?? "member"}
                        </span>
                    </div>
                </div>
            </Card>

            {}
            <Card className="p-5 bg-card border-border space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Palette className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Appearance</h2>
                </div>

                {}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">Use system theme</p>
                            <p className="text-xs text-muted-foreground">Auto-switch based on your OS preference</p>
                        </div>
                    </div>
                    <Switch checked={useSystemTheme} onCheckedChange={setUseSystemTheme} />
                </div>

                {}
                <div>
                    <p className="text-xs text-muted-foreground mb-3">
                        {useSystemTheme ? "System mode active — manual selection disabled" : "Select your preferred theme"}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {THEMES.map((t) => {
                            const isActive = !useSystemTheme && theme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    disabled={useSystemTheme}
                                    onClick={() => setTheme(t.id as ThemeId)}
                                    className={`group relative rounded-xl border-2 p-3 text-left transition-all
                                        ${isActive
                                            ? "border-primary shadow-glow scale-[1.02]"
                                            : "border-border hover:border-primary/40"
                                        }
                                        ${useSystemTheme ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                                    `}
                                >
                                    {}
                                    <div
                                        className="h-16 rounded-lg mb-2 flex items-end p-2 gap-1.5"
                                        style={{ background: t.bgPreview }}
                                    >
                                        <div className="w-6 h-6 rounded-md" style={{ background: t.accent }} />
                                        <div className="w-6 h-6 rounded-md" style={{ background: t.accentAlt }} />
                                        <div className="flex-1" />
                                        <div
                                            className="h-2 w-10 rounded-full"
                                            style={{
                                                background: `linear-gradient(90deg, ${t.accent}, ${t.accentAlt})`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{t.name}</p>
                                            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{t.mode}</p>
                                        </div>
                                        {isActive && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                <Check className="w-3 h-3 text-primary-foreground" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                        <p className="text-sm font-medium">Compact mode</p>
                        <p className="text-xs text-muted-foreground">Reduce spacing and padding across the UI</p>
                    </div>
                    <Switch checked={compactMode} onCheckedChange={setCompactMode} />
                </div>
            </Card>

            {}
            <Card className="p-5 bg-card border-border space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Account Security</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label>New password</Label>
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirm password</Label>
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={changePassword}
                    disabled={changingPw || !newPassword}
                    className="gap-1.5"
                >
                    <Lock className="w-3.5 h-3.5" />
                    {changingPw ? "Updating..." : "Update password"}
                </Button>
            </Card>

            {}
            <Card className="p-5 bg-card border-border space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Notifications</h2>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">In-app notifications</p>
                        <p className="text-xs text-muted-foreground">Activity alerts and task updates</p>
                    </div>
                    <Switch checked={notif} onCheckedChange={setNotif} />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Email digest</p>
                        <p className="text-xs text-muted-foreground">Weekly summary of team activity</p>
                    </div>
                    <Switch checked={emailDigest} onCheckedChange={setEmailDigest} />
                </div>
            </Card>

            {}
            <Card className="p-5 bg-card border-destructive/30 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <h2 className="font-semibold text-destructive">Danger Zone</h2>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Sign out everywhere</p>
                        <p className="text-xs text-muted-foreground">End all active sessions on other devices</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                    </Button>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Delete account</p>
                        <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={deleteAccount} className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                    </Button>
                </div>
            </Card>

            {}
            <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                {saving ? "Saving..." : "Save changes"}
            </Button>
        </div>
    );
};

export default Settings;
