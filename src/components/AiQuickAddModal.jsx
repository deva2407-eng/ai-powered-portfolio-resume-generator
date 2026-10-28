import { useState } from "react";

export default function AiQuickAddModal({ onClose, onRecordAdded }) {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(null);

  const handleParse = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5001/api/ai/parse-unstructured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse text.");
      }

      setParsed(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5001/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save portfolio record.");
      }

      onRecordAdded(data.record);
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="entry-form" style={{ maxWidth: 640 }}>
        <div className="form-heading">
          <div>
            <span className="section-kicker">AI ASSISTANT</span>
            <h2>AI Quick-Add (Unstructured Parser)</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#6a657e", margin: "4px 0 16px" }}>
          Paste any raw text from your resume, LinkedIn, or notes. Groq AI will extract and organize it into structured database fields for your review.
        </p>

        {!parsed ? (
          <form onSubmit={handleParse}>
            <label>
              Unstructured Experience / Achievement / Skill
              <textarea
                required
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="e.g. In Summer 2024, I completed an internship at Stripe working on payment processing microservices using Go and PostgreSQL, reducing transaction failures by 12%."
              />
            </label>

            {error && <p className="resume-error">{error}</p>}

            <div className="form-buttons" style={{ marginTop: 16 }}>
              <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={loading || !rawText.trim()}>
                {loading ? "Analyzing with Groq..." : "✳ Organize with AI"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {parsed._aiMeta?.warning && (
              <div style={{ background: "#fff6e5", border: "1px solid #ffd591", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                <strong>Note:</strong> {parsed._aiMeta.warning}
              </div>
            )}

            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <label>
                Category
                <input
                  value={parsed.category || ""}
                  onChange={(e) => setParsed({ ...parsed, category: e.target.value })}
                />
              </label>

              <label>
                Title
                <input
                  value={parsed.title || ""}
                  onChange={(e) => setParsed({ ...parsed, title: e.target.value })}
                />
              </label>

              <label>
                Subtitle / Organization / Tech Stack
                <input
                  value={parsed.subtitle || ""}
                  onChange={(e) => setParsed({ ...parsed, subtitle: e.target.value })}
                />
              </label>

              <label>
                Description / Highlights
                <textarea
                  rows={4}
                  value={parsed.description || ""}
                  onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
                />
              </label>

              <label>
                Dates
                <input
                  value={parsed.dates || ""}
                  onChange={(e) => setParsed({ ...parsed, dates: e.target.value })}
                />
              </label>
            </div>

            {error && <p className="resume-error">{error}</p>}

            <div className="form-buttons">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setParsed(null)}
                disabled={loading}
              >
                ← Back / Re-parse
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Saving to Database..." : "Save to Portfolio Database"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
