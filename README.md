# Job Search Command Center - Vercel MCP server (Claude edition)

This is the **Vercel** layer of the Claude stack. It's a small MCP server that
Claude connects to as a custom connector. Each tool call forwards to your Google
Apps Script, which reads and writes your pipeline Google Sheet.

```
Claude (Project)  ->  this MCP server (Vercel)  ->  Apps Script  ->  Google Sheet
```

It exposes four tools:
- `get_opportunities` - read the pipeline
- `upsert_opportunity` - create or update one role (update in place if id exists)
- `upsert_opportunities_bulk` - create/update many at once
- `update_opportunity` - update an existing role by id (never creates)

## Prerequisites

You've already deployed the Apps Script (see `apps-script.gs` + its deploy
guide) and have its `/exec` URL and your `API_KEY`.

## Deploy to Vercel (about 10 minutes)

1. Put these files in a new GitHub repo (keep the folder structure).
2. In Vercel: **Add New -> Project -> Import** that repo. Framework preset:
   **Next.js** (auto-detected). Don't change build settings.
3. Before the first successful deploy, add two **Environment Variables**
   (Project -> Settings -> Environment Variables), then deploy/redeploy:

   | Name              | Value                                                       |
   | ----------------- | ----------------------------------------------------------- |
   | `APPS_SCRIPT_URL` | Your Apps Script web app URL (ends in `/exec`).             |
   | `APPS_SCRIPT_KEY` | The `API_KEY` you set as a Script Property on the script.   |

4. After deploy you get a URL like `https://your-project.vercel.app`.
   Your MCP endpoint is that URL **plus `/api/mcp`**:
   `https://your-project.vercel.app/api/mcp`

## Connect it to Claude

1. In Claude (Pro/Max): **Settings -> Connectors -> Add custom connector**.
2. Paste your MCP endpoint URL (`https://your-project.vercel.app/api/mcp`).
   Leave OAuth fields empty (URL-only is supported for personal use).
3. Save. Claude will connect and discover the four tools.

> Security note: with URL-only auth, anyone who knows the exact URL could reach
> the tools, and your Google `API_KEY` stays server-side in Vercel (never exposed
> to Claude). The URL is unguessable, which is fine for a personal pipeline. For
> a public/shared agent later, add OAuth to the connector.

## Quick test (optional, before connecting Claude)

```bash
curl -sS -X POST https://your-project.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

You should get a JSON-RPC response listing the four tools.

## Local development

```bash
npm install
APPS_SCRIPT_URL=... APPS_SCRIPT_KEY=... npm run dev
# endpoint: http://localhost:3000/api/mcp
```
