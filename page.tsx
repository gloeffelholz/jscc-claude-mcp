export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "60px auto", padding: "0 20px", lineHeight: 1.6 }}>
      <h1>Job Search Command Center - MCP server</h1>
      <p>This is the MCP server that connects Claude to your Google Sheet pipeline.</p>
      <p>Add it to Claude as a custom connector using this URL:</p>
      <pre style={{ background: "#f4f4f5", padding: 12, borderRadius: 8 }}>https://YOUR-PROJECT.vercel.app/api/mcp</pre>
      <p style={{ color: "#666" }}>Tools: get_opportunities, upsert_opportunity, upsert_opportunities_bulk, update_opportunity.</p>
    </main>
  );
}
