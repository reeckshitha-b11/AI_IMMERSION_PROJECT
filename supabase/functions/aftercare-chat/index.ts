import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ChatMessage = { role: "patient" | "assistant"; content: string };

function buildReply(message: string, history: ChatMessage[]): string {
  const text = message.toLowerCase();
  if (history.filter((item) => item.role === "patient").length === 1) {
    return "Thank you for sharing that. What felt easiest or most difficult about the activity?";
  }
  if (text.includes("pain") || text.includes("hurt") || text.includes("difficult") || text.includes("stiff")) {
    return "I hear that this was difficult. Can you tell me when you noticed it and what you noticed, in your own words? I will include exactly what you share for your doctor to review.";
  }
  if (text.includes("question") || text.includes("why") || text.includes("when") || text.includes("should") || text.includes("expected")) {
    return "That is a helpful question. I will note it for your doctor. Is there anything else you would like them to know about your activity today?";
  }
  if (text.includes("fine") || text.includes("good") || text.includes("okay") || text.includes("completed")) {
    return "I am glad you were able to share an update. Did anything feel different from your previous activity attempt?";
  }
  return "Thank you. What is the main concern or question you would like your doctor to see in your check-in?";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const body = await req.json() as { message?: string; history?: ChatMessage[] };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];
    if (!message) return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ reply: buildReply(message, history) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Unable to process this check-in" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
