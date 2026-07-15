import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractedInteraction {
  hcp_name: string | null;
  hospital: string | null;
  visit_date: string | null;
  products_discussed: string[];
  samples_given: number;
  feedback: string | null;
  interest_level: "high" | "medium" | "low" | "neutral" | null;
  follow_up_date: string | null;
  notes: string | null;
  ai_summary: string;
  sentiment: "positive" | "neutral" | "negative" | null;
  next_action: string;
}

interface CurrentData {
  hcp_name?: string | null;
  hospital?: string | null;
  visit_date?: string | null;
  products_discussed?: string[];
  samples_given?: number;
  feedback?: string | null;
  interest_level?: "high" | "medium" | "low" | "neutral";
  follow_up_date?: string | null;
  notes?: string | null;
}

function extractDate(text: string): string | null {
  const today = new Date();
  const lower = text.toLowerCase();

  if (lower.includes("today")) return today.toISOString().split("T")[0];
  if (lower.includes("yesterday")) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }

  const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (nextDayMatch) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDay = days.indexOf(nextDayMatch[1]);
    const d = new Date(today);
    const diff = (targetDay - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }

  const inDaysMatch = lower.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
    return d.toISOString().split("T")[0];
  }

  const nextWeekMatch = lower.match(/next\s+week/);
  if (nextWeekMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }

  const dateMatch = lower.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) return dateMatch[1];

  const slashDateMatch = lower.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashDateMatch) {
    const month = slashDateMatch[1].padStart(2, "0");
    const day = slashDateMatch[2].padStart(2, "0");
    let year = slashDateMatch[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }

  return null;
}

function extractSamples(text: string): number {
  const patterns = [
    /(\d+)\s+sample\s+packs?/i,
    /(\d+)\s+samples?/i,
    /provided\s+(\d+)/i,
    /gave?\s+(\d+)/i,
    /distributed\s+(\d+)/i,
    /left\s+(\d+)/i,
    /update.*?samples?\s+(?:to\s+)?(\d+)/i,
    /change.*?samples?\s+(?:to\s+)?(\d+)/i,
    /(\d+)\s+packs?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return 0;
}

function extractInterestLevel(text: string): "high" | "medium" | "low" | "neutral" | null {
  const lower = text.toLowerCase();
  if (
    lower.includes("very interested") ||
    lower.includes("strong interest") ||
    lower.includes("highly interested") ||
    lower.includes("enthusiastic") ||
    lower.includes("eager") ||
    lower.includes("excited") ||
    lower.includes("will prescribe") ||
    lower.includes("wants to prescribe") ||
    lower.includes("showed interest") ||
    lower.includes("high interest")
  ) return "high";

  if (
    lower.includes("somewhat interested") ||
    lower.includes("moderate interest") ||
    lower.includes("considering") ||
    lower.includes("open to") ||
    lower.includes("might prescribe") ||
    lower.includes("would consider") ||
    lower.includes("cautious") ||
    lower.includes("medium interest")
  ) return "medium";

  if (
    lower.includes("not interested") ||
    lower.includes("no interest") ||
    lower.includes("rejected") ||
    lower.includes("refused") ||
    lower.includes("won't prescribe") ||
    lower.includes("will not") ||
    lower.includes("declined") ||
    lower.includes("low interest")
  ) return "low";

  if (lower.includes("neutral") || lower.includes("no change")) return "neutral";

  return null;
}

function extractSentiment(text: string): "positive" | "neutral" | "negative" | null {
  const lower = text.toLowerCase();
  const positiveWords = ["great", "excellent", "good", "positive", "interested", "enthusiastic", "happy", "pleased", "agreed", "prescribe", "recommend", "success", "productive", "well"];
  const negativeWords = ["bad", "negative", "refused", "rejected", "unhappy", "disappointed", "no interest", "not interested", "cancelled", "hostile", "rude", "poor"];

  const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lower.includes(w)).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  if (positiveCount > 0 || negativeCount > 0) return "neutral";
  return null;
}

function extractProducts(text: string, knownProducts: string[]): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const product of knownProducts) {
    if (lower.includes(product.toLowerCase())) {
      found.push(product);
    }
  }
  return found;
}

function extractHCPName(text: string): string | null {
  const patterns = [
    // Correction patterns first
    /(?:not\s+(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))\b/,
    /(?:switch(?:ed)?\s+(?:to\s+)?(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))/i,
    /(?:change(?:d)?\s+(?:to\s+)?(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))/i,
    /(?:update.*?to\s+(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))/i,
    // Standard patterns
    /(?:met|visited|saw|with|spoke to|spoke with|meeting with)\s+(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (!["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Apollo", "Fortis", "Max", "Medanta", "the"].includes(name)) {
        return name.startsWith("Dr") ? name : `Dr. ${name}`;
      }
    }
  }
  return null;
}

