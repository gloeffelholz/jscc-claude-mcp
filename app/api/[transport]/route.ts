import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

/**
 * Job Search Command Center - MCP server (Claude edition)
 *
 * This server is the "Vercel" layer. Claude connects to it as a custom
 * connector and calls these tools. Each tool forwards to your Google Apps
 * Script web app, which reads and writes the pipeline Google Sheet.
 *
 *   Claude  ->  this MCP server (Vercel)  ->  Apps Script  ->  Google Sheet
 *
 * Required environment variables (set in Vercel -> Project -> Settings -> Env):
 *   APPS_SCRIPT_URL  - your Apps Script web app URL (ends in /exec)
 *   APPS_SCRIPT_KEY  - the API_KEY you set as a Script Property on the Apps Script
 */

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || "";
const APPS_SCRIPT_KEY = process.env.APPS_SCRIPT_KEY || "";

// One opportunity record. All fields optional except where the agent enforces
// them; the Apps Script validates required fields on create.
const recordShape = {
  id: z.string().describe("Stable string id for the opportunity. Required."),
  company: z.string().optional(),
  company_slug: z.string().optional().describe("normalized company key, lowercase, no punctuation"),
  role: z.string().optional(),
  link: z.string().optional(),
  status: z.string().optional().describe("Prospective | Applied | Waiting | Interviewing | Closed"),
  waiting_reason: z.string().optional(),
  status_reason: z.string().optional(),
  date_added: z.string().optional().describe("YYYY-MM-DD"),
  date_applied: z.string().optional().describe("YYYY-MM-DD"),
  comp_base_min: z.union([z.number(), z.string()]).optional(),
  comp_base_max: z.union([z.number(), z.string()]).optional(),
  comp_range_text: z.string().optional(),
  location_compatible: z.boolean().optional(),
  warm_intro_available: z.boolean().optional(),
  recruiter_contact: z.string().optional(),
  unknowns: z.string().optional().describe("JSON text"),
  why_deprioritized: z.string().optional(),
  last_action_date: z.string().optional().describe("YYYY-MM-DD"),
  next_action: z.string().optional(),
  score_locked: z.boolean().optional(),
  score_snapshot: z.string().optional().describe("JSON text: {bf,li,cr,weighted,verdict,scored_on}"),
  notes: z.string().optional(),
  jd_text: z.string().optional(),
  jd_source: z.string().optional(),
  jd_captured_at: z.string().optional(),
};

async function callAppsScript(payload: Record<string, unknown>) {
  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_KEY) {
    return { error: "Server is missing APPS_SCRIPT_URL or APPS_SCRIPT_KEY environment variables." };
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: APPS_SCRIPT_KEY, ...payload }),
    redirect: "follow",
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Non-JSON response from Apps Script", raw: text.slice(0, 500) };
  }
}

function asText(obj: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }] };
}

const handler = createMcpHandler((server) => {
  server.tool(
    "get_opportunities",
    "Read the job-search pipeline. Returns all opportunity records (jd_text omitted unless includeJd is true).",
    {
      includeJd: z.boolean().optional().describe("Include the large jd_text field. Default false."),
      limit: z.number().int().positive().optional().describe("Max records to return."),
    },
    async ({ includeJd, limit }) => asText(await callAppsScript({ action: "get", includeJd: !!includeJd, limit: limit || 0 }))
  );

  server.tool(
    "upsert_opportunity",
    "Create or update one opportunity. Updates in place if the id already exists, otherwise appends a new row. Required on create: id, company, company_slug, role, status, date_added.",
    { record: z.object(recordShape) },
    async ({ record }) => asText(await callAppsScript({ action: "upsert", record }))
  );

  server.tool(
    "upsert_opportunities_bulk",
    "Create or update many opportunities at once. Each is deduped by id. Returns updated ids and skipped items with reasons.",
    { records: z.array(z.object(recordShape)) },
    async ({ records }) => asText(await callAppsScript({ action: "upsertBulk", records }))
  );

  server.tool(
    "update_opportunity",
    "Update an existing opportunity by id. Never creates a new row; errors if the id is not found. Only the fields you pass are changed.",
    { record: z.object(recordShape) },
    async ({ record }) => asText(await callAppsScript({ action: "update", record }))
  );
});

export { handler as GET, handler as POST };
