import { useEffect, useState } from "react";

export default function ResumeVersionsModal({ onClose, onLoadVersion }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/api/resume/drafts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load versions.");
      setDrafts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this saved resume version?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/resume/drafts/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete.");
      setDrafts(drafts.filter((d) => d.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="entry-form" style={{ maxWidth: 700 }}>
        <div className="form-heading">
          <div>
            <span className="section-kicker">VERSION HISTORY</span>
            <h2>Saved Resume Versions</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#6a657e", margin: "4px 0 16px" }}>
          Select any previously saved resume version to restore its draft, target role, and settings.
        </p>

        {loading && <p>Loading saved versions...</p>}
        {error && <p className="resume-error">{error}</p>}

        {!loading && drafts.length === 0 && (
          <div className="empty-state" style={{ padding: "30px 10px" }}>
            <div>▧</div>
            <h3>No saved versions yet</h3>
            <p>Generate a resume and click "Save Version" to keep a history of your job-specific resumes.</p>
          </div>
        )}

        <div style={{ display: "grid", gap: 12, maxHeight: 420, overflowY: "auto" }}>
          {drafts.map((d) => (
            <div
              key={d.id}
              style={{
                border: "1px solid #eeecf5",
                borderRadius: 10,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#faf9fd"
              }}
            >
              <div>
                <strong style={{ fontSize: 15, color: "#28243c", display: "block" }}>
                  {d.version_name}
                </strong>
                <span style={{ fontSize: 12, color: "#77718e" }}>
                  Role: <b>{d.target_role || "Untitled"}</b> • Saved: {new Date(d.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={() => {
                    onLoadVersion(d);
                    onClose();
                  }}
                >
                  Load Draft
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  style={{ padding: "6px 12px", fontSize: 12, color: "#d14f62" }}
                  onClick={(e) => handleDelete(d.id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="form-buttons" style={{ marginTop: 20 }}>
          <button type="button" className="cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
