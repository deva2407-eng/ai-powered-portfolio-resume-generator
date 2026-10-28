import { useEffect, useState } from "react";

export default function Integrations({ portfolioEntries = [] }) {
  const [config, setConfig] = useState({
    sheet_url: "",
    sheet_id: "",
    webhook_url: "",
    last_synced_at: null,
    sync_status: "Not connected",
    last_error: null
  });

  const [webhookInput, setWebhookInput] = useState("");
  const [sheetIdInput, setSheetIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [scriptTemplate, setScriptTemplate] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/sheets/config");
      const data = await res.json();
      setConfig(data);
      setWebhookInput(data.webhook_url || "");
      setSheetIdInput(data.sheet_id || "");
    } catch (err) {
      console.error("Failed to load sheets config:", err);
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/sheets/template");
      const data = await res.json();
      setScriptTemplate(data.script || "");
    } catch (err) {
      console.error("Failed to load script template:", err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchTemplate();
  }, []);

  const handleSaveAndSync = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSyncMessage("");
    setErrorMessage("");

    try {
      // 1. Save config
      const saveRes = await fetch("http://localhost:5001/api/sheets/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook_url: webhookInput.trim(),
          sheet_id: sheetIdInput.trim()
        })
      });
      const updatedConfig = await saveRes.json();
      setConfig(updatedConfig);

      // 2. Trigger Sync
      const syncRes = await fetch("http://localhost:5001/api/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook_url: webhookInput.trim(),
          sheet_id: sheetIdInput.trim()
        })
      });

      const syncResult = await syncRes.json();

      if (!syncRes.ok) {
        throw new Error(syncResult.error || "Google Sheets synchronization failed.");
      }

      setSyncMessage(
        syncResult.details?.message ||
        `Successfully synchronized ${portfolioEntries.length} portfolio records to Google Sheets!`
      );
      fetchConfig();
    } catch (err) {
      setErrorMessage(err.message);
      fetchConfig();
    } finally {
      setLoading(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(scriptTemplate).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const downloadCsv = () => {
    window.location.href = "http://localhost:5001/api/sheets/export/csv";
  };

  const worksheetsList = [
    "Personal Information",
    "Education",
    "Skills",
    "Projects",
    "Certifications",
    "Experience",
    "Achievements",
    "Publications and Activities",
    "Languages"
  ];

  return (
    <section className="portfolio-page">
      <div className="welcome">
        <div>
          <div className="eyebrow">PORTFOLIAI INTEGRATIONS</div>
          <h1>Google Sheets Synchronization <span>⇄</span></h1>
          <p>
            Export and synchronize your centralized SQLite portfolio database directly into multi-worksheet Google Sheets with stable record IDs.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="primary-btn" onClick={downloadCsv}>
            📥 Export CSV Spreadsheet
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="portfolio-summary" style={{ alignItems: "center" }}>
        <div>
          <span className="section-kicker">INTEGRATION STATUS</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background:
                  config.sync_status === "Synchronized"
                    ? "#10b981"
                    : config.sync_status === "Sync Failed"
                    ? "#ef4444"
                    : "#f59e0b"
              }}
            />
            <h2 style={{ margin: 0, fontSize: 20 }}>{config.sync_status || "Not connected"}</h2>
          </div>
          <p>
            {config.last_synced_at
              ? `Last synchronized: ${new Date(config.last_synced_at).toLocaleString()}`
              : "No sync performed yet."}
          </p>
        </div>

        {config.sheet_url && (
          <a
            href={config.sheet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-btn"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Open Google Spreadsheet ↗
          </a>
        )}
      </div>

      {syncMessage && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
          ✓ {syncMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
          ✕ {errorMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
        {/* Setup Form */}
        <div className="panel" style={{ background: "white", borderRadius: 14, padding: 24, border: "1px solid #eeecf5" }}>
          <div className="panel-heading">
            <span className="section-kicker">CONFIGURATION</span>
            <h3>Connect to Google Sheets</h3>
            <p>Connect using a Google Apps Script Web App (easiest, no cloud account needed) or Google Sheets API.</p>
          </div>

          <form onSubmit={handleSaveAndSync} style={{ display: "grid", gap: 16 }}>
            <label>
              Google Apps Script Web App URL
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
              />
              <span style={{ fontSize: 11, color: "#8a859e" }}>
                Created via Extensions &gt; Apps Script &gt; Deploy as Web App.
              </span>
            </label>

            <label>
              Spreadsheet ID (Optional for Direct API)
              <input
                type="text"
                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={sheetIdInput}
                onChange={(e) => setSheetIdInput(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
              />
            </label>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                type="submit"
                className="primary-btn"
                disabled={loading || (!webhookInput && !sheetIdInput)}
                style={{ flex: 1 }}
              >
                {loading ? "Synchronizing Records..." : "⇄ Save & Sync to Google Sheets"}
              </button>
            </div>
          </form>

          {/* Worksheets Manifest */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #eeecf5" }}>
            <strong style={{ fontSize: 13, color: "#28243c", display: "block", marginBottom: 10 }}>
              Exported Worksheets Manifest (9 Separate Worksheets)
            </strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {worksheetsList.map((s) => (
                <span
                  key={s}
                  style={{
                    background: "#f4f3fb",
                    border: "1px solid #e5e3f1",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 11,
                    color: "#5f5979"
                  }}
                >
                  📄 {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Apps Script Guide */}
        <div className="panel" style={{ background: "white", borderRadius: 14, padding: 24, border: "1px solid #eeecf5" }}>
          <div className="panel-heading">
            <span className="section-kicker">STEP-BY-STEP SETUP</span>
            <h3>Google Apps Script Guide</h3>
            <p>Setup takes 60 seconds with no GCP credit card required:</p>
          </div>

          <ol style={{ fontSize: 12, color: "#544f6d", lineHeight: 1.7, paddingLeft: 18, margin: "12px 0" }}>
            <li>Create a new blank sheet at <b>sheets.new</b>.</li>
            <li>Click <b>Extensions → Apps Script</b> in Google Sheets.</li>
            <li>Replace the default <code>Code.gs</code> code with the script below.</li>
            <li>Click <b>Deploy → New deployment</b>.</li>
            <li>Select type <b>Web app</b>. Set <i>Execute as</i>: <b>Me</b>, and <i>Who has access</i>: <b>Anyone</b>.</li>
            <li>Click <b>Deploy</b>, authorize Google access, and copy the Web App URL.</li>
            <li>Paste the URL into the form on the left and click <b>Save & Sync</b>!</li>
          </ol>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="button" className="primary-btn" onClick={copyScript}>
              {copied ? "✓ Copied Apps Script Code!" : "📋 Copy Apps Script Code"}
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? "Hide Script" : "View Script Preview"}
            </button>
          </div>

          {showCode && (
            <pre
              style={{
                marginTop: 14,
                padding: 12,
                background: "#28243c",
                color: "#e2e0ed",
                borderRadius: 8,
                fontSize: 11,
                maxHeight: 220,
                overflowY: "auto",
                whiteSpace: "pre-wrap"
              }}
            >
              {scriptTemplate}
            </pre>
          )}
        </div>
      </div>
    </section>
  );
}
