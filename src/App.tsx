import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/hooks/useOrganization";
import { ThemeProvider } from "@/hooks/useTheme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Board from "./pages/Board";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const Workflows = lazy(() => import("./pages/Workflows"));
const AuditLog = lazy(() => import("./pages/AuditLog"));

const LazyFallback = () => (
    <div className="min-h-[200px] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

const App = () => (
    <ErrorBoundary>
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <Toaster />
                    <SonnerWithTheme />
                <BrowserRouter
                    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                >
                    <AuthProvider>
                        <OrganizationProvider>
                            <Routes>
                                <Route path="/auth" element={<Auth />} />
                                <Route
                                    path="/"
                                    element={
                                        <ProtectedRoute>
                                            <AppLayout><Dashboard /></AppLayout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/tasks"
                                    element={
                                        <ProtectedRoute>
                                            <AppLayout><Tasks /></AppLayout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/board"
                                    element={
                                        <ProtectedRoute>
                                            <AppLayout><Board /></AppLayout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/workflows"
                                    element={
                                        <ProtectedRoute>
                                            <AppLayout>
                                                <Suspense fallback={<LazyFallback />}>
                                                    <Workflows />
                                                </Suspense>
                                            </AppLayout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/team"
                                    element={
                                        <ProtectedRoute>
                                            <AppLayout><Team /></AppLayout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/settings"
                                    element={
                                        <ProtectedRoute>
                                            <AppLayout><Settings /></AppLayout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/audit"
                                    element={
                                        <ProtectedRoute>
                                            <AppLayout>
                                                <Suspense fallback={<LazyFallback />}>
                                                    <AuditLog />
                                                </Suspense>
                                            </AppLayout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </OrganizationProvider>
                    </AuthProvider>
                </BrowserRouter>
                </TooltipProvider>
            </QueryClientProvider>
        </ThemeProvider>
    </ErrorBoundary>
);

const SonnerWithTheme = () => {

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    return <Sonner theme={isDark ? "dark" : "light"} />;
};

export default App;