function extractHospital(text: string): string | null {
  const hospitalPatterns = [
    /(?:at|in|from|visited|to|moved to|transferred to)\s+([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Healthcare|Medical|Centre|Center|Institute|Health))/,
    /([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Healthcare|Medical|Centre|Center|Institute|Health))/,
  /\b(?:hospital|clinic)\s+(?:is|to|changed to)\s+([A-Z][a-zA-Z\s]+)/i,
  /(?:hospital|clinic)[:\s]+([A-Z][a-zA-Z\s]+)/i,
  /\bto\s+([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Healthcare|Medical|Centre|Center|Institute))/,
  /\bat\s+([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Healthcare|Medical|Centre|Center|Institute))/,
  /\bin\s+([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Healthcare|Medical|Centre|Center|Institute))/,
  /\bfrom\s+([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Healthcare|Medical|Centre|Center|Institute))/,
  /\b([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Healthcare|Medical|Centre|Center|Institute))/,
  ];
  for (const pattern of hospitalPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function generateSummary(text: string, extracted: Partial<ExtractedInteraction>): string {
  const parts: string[] = [];

  if (extracted.hcp_name) {
    parts.push(`Meeting with ${extracted.hcp_name}`);
    if (extracted.hospital) parts[0] += ` at ${extracted.hospital}`;
    parts[0] += ".";
  }

  if (extracted.products_discussed && extracted.products_discussed.length > 0) {
    parts.push(`Discussed ${extracted.products_discussed.join(", ")}.`);
  }

  if (extracted.samples_given && extracted.samples_given > 0) {
    parts.push(`${extracted.samples_given} sample pack${extracted.samples_given > 1 ? "s" : ""} distributed.`);
  }

  if (extracted.interest_level === "high") {
    parts.push("Doctor showed high interest in prescribing.");
  } else if (extracted.interest_level === "medium") {
    parts.push("Doctor is considering the product and needs more information.");
  } else if (extracted.interest_level === "low") {
    parts.push("Doctor showed limited interest at this time.");
  }

  if (extracted.follow_up_date) {
    parts.push(`Follow-up scheduled for ${extracted.follow_up_date}.`);
  }

  return parts.length > 0 ? parts.join(" ") : `Interaction recorded: ${text.substring(0, 150)}${text.length > 150 ? "..." : ""}`;
}

function generateNextAction(extracted: Partial<ExtractedInteraction>): string {
  if (extracted.interest_level === "high") {
    if (extracted.follow_up_date) {
      return `Schedule confirmed follow-up on ${extracted.follow_up_date} with product literature and patient case studies.`;
    }
    return "Schedule a follow-up meeting within one week with detailed product literature.";
  }
  if (extracted.interest_level === "medium") {
    return "Prepare and send clinical evidence, patient outcome data, and peer review references.";
  }
  if (extracted.interest_level === "low") {
    return "Re-engage in 30 days with updated clinical data and competitor comparison.";
  }
  if (extracted.follow_up_date) {
    return `Follow up on ${extracted.follow_up_date} to continue the discussion.`;
  }
  return "Schedule a follow-up visit to maintain relationship and continue product discussion.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { conversation, known_products = [], current_data = null }: {
      conversation: string;
      known_products?: string[];
      current_data?: CurrentData | null;
    } = await req.json();

    if (!conversation || typeof conversation !== "string") {
      return new Response(
        JSON.stringify({ error: "conversation text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isEditMode = current_data !== null && typeof current_data === "object";

    const extractedHcp = extractHCPName(conversation);
    const extractedHospital = extractHospital(conversation);
    const extractedDate = extractDate(conversation);
    const extractedProducts = extractProducts(conversation, [
      ...known_products,
      "CardioPlus", "GlucoBalance", "OncoClear", "NeuroCare", "BreathEasy", "ArthroRelief", "ImmunoShield"
    ]);
    const extractedSamplesVal = extractSamples(conversation);
    const extractedInterest = extractInterestLevel(conversation);
    const extractedSentiment = extractSentiment(conversation);

    const follow_up_text = conversation.substring(conversation.toLowerCase().lastIndexOf("follow"));
    const extractedFollowUp = follow_up_text.length < conversation.length
      ? extractDate(follow_up_text)
      : null;

    // Determine feedback: only extract if user explicitly gives feedback
    const feedbackMatch = conversation.match(/(?:feedback|said|mentioned|noted|quoted)[:\s]+(.+?)(?:\.|$)/i);
    const extractedFeedback = feedbackMatch ? feedbackMatch[1].trim() : null;

    // Notes extraction
    const notesMatch = conversation.match(/(?:notes?|note)[:\s]+(.+?)(?:\.|$)/i);
    const extractedNotes = notesMatch ? notesMatch[1].trim() : null;

    // In edit mode, merge extracted with current_data (extracted takes priority)
    const hcp_name = extractedHcp ?? (isEditMode ? (current_data.hcp_name ?? null) : null);
    const hospital = extractedHospital ?? (isEditMode ? (current_data.hospital ?? null) : null);
    const visit_date = extractedDate ?? (isEditMode ? (current_data.visit_date ?? null) : null) ?? new Date().toISOString().split("T")[0];
    const products_discussed = extractedProducts.length > 0
      ? extractedProducts
      : (isEditMode ? (current_data.products_discussed ?? []) : []);
    const samples_given = extractedSamplesVal > 0
      ? extractedSamplesVal
      : (isEditMode ? (current_data.samples_given ?? 0) : 0);
    const interest_level = extractedInterest ?? (isEditMode ? (current_data.interest_level ?? null) : null);
    const sentiment = extractedSentiment ?? (isEditMode ? (current_data.sentiment ?? null) : null);
    const follow_up_date = extractedFollowUp ?? (isEditMode ? (current_data.follow_up_date ?? null) : null);
    const feedback = extractedFeedback ?? (isEditMode ? (current_data.feedback ?? null) : null);
    const notes = extractedNotes ?? (isEditMode ? (current_data.notes ?? null) : null);

    const partial: Partial<ExtractedInteraction> = {
      hcp_name,
      hospital,
      visit_date,
      products_discussed,
      samples_given,
      interest_level,
      follow_up_date,
      sentiment,
    };

    const ai_summary = generateSummary(conversation, partial);
    const next_action = generateNextAction(partial);

    const result: ExtractedInteraction = {
      hcp_name,
      hospital,
      visit_date,
      products_discussed,
      samples_given,
      feedback,
      interest_level,
      follow_up_date,
      notes,
      ai_summary,
      sentiment,
      next_action,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
