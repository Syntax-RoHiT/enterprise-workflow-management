// Lovable AI: suggest a priority + 1-line reasoning for a task.
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { title, description } = await req.json();
        if (!title) {
            return new Response(JSON.stringify({ error: "title required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
            return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                    {
                        role: "system",
                        content:
                            "You triage product tasks. Reply ONLY with strict JSON: {\"priority\":\"low|medium|high\",\"reason\":\"<=14 words\"}.",
                    },
                    {
                        role: "user",
                        content: `Title: ${title}\nDescription: ${description ?? "(none)"}`,
                    },
                ],
            }),
        });

        if (res.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        if (res.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
                status: 402,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        if (!res.ok) {
            const t = await res.text();
            return new Response(JSON.stringify({ error: `AI error: ${t}` }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const json = await res.json();
        const text: string = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: { priority?: string; reason?: string } = {};
        try {
            const match = text.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : {};
        } catch {
            parsed = {};
        }
        const priority = ["low", "medium", "high"].includes(parsed.priority ?? "")
            ? parsed.priority
            : "medium";
        return new Response(
            JSON.stringify({ priority, reason: parsed.reason ?? "Auto-suggested." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
