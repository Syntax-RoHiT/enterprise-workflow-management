import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
    Background,
    Controls,
    Connection,
    Edge,
    Node,
    addEdge,
    useEdgesState,
    useNodesState,
    MarkerType,
    ReactFlowProvider,
    useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Save, Play, Zap, GitBranch, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Workflow {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
}

const NODE_DEFS = [
    { type: "trigger", label: "Trigger", icon: Zap, color: "hsl(190 95% 55%)" },
    { type: "condition", label: "Condition", icon: GitBranch, color: "hsl(38 92% 55%)" },
    { type: "action", label: "Action", icon: Settings2, color: "hsl(270 90% 65%)" },
];

const initial: Node[] = [
    {
        id: "1",
        type: "default",
        position: { x: 100, y: 120 },
        data: { label: "⚡ Trigger: Task created" },
        style: nodeStyle("hsl(190 95% 55%)"),
    },
    {
        id: "2",
        type: "default",
        position: { x: 400, y: 120 },
        data: { label: "⚙ Action: Notify assignee" },
        style: nodeStyle("hsl(270 90% 65%)"),
    },
];

function nodeStyle(color: string): React.CSSProperties {
    return {
        background: "hsl(222 40% 9%)",
        color: "white",
        border: `1px solid ${color}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        fontWeight: 500,
        boxShadow: `0 0 20px ${color}33`,
    };
}

const Inner = () => {
    const { user } = useAuth();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [name, setName] = useState("Untitled workflow");
    const [nodes, setNodes, onNodesChange] = useNodesState(initial);
    const [edges, setEdges, onEdgesChange] = useEdgesState([
        { id: "e1-2", source: "1", target: "2", animated: true, style: { stroke: "hsl(190 95% 55%)" } },
    ]);
    const [simulating, setSimulating] = useState(false);
    const idRef = useRef(3);
    const { project } = useReactFlow();

    useEffect(() => {
        loadList();
    }, []);

    const loadList = async () => {
        const { data } = await supabase.from("workflows").select("*").order("created_at", { ascending: false });
        setWorkflows((data ?? []) as unknown as Workflow[]);
    };

    const loadWorkflow = (w: Workflow) => {
        setActiveId(w.id);
        setName(w.name);
        setNodes((w.nodes as Node[]) ?? []);
        setEdges((w.edges as Edge[]) ?? []);
    };

    const onConnect = useCallback(
        (c: Connection) =>
            setEdges((eds) =>
                addEdge(
                    { ...c, animated: true, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(190 95% 55%)" } },
                    eds,
                ),
            ),
        [setEdges],
    );

    const addNode = (type: string, color: string, label: string) => {
        const id = String(idRef.current++);
        const center = project({ x: 300, y: 200 });
        setNodes((ns) => [
            ...ns,
            {
                id,
                type: "default",
                position: { x: center.x + Math.random() * 80, y: center.y + Math.random() * 80 },
                data: { label: `${type === "trigger" ? "⚡" : type === "condition" ? "❓" : "⚙"} ${label}` },
                style: nodeStyle(color),
            },
        ]);
    };

    const validate = () => {
        const triggerIds = nodes.filter((n) => String(n.data?.label).startsWith("⚡")).map((n) => n.id);
        if (triggerIds.length === 0) return "Add at least one trigger node.";
        const reachable = new Set(triggerIds);
        let changed = true;
        while (changed) {
            changed = false;
            edges.forEach((e) => {
                if (reachable.has(e.source) && !reachable.has(e.target)) {
                    reachable.add(e.target);
                    changed = true;
                }
            });
        }
        const orphans = nodes.filter((n) => !reachable.has(n.id));
        if (orphans.length) return `${orphans.length} node(s) not reachable from a trigger.`;
        return null;
    };

    const save = async () => {
        if (!user) return;
        const err = validate();
        if (err) return toast.error(err);
        const payload = { name, nodes: nodes as never, edges: edges as never };
        if (activeId) {
            const { error } = await supabase.from("workflows").update(payload).eq("id", activeId);
            if (error) return toast.error(error.message);
            toast.success("Workflow saved");
        } else {
            const { data, error } = await supabase
                .from("workflows")
                .insert({ ...payload, created_by: user.id })
                .select()
                .single();
            if (error) return toast.error(error.message);
            if (data) setActiveId(data.id);
            toast.success("Workflow created");
        }
        loadList();
    };

    const simulate = async () => {
        const err = validate();
        if (err) return toast.error(err);
        setSimulating(true);
        const order: string[] = [];
        const queue = nodes.filter((n) => String(n.data?.label).startsWith("⚡")).map((n) => n.id);
        const seen = new Set<string>();
        while (queue.length) {
            const id = queue.shift()!;
            if (seen.has(id)) continue;
            seen.add(id);
            order.push(id);
            edges.filter((e) => e.source === id).forEach((e) => queue.push(e.target));
        }
        for (const id of order) {
            setNodes((ns) =>
                ns.map((n) =>
                    n.id === id
                        ? { ...n, style: { ...n.style, boxShadow: "0 0 25px hsl(142 76% 45% / 0.8)", borderColor: "hsl(142 76% 45%)" } }
                        : n,
                ),
            );
            await new Promise((r) => setTimeout(r, 700));
        }
        toast.success(`Simulation complete (${order.length} steps)`);
        setSimulating(false);
    };

    const newWorkflow = () => {
        setActiveId(null);
        setName("Untitled workflow");
        setNodes(initial);
        setEdges([{ id: "e1-2", source: "1", target: "2", animated: true, style: { stroke: "hsl(190 95% 55%)" } }]);
    };

    const remove = async (id: string) => {
        await supabase.from("workflows").delete().eq("id", id);
        if (id === activeId) newWorkflow();
        loadList();
    };

    return (
        <div className="p-6 space-y-4 animate-fade-in h-full flex flex-col">
            <header className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Workflow Engine</h1>
                    <p className="text-sm text-muted-foreground">Visual builder for automation flows</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={newWorkflow}><Plus className="w-4 h-4 mr-1" /> New</Button>
                    <Button variant="outline" onClick={simulate} disabled={simulating}>
                        <Play className="w-4 h-4 mr-1" /> {simulating ? "Running..." : "Simulate"}
                    </Button>
                    <Button onClick={save} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                        <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 flex-1 min-h-0">
                <div className="space-y-3">
                    <Card className="p-3 bg-card border-border">
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" />
                    </Card>

                    <Card className="p-3 bg-card border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Add node</p>
                        <div className="space-y-1.5">
                            {NODE_DEFS.map((d) => (
                                <button
                                    key={d.type}
                                    onClick={() => addNode(d.type, d.color, d.label)}
                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted text-sm transition-colors"
                                    style={{ borderLeft: `2px solid ${d.color}` }}
                                >
                                    <d.icon className="w-3.5 h-3.5" style={{ color: d.color }} />
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-3 bg-card border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Saved</p>
                        {workflows.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No workflows yet.</p>
                        ) : (
                            <ul className="space-y-1 max-h-[300px] overflow-auto scrollbar-thin">
                                {workflows.map((w) => (
                                    <li key={w.id} className="flex items-center gap-1">
                                        <button
                                            onClick={() => loadWorkflow(w)}
                                            className={`flex-1 text-left text-xs px-2 py-1.5 rounded truncate ${activeId === w.id ? "bg-primary/15 text-primary" : "hover:bg-muted"
                                                }`}
                                        >
                                            {w.name}
                                        </button>
                                        <button onClick={() => remove(w.id)} className="p-1 hover:text-destructive">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                <Card className="bg-card border-border overflow-hidden min-h-[500px]">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        fitView
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="hsl(0 0% 100% / 0.06)" gap={20} />
                        <Controls className="!bg-card !border-border" />
                    </ReactFlow>
                </Card>
            </div>
        </div>
    );
};

const Workflows = () => (
    <ReactFlowProvider>
        <Inner />
    </ReactFlowProvider>
);

export default Workflows;
