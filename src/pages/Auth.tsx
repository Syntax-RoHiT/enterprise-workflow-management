import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, AlertCircle, Mail, Info } from "lucide-react";

type BannerStatus =
    | { kind: "info"; title: string; message: string }
    | { kind: "success"; title: string; message: string }
    | { kind: "warning"; title: string; message: string }
    | { kind: "error"; title: string; message: string };

const Auth = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [banner, setBanner] = useState<BannerStatus>({
        kind: "info",
        title: "Email auto-confirm is ON",
        message:
            "Your email is confirmed instantly on signup — no inbox check needed. Sign in right after creating your account.",
    });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate("/", { replace: true });
        });
    }, [navigate]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes("email not confirmed")) {
                setBanner({
                    kind: "warning",
                    title: "Email not confirmed",
                    message:
                        "This account was created before auto-confirm was enabled. Click 'Resend confirmation' below, or sign up again with a different email.",
                });
            } else if (msg.includes("invalid login")) {
                setBanner({
                    kind: "error",
                    title: "Wrong email or password",
                    message: "Double-check your credentials. If you forgot, sign up with a new email — accounts are auto-confirmed.",
                });
            } else {
                setBanner({ kind: "error", title: "Sign-in failed", message: error.message });
            }
            return toast.error(error.message);
        }
        setBanner({ kind: "success", title: "Signed in", message: "Welcome back. Redirecting..." });
        toast.success("Welcome back");
        navigate("/", { replace: true });
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
                data: { display_name: name || email.split("@")[0] },
            },
        });
        setLoading(false);
        if (error) {
            setBanner({ kind: "error", title: "Sign-up failed", message: error.message });
            return toast.error(error.message);
        }
        if (data.session) {
            setBanner({
                kind: "success",
                title: "Email auto-confirmed ✓",
                message: "Your account is verified instantly. Redirecting to your workspace...",
            });
            toast.success("Account created. You're in.");
            navigate("/", { replace: true });
        } else {
            setBanner({
                kind: "warning",
                title: "Confirmation email sent",
                message:
                    "Check your inbox to confirm your email, then return here to sign in. If it doesn't arrive, check spam or try resending.",
            });
            toast.message("Check your inbox to confirm your email.");
        }
    };

    const handleResend = async () => {
        if (!email) {
            setBanner({ kind: "error", title: "Email required", message: "Enter your email above first." });
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: `${window.location.origin}/` },
        });
        setLoading(false);
        if (error) {
            setBanner({ kind: "error", title: "Couldn't resend", message: error.message });
            return toast.error(error.message);
        }
        setBanner({
            kind: "success",
            title: "Confirmation sent",
            message: `A new confirmation link was sent to ${email}. Check your inbox and spam folder.`,
        });
        toast.success("Confirmation email sent");
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
            <div className="w-full max-w-md relative">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-primary mb-4 shadow-glow">
                        <Sparkles className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">Nexus</h1>
                    <p className="text-muted-foreground mt-2">Tasks & workflows for fast teams</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    {(() => {
                        const styles =
                            banner.kind === "success"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : banner.kind === "warning"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                    : banner.kind === "error"
                                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                                        : "border-primary/30 bg-primary/10 text-primary";
                        const Icon =
                            banner.kind === "success"
                                ? CheckCircle2
                                : banner.kind === "warning"
                                    ? Mail
                                    : banner.kind === "error"
                                        ? AlertCircle
                                        : Info;
                        return (
                            <div className={`mb-5 rounded-lg border p-3 flex gap-2.5 ${styles}`}>
                                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                                <div className="text-xs leading-relaxed">
                                    <div className="font-semibold mb-0.5">{banner.title}</div>
                                    <div className="opacity-90">{banner.message}</div>
                                    {banner.kind === "warning" && banner.title === "Email not confirmed" && (
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={loading}
                                            className="mt-2 underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
                                        >
                                            Resend confirmation email
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                    <Tabs defaultValue="signin" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="signin">Sign in</TabsTrigger>
                            <TabsTrigger value="signup">Sign up</TabsTrigger>
                        </TabsList>

                        <TabsContent value="signin">
                            <form onSubmit={handleSignIn} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-in">Email</Label>
                                    <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password-in">Password</Label>
                                    <Input id="password-in" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium shadow-glow">
                                    {loading ? "Signing in..." : "Sign in"}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form onSubmit={handleSignUp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name-up">Display name</Label>
                                    <Input id="name-up" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email-up">Email</Label>
                                    <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password-up">Password</Label>
                                    <Input id="password-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium shadow-glow">
                                    {loading ? "Creating..." : "Create account"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default Auth;
