import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
    const location = useLocation();

    useEffect(() => {
        console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-background">
            <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
            <div className="text-center relative animate-fade-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-primary mb-6 shadow-glow">
                    <Sparkles className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="mb-2 text-6xl font-bold gradient-text tracking-tight">404</h1>
                <p className="mb-6 text-base text-muted-foreground">
                    This page drifted into the void.
                </p>
                <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                    <Link to="/">Return home</Link>
                </Button>
            </div>
        </div>
    );
};

export default NotFound;
