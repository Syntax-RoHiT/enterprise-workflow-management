import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Mail, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Status = "loading" | "confirmed" | "pending" | "no_user";

interface Props {
    
    compact?: boolean;
    
    emailHint?: string;
}

export function EmailConfirmationStatus({ compact = false, emailHint }: Props) {
    const [status, setStatus] = useState<Status>("loading");
    const [email, setEmail] = useState<string>("");
    const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
    const [resending, setResending] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const refresh = async () => {
        const { data, error } = await supabase.auth.getUser();
        setLastChecked(new Date());
        if (error || !data.user) {
            setStatus(emailHint ? "pending" : "no_user");
            setEmail(emailHint ?? "");
            setConfirmedAt(null);
            return;
        }
        const u = data.user;
        setEmail(u.email ?? emailHint ?? "");
        const isConfirmed = Boolean(u.email_confirmed_at ?? u.confirmed_at);
        setConfirmedAt(u.email_confirmed_at ?? u.confirmed_at ?? null);
        setStatus(isConfirmed ? "confirmed" : "pending");
    };

    useEffect(() => {
        refresh();
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (
                event === "USER_UPDATED" ||
                event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "INITIAL_SESSION"
            ) {
                refresh();
            }
            if (event === "SIGNED_OUT") {
                setStatus("no_user");
                setEmail("");
                setConfirmedAt(null);
            }
        });
        const interval = setInterval(() => {
            if (status === "pending") refresh();
        }, 15000);
        return () => {
            sub.subscription.unsubscribe();
            clearInterval(interval);
        };
    }, [emailHint]);

    const resend = async () => {
        if (!email) {
            toast.error("No email address to resend to.");
            return;
        }
        setResending(true);
        const { error } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: `${window.location.origin}/` },
        });
        setResending(false);
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success(`Confirmation email re-sent to ${email}`);
        refresh();
    };

    if (compact) {
        const dot =
            status === "confirmed"
                ? "bg-emerald-400"
                : status === "pending"
                    ? "bg-amber-400 animate-pulse"
                    : status === "loading"
                        ? "bg-muted-foreground animate-pulse"
                        : "bg-muted-foreground";
        const label =
            status === "confirmed"
                ? "Email verified"
                : status === "pending"
                    ? "Email pending"
                    : status === "loading"
                        ? "Checking..."
                        : "Not signed in";
        return (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-muted/30 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                <span className="text-muted-foreground">{label}</span>
            </div>
        );
    }
    const palette =
        status === "confirmed"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : status === "pending"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-muted/20";

    return (
        <div className={`rounded-lg border p-4 ${palette}`}>
            <div className="flex items-start gap-3">
                <div className="mt-0.5">
                    {status === "loading" && <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />}
                    {status === "confirmed" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {status === "pending" && <Mail className="w-5 h-5 text-amber-400" />}
                    {status === "no_user" && <AlertCircle className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">
                            {status === "loading" && "Checking email status..."}
                            {status === "confirmed" && "Email confirmed"}
                            {status === "pending" && "Email confirmation pending"}
                            {status === "no_user" && "Not signed in"}
                        </h3>
                        {status === "confirmed" && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Verified
                            </span>
                        )}
                        {status === "pending" && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Action needed
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 break-all">
                        {email || "No email on record"}
                    </p>
                    {status === "confirmed" && confirmedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Verified on {new Date(confirmedAt).toLocaleString()}
                        </p>
                    )}
                    {status === "pending" && (
                        <>
                            <p className="text-xs text-muted-foreground mt-2">
                                We're auto-checking every 15s. You can also resend the confirmation email below or check your spam folder.
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                                <Button size="sm" variant="outline" onClick={resend} disabled={resending}>
                                    {resending ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Resending...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-3 h-3 mr-1.5" /> Resend email
                                        </>
                                    )}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={refresh}>
                                    Check now
                                </Button>
                            </div>
                        </>
                    )}
                    {lastChecked && (
                        <p className="text-[10px] text-muted-foreground/70 mt-2">
                            Last checked {lastChecked.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}