import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette } from "./CommandPalette";
import { NotificationsBell } from "./NotificationsBell";
import { EmailConfirmationStatus } from "./EmailConfirmationStatus";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Search, LogOut } from "lucide-react";

export default function AppLayout({ children }: { children: ReactNode }) {
    const { user, signOut } = useAuth();

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger />
                            <button
                                type="button"
                                onClick={() => {
                                    const isMac = navigator.platform.toLowerCase().includes("mac");
                                    const ev = new KeyboardEvent("keydown", {
                                        key: "k",
                                        metaKey: isMac,
                                        ctrlKey: !isMac,
                                        bubbles: true,
                                    });
                                    document.dispatchEvent(ev);
                                }}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <Search className="w-3.5 h-3.5" />
                                <span>Search...</span>
                                <kbd className="ml-4 text-[10px] px-1.5 py-0.5 rounded bg-background border border-border">⌘K</kbd>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
                            <div className="hidden md:block">
                                <EmailConfirmationStatus compact />
                            </div>
                            <NotificationsBell />
                            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
                </div>
                <CommandPalette />
            </div>
        </SidebarProvider>
    );
}