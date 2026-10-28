import { useEffect, useState, useMemo } from "react";
import "./App.css";
import "./index.css";
import ReactMarkdown from "react-markdown";

import AiQuickAddModal from "./components/AiQuickAddModal";
import ResumeVersionsModal from "./components/ResumeVersionsModal";
import Integrations from "./components/Integrations";
import { exportResumeToPdf } from "./components/pdfExport";

const menuItems = [
  { name: "Dashboard", icon: "⌂" },
  { name: "My Portfolio", icon: "▤" },
  { name: "Resume Studio", icon: "▧" },
  { name: "Integrations", icon: "⇄" },
];

const allCategories = [
  "Personal Information",
  "Professional Summary",
  "Education",
  "Technical Skill",
  "Soft Skill",
  "Certification",
  "Project",
  "Internship",
  "Work Experience",
  "Achievement",
  "Publication",
  "Relevant Activity",
  "Language",
  "Additional Competency",
];

const defaultSectionOrder = [
  "Professional Summary",
  "Technical Skills",
  "Work Experience & Internships",
  "Projects",
  "Education",
  "Certifications",
  "Achievements",
  "Publications & Activities",
  "Languages",
];

const SAMPLE_JD = `Role: Junior Frontend Developer
Company: CloudScale Technologies
Location: Remote / Hybrid

We are seeking a Junior Frontend Developer with practical experience in React.js, modern JavaScript/TypeScript, and RESTful APIs.

Key Responsibilities:
- Build responsive, accessible user interfaces using React and modern CSS.
- Connect frontend components with backend Express / REST services.
- Participate in code reviews and agile sprint planning.

Requirements:
- Strong proficiency in React, JavaScript (ES6+), HTML5, and CSS3.
- Familiarity with Node.js and SQL/relational database fundamentals.
- Understanding of Git version control and collaborative workflows.
- Excellent communication and problem-solving skills.

Preferred Qualifications:
- Experience with Cloud platforms (AWS / GCP).
- Experience with real-time applications or WebSocket state management.
- Exposure to automated testing and CI/CD pipelines.`;

function App() {
  const [active, setActive] = useState("Dashboard");

  // Portfolio State (Loaded directly from SQLite Database)
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [dbError, setDbError] = useState("");

  // AI & Database System Status
  const [aiStatus, setAiStatus] = useState(null);

  // Filter & Search
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Resume Studio state
  const [jobTitle, setJobTitle] = useState("Junior Frontend Developer");
  const [jobDescription, setJobDescription] = useState(SAMPLE_JD);
  const [resumeDraft, setResumeDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [aiProviderInfo, setAiProviderInfo] = useState(null);

  // JD Analyzer state (Module 5)
  const [analyzingJd, setAnalyzingJd] = useState(false);
  const [jdAnalysis, setJdAnalysis] = useState(null);

  // Record Selection (Module 6)
  const [selectedRecordIds, setSelectedRecordIds] = useState(new Set());
  const [customSummary, setCustomSummary] = useState("");
  const [sectionOrder, setSectionOrder] = useState(defaultSectionOrder);

  // Version saving
  const [versionName, setVersionName] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Check if legacy localStorage entries exist for migration
  const [hasLocalStorage, setHasLocalStorage] = useState(false);

  // Empty entry form template
  const emptyForm = {
    category: "Technical Skill",
    title: "",
    subtitle: "",
    description: "",
    dates: "",
    proficiency: "Intermediate",
    years_of_experience: "1",
    url: "",
  };

  const [form, setForm] = useState(emptyForm);

  // Fetch portfolio entries from authoritative SQLite database
  const fetchPortfolio = async () => {
    try {
      setLoadingEntries(true);
      const res = await fetch("http://localhost:5001/api/portfolio");
      if (!res.ok) throw new Error("Failed to connect to SQLite backend.");
      const data = await res.json();
      setEntries(data.flat || []);
      setDbError("");

      // Select all records by default for Resume Studio
      if (data.flat && data.flat.length > 0) {
        setSelectedRecordIds(new Set(data.flat.map((e) => e.id)));
      }
    } catch (err) {
      console.error("Portfolio fetch error:", err);
      setDbError("Backend connection error. Make sure the Node server is running on port 5001.");
    } finally {
      setLoadingEntries(false);
    }
  };

  // Fetch AI Status & Diagnostics
  const fetchAiStatus = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/ai/status");
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
      }
    } catch (err) {
      console.warn("Could not fetch AI status:", err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPortfolio();
    fetchAiStatus();

    // Check localStorage for old entries
    try {
      const saved = localStorage.getItem("portfoliai_entries");
      if (saved && JSON.parse(saved)?.length > 0) {
        setHasLocalStorage(true);
      }
    } catch {}
  }, []);

  // Migrate legacy localStorage entries to SQLite
  const handleMigrateLocalStorage = async () => {
    try {
      const saved = localStorage.getItem("portfoliai_entries");
      if (!saved) return;
      const parsed = JSON.parse(saved);

      const res = await fetch("http://localhost:5001/api/portfolio/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: parsed }),
      });

      if (!res.ok) throw new Error("Migration failed.");
      alert(`Migrated ${parsed.length} entries into SQLite database!`);
      localStorage.removeItem("portfoliai_entries");
      setHasLocalStorage(false);
      fetchPortfolio();
    } catch (err) {
      alert("Migration failed: " + err.message);
    }
  };

  // Reset database with realistic fictional student records
  const handleResetSampleRecords = async () => {
    if (!window.confirm("Reload default sample portfolio (Alex Morgan, CS Graduate)?")) return;
    try {
      const res = await fetch("http://localhost:5001/api/portfolio/reset-seed", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Reset failed.");
      alert("Sample portfolio loaded successfully!");
      fetchPortfolio();
    } catch (err) {
      alert("Reset failed: " + err.message);
    }
  };

  // Open add/edit modal
  const openForm = (entry = null) => {
    setEditingItem(entry);
    if (entry) {
      setForm({
        category: entry.category || "Technical Skill",
        title: entry.title || "",
        subtitle: entry.subtitle || "",
        description: entry.description || "",
        dates: entry.dates || "",
        proficiency: entry.raw?.proficiency_level || entry.raw?.proficiency || "Intermediate",
        years_of_experience: entry.raw?.years_of_experience || "1",
        url: entry.raw?.live_url || entry.raw?.url || "",
      });
    } else {
      setForm({ ...emptyForm });
    }
    setShowForm(true);
  };

  // Save entry (Create or Update in SQLite)
  const saveEntry = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    try {
      if (editingItem) {
        // Update
        const res = await fetch(`http://localhost:5001/api/portfolio/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed to update record.");
      } else {
        // Create
        const res = await fetch("http://localhost:5001/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed to create record.");
      }

      setShowForm(false);
      setEditingItem(null);
      setForm({ ...emptyForm });
      fetchPortfolio();
    } catch (err) {
      alert("Error saving record: " + err.message);
    }
  };

  // Delete entry from SQLite
  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this portfolio record from database?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/portfolio/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete record.");
      fetchPortfolio();
    } catch (err) {
      alert("Error deleting record: " + err.message);
    }
  };

  // Filter and search
  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesCategory = filter === "All" || entry.category === filter;
      const matchesSearch = `${entry.title} ${entry.subtitle || ""} ${entry.description || ""} ${entry.category}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [entries, filter, search]);

  // Counts by category
  const getCount = (cat) => entries.filter((e) => (e.category || "").toLowerCase().includes(cat.toLowerCase())).length;

  // Toggle record selection for Resume Studio
  const toggleRecordSelection = (id) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllRecords = () => {
    setSelectedRecordIds(new Set(entries.map((e) => e.id)));
  };

  const deselectAllRecords = () => {
    setSelectedRecordIds(new Set());
  };

  // Smart select only matching records recommended by JD analysis
  const smartSelectMatchingRecords = () => {
    if (!jdAnalysis) return;
    const matchIds = new Set();

    // Add candidate info and education by default
    entries.forEach((e) => {
      if (e.category === "Personal Information" || e.category === "Professional Summary" || e.category === "Education") {
        matchIds.add(e.id);
      }
    });

    // Add matched requirements IDs
    if (jdAnalysis.matchedRequirements) {
      jdAnalysis.matchedRequirements.forEach((m) => {
        if (m.matchedRecordId) matchIds.add(m.matchedRecordId);
      });
    }

    if (jdAnalysis.recommendedRecordIds) {
      jdAnalysis.recommendedRecordIds.forEach((id) => matchIds.add(id));
    }

    setSelectedRecordIds(matchIds);
  };

  // Run Job Description Analysis (Module 5)
  const handleAnalyzeJd = async (e) => {
    e?.preventDefault();
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setResumeError("Please enter a target job title and job description.");
      return;
    }

    setAnalyzingJd(true);
    setResumeError("");

    try {
      const res = await fetch("http://localhost:5001/api/ai/analyze-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze Job Description.");

      setJdAnalysis(data);

      // Optionally auto-suggest summary if empty
      if (!customSummary && data.summaryAnalysis) {
        setCustomSummary(data.summaryAnalysis);
      }
    } catch (err) {
      setResumeError("JD Analysis error: " + err.message);
    } finally {
      setAnalyzingJd(false);
    }
  };

  // Generate Tailored Resume (Module 6)
  const generateResume = async (e) => {
    e.preventDefault();

    if (!jobTitle.trim() || !jobDescription.trim()) {
      setResumeError("Please enter a job title and job description.");
      return;
    }

    const selectedList = entries.filter((entry) => selectedRecordIds.has(entry.id));

    if (selectedList.length === 0) {
      setResumeError("Please select at least one portfolio record to include in your resume.");
      return;
    }

    setGenerating(true);
    setResumeError("");
    setResumeDraft("");
    setAiProviderInfo(null);

    try {
      const response = await fetch("http://localhost:5001/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          selectedRecords: selectedList.map((e) => ({
            id: e.id,
            category: e.category,
            title: e.title,
            subtitle: e.subtitle || "",
            description: e.description || "",
            dates: e.dates || "",
          })),
          customSummary: customSummary.trim(),
          sectionOrder,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Resume generation failed.");
      }

      if (!data.draft) {
        throw new Error("No resume draft was returned.");
      }

      setResumeDraft(data.draft);
      setAiProviderInfo({
        provider: data.provider,
        model: data.model,
        warning: data.warning,
      });
    } catch (error) {
      console.error("Resume error:", error);
      setResumeError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  // Save current resume draft to SQLite (Module 6)
  const handleSaveResumeVersion = async () => {
    if (!resumeDraft) return;
    const name = versionName.trim() || `${jobTitle} Draft (${new Date().toLocaleDateString()})`;

    try {
      const res = await fetch("http://localhost:5001/api/resume/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_name: name,
          target_role: jobTitle,
          job_description: jobDescription,
          selected_record_ids: Array.from(selectedRecordIds),
          tailored_content: resumeDraft,
          custom_summary: customSummary,
          section_order: sectionOrder,
        }),
      });

      if (!res.ok) throw new Error("Failed to save draft version.");
      setSaveSuccessMsg(`Saved version: "${name}"`);
      setVersionName("");
      setTimeout(() => setSaveSuccessMsg(""), 3500);
    } catch (err) {
      alert("Error saving version: " + err.message);
    }
  };

  // Load a saved resume version
  const handleLoadVersion = (savedDraft) => {
    setJobTitle(savedDraft.target_role || jobTitle);
    setJobDescription(savedDraft.job_description || jobDescription);
    setResumeDraft(savedDraft.tailored_content || "");
    setCustomSummary(savedDraft.custom_summary || "");

    if (savedDraft.selected_record_ids) {
      try {
        const ids = JSON.parse(savedDraft.selected_record_ids);
        setSelectedRecordIds(new Set(ids));
      } catch {}
    }

    if (savedDraft.section_order) {
      try {
        const order = JSON.parse(savedDraft.section_order);
        setSectionOrder(order);
      } catch {}
    }
  };

  // PDF Download (Module 7)
  const handleDownloadPdf = async () => {
    try {
      const cleanRole = jobTitle.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Resume_${cleanRole || "Tailored"}_AlexMorgan.pdf`;
      await exportResumeToPdf("printable-resume", filename);
    } catch (err) {
      alert("PDF Generation error: " + err.message);
    }
  };

  // Print via browser
  const handlePrint = () => {
    window.print();
  };

  // Reorder sections
  const moveSection = (index, direction) => {
    const newOrder = [...sectionOrder];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[target];
    newOrder[target] = temp;
    setSectionOrder(newOrder);
  };

  // Clean Markdown
  const formattedDraft = resumeDraft.replace(/\\([*_#])/g, "$1");

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">P</div>
          <div>
            <h2>PortfoliAI</h2>
            <span>YOUR CAREER, ORGANIZED</span>
          </div>
        </div>

        <div className="menu-label">WORKSPACE</div>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${active === item.name ? "active" : ""}`}
              onClick={() => setActive(item.name)}
            >
              <span>{item.icon}</span>
              {item.name}
              {item.name === "Resume Studio" && <span className="new-tag">AI</span>}
              {item.name === "Integrations" && (
                <span
                  style={{
                    marginLeft: "auto",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#10b981",
                  }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✦</div>
            <strong>Ready for your next role?</strong>
            <p>Tailor your resume against any job description with Groq AI.</p>
            <button onClick={() => setActive("Resume Studio")}>Open Resume Studio →</button>
          </div>

          <div className="profile">
            <div className="avatar">AM</div>
            <div>
              <strong>Alex Morgan</strong>
              <p>CS Graduate Portfolio</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {active}
          </div>

          <div className="top-right">
            {/* Database & AI Engine Indicators */}
            <span
              className="saved"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 11,
              }}
            >
              <i style={{ background: "#22c55e" }} /> SQLite DB Connected ({entries.length} items)
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: aiStatus?.live_test === "success" ? "#f0fdf4" : "#fef2f2",
                color: aiStatus?.live_test === "success" ? "#166534" : "#991b1b",
                border: "1px solid",
                borderColor: aiStatus?.live_test === "success" ? "#bbf7d0" : "#fecaca",
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 11,
              }}
              title={aiStatus?.troubleshooting || (aiStatus?.live_test === "success" ? "Groq API active & ready" : (aiStatus?.error || "Groq API error"))}
            >
              <i style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: aiStatus?.live_test === "success" ? "#22c55e" : "#ef4444" }} />
              {aiStatus?.provider || "Groq Cloud API"} ({aiStatus?.model || "qwen/qwen3.8-27b"})
            </span>

            <div className="avatar small">AM</div>
          </div>
        </header>

        <div className="content">
          {/* Legacy LocalStorage Migration Banner */}
          {hasLocalStorage && (
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 12,
                padding: "12px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <strong style={{ color: "#92400e", fontSize: 13 }}>
                  Import LocalStorage Records Found
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#78350f" }}>
                  We detected previous browser-stored portfolio entries. Would you like to migrate them to your persistent SQLite database?
                </p>
              </div>
              <button
                className="primary-btn"
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={handleMigrateLocalStorage}
              >
                Migrate to SQLite
              </button>
            </div>
          )}

          {/* Database Error Alert */}
          {dbError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
                fontSize: 13,
              }}
            >
              ✕ {dbError}
            </div>
          )}

          {/* 1. DASHBOARD */}
          {active === "Dashboard" && (
            <>
              <div className="welcome">
                <div>
                  <div className="eyebrow">YOUR CAREER WORKSPACE</div>
                  <h1>
                    Welcome to PortfoliAI <span>✳</span>
                  </h1>
                  <p>
                    Centralized portfolio database, Google Sheets sync, and dynamic AI resume tailoring.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="primary-btn" onClick={() => setActive("My Portfolio")}>
                    + Manage Portfolio
                  </button>
                  <button className="text-btn" onClick={handleResetSampleRecords}>
                    ↺ Reset Sample Data
                  </button>
                </div>
              </div>

              {/* Progress Card */}
              <section className="completion">
                <div className="completion-top">
                  <div>
                    <span className="section-kicker">DATABASE OVERVIEW</span>
                    <h3>Authoritative SQLite Storage</h3>
                    <p>All portfolio information is persisted in your local relational database.</p>
                  </div>
                  <div className="progress-number">{entries.length}</div>
                </div>

                <div className="progress-bottom">
                  <span>Total Verified Portfolio Records</span>
                  <button onClick={() => setActive("My Portfolio")}>Manage Entries →</button>
                </div>
              </section>

              {/* Stats Grid */}
              <div className="section-heading">
                <div>
                  <h2>Your portfolio at a glance</h2>
                  <p>Live counts from your authoritative SQLite database tables.</p>
                </div>
                <button className="text-btn" onClick={() => setActive("My Portfolio")}>
                  View Portfolio →
                </button>
              </div>

              <div className="stats-grid">
                {[
                  ["Technical Skills", "Technical Skill"],
                  ["Projects", "Project"],
                  ["Experience & Internships", "Experience"],
                  ["Certifications", "Certification"],
                ].map(([label, category]) => (
                  <div className="stat-card" key={category}>
                    <div className="stat-top">
                      <span>{label}</span>
                      <div className="stat-icon">✳</div>
                    </div>
                    <h2>{getCount(category)}</h2>
                    <p>Saved records</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions Panel */}
              <section className="panel">
                <div className="panel-heading">
                  <h3>Quick actions</h3>
                  <p>Manage your professional records and generate job-specific resumes.</p>
                </div>

                <button className="action-row" onClick={() => setActive("My Portfolio")}>
                  <div className="action-icon lavender">▤</div>
                  <div>
                    <strong>Manage Portfolio Database</strong>
                    <p>Add, edit, search, or filter records across 13 professional categories</p>
                  </div>
                  <span>→</span>
                </button>

                <button className="action-row" onClick={() => setActive("Resume Studio")}>
                  <div className="action-icon peach">✧</div>
                  <div>
                    <strong>Resume Studio & JD Analyzer</strong>
                    <p>Match target JD keywords, select portfolio facts, and download ATS PDF</p>
                  </div>
                  <span>→</span>
                </button>

                <button className="action-row" onClick={() => setActive("Integrations")}>
                  <div className="action-icon lavender">⇄</div>
                  <div>
                    <strong>Google Sheets Synchronization</strong>
                    <p>Export all portfolio categories into multi-worksheet Google Spreadsheet</p>
                  </div>
                  <span>→</span>
                </button>
              </section>
            </>
          )}

          {/* 2. MY PORTFOLIO */}
          {active === "My Portfolio" && (
            <section className="portfolio-page">
              <div className="welcome">
                <div>
                  <div className="eyebrow">YOUR CAREER DATABASE</div>
                  <h1>My Portfolio</h1>
                  <p>One authoritative database for everything you have accomplished.</p>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="text-btn" onClick={() => setShowAiModal(true)}>
                    ✳ AI Quick-Add
                  </button>
                  <button className="primary-btn" onClick={() => openForm()}>
                    + Add Entry
                  </button>
                </div>
              </div>

              <div className="portfolio-summary">
                <div>
                  <span className="section-kicker">PERSISTENT SQLITE RECORDS</span>
                  <h2>{entries.length} verified records</h2>
                  <p>Categorized, searchable, and ready to include in tailored resumes.</p>
                </div>

                <div className="portfolio-mini-stats">
                  <span>
                    Skills <b>{getCount("Skill")}</b>
                  </span>
                  <span>
                    Projects <b>{getCount("Project")}</b>
                  </span>
                  <span>
                    Experience <b>{getCount("Experience") + getCount("Internship")}</b>
                  </span>
                  <span>
                    Certs <b>{getCount("Cert")}</b>
                  </span>
                </div>
              </div>

              {/* Toolbar */}
              <div className="portfolio-toolbar">
                <input
                  aria-label="Search portfolio"
                  placeholder="Search titles, descriptions, technologies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  aria-label="Filter portfolio category"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ minWidth: 220 }}
                >
                  <option value="All">All 13 Categories</option>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* List */}
              <div className="portfolio-list">
                {visibleEntries.map((entry) => (
                  <article className="entry-card" key={entry.id}>
                    <div className="entry-icon">✳</div>
                    <div className="entry-content">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="entry-category">{entry.category}</span>
                        {entry.dates && (
                          <span style={{ fontSize: 11, color: "#8a859e" }}>📅 {entry.dates}</span>
                        )}
                      </div>
                      <h3>{entry.title}</h3>
                      {entry.subtitle && (
                        <p style={{ fontWeight: 600, color: "#544f6d", margin: "2px 0 6px", fontSize: 12 }}>
                          {entry.subtitle}
                        </p>
                      )}
                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {entry.description || "No description added."}
                      </p>
                    </div>

                    <div className="entry-actions">
                      <button onClick={() => openForm(entry)}>Edit</button>
                      <button className="delete-btn" onClick={() => deleteEntry(entry.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}

                {visibleEntries.length === 0 && !loadingEntries && (
                  <div className="empty-state">
                    <div>▤</div>
                    <h3>No portfolio records found</h3>
                    <p>Try clearing your search or add a new record to your portfolio.</p>
                    <button className="primary-btn" onClick={() => openForm()}>
                      + Add Entry
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3. RESUME STUDIO */}
          {active === "Resume Studio" && (
            <section className="resume-studio">
              <div className="welcome">
                <div>
                  <div className="eyebrow">AI RESUME WORKSPACE</div>
                  <h1>Resume Studio ✳</h1>
                  <p>
                    Analyze target job descriptions, select verified portfolio facts, and generate ATS-friendly resumes.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="text-btn" onClick={() => setShowVersionsModal(true)}>
                    📂 Version History
                  </button>
                  <button
                    className="primary-btn"
                    onClick={() => {
                      setJobTitle("Junior Frontend Developer");
                      setJobDescription(SAMPLE_JD);
                    }}
                  >
                    Load Sample JD
                  </button>
                </div>
              </div>

              {/* Alert if AI connection fails */}
              {aiStatus?.live_test === "failed" && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 16,
                    fontSize: 12,
                  }}
                >
                  <strong>AI Provider Alert:</strong> {aiStatus.error} {aiStatus.troubleshooting}
                </div>
              )}

              {saveSuccessMsg && (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 16,
                    fontSize: 13,
                  }}
                >
                  ✓ {saveSuccessMsg}
                </div>
              )}

              <div className="resume-layout" style={{ gridTemplateColumns: "1.1fr 1.1fr", gap: 24 }}>
                {/* Left Column: JD Analyzer & Selection Controls */}
                <div style={{ display: "grid", gap: 20 }}>
                  {/* Step 1: Target Role & JD Form */}
                  <section className="resume-setup">
                    <div className="panel-heading">
                      <span className="section-kicker">STEP 1</span>
                      <h3>Target Role & Job Description</h3>
                      <p>Paste the JD to analyze keywords and match against your portfolio.</p>
                    </div>

                    <form className="resume-form" onSubmit={handleAnalyzeJd}>
                      <label>
                        Target Job Title
                        <input
                          required
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Junior Frontend Developer"
                        />
                      </label>

                      <label>
                        Job Description
                        <textarea
                          required
                          rows={6}
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          placeholder="Paste the full job description here..."
                        />
                      </label>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="submit"
                          className="primary-btn"
                          disabled={analyzingJd || !jobTitle.trim() || !jobDescription.trim()}
                          style={{ flex: 1 }}
                        >
                          {analyzingJd ? "Analyzing with Groq..." : "✳ Analyze JD with AI"}
                        </button>
                      </div>
                    </form>
                  </section>

                  {/* Step 2: Dedicated JD Analyzer & Gap Analysis (Module 5) */}
                  {jdAnalysis && (
                    <section
                      className="panel"
                      style={{
                        background: "white",
                        borderRadius: 14,
                        padding: 20,
                        border: "1px solid #eeecf5",
                      }}
                    >
                      <div className="panel-heading" style={{ marginBottom: 14 }}>
                        <span className="section-kicker">STEP 2: JD ANALYSIS & GAP ANALYSIS</span>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3>Semantic JD Fit Report</h3>
                          <div
                            style={{
                              background: "#f3e8ff",
                              color: "#6b21a8",
                              fontWeight: 800,
                              padding: "4px 12px",
                              borderRadius: 20,
                              fontSize: 14,
                            }}
                          >
                            Fit Score: {jdAnalysis.matchScore || 85}%
                          </div>
                        </div>
                      </div>

                      {/* Transparent Methodology Disclaimer */}
                      <p
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          background: "#f9fafb",
                          padding: 10,
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          lineHeight: 1.5,
                        }}
                      >
                        ℹ <b>Transparent Methodology:</b> {jdAnalysis.methodologyNote}
                      </p>

                      {/* 4 Categorized Boxes */}
                      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                        {/* Matched */}
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 8 }}>
                          <strong style={{ color: "#166534", fontSize: 13, display: "block", marginBottom: 6 }}>
                            ✓ Matched Requirements ({jdAnalysis.matchedRequirements?.length || 0})
                          </strong>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#14532d" }}>
                            {jdAnalysis.matchedRequirements?.map((m, idx) => (
                              <li key={idx} style={{ marginBottom: 4 }}>
                                <b>{m.requirement}</b>: {m.evidence}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Partially Supported */}
                        {jdAnalysis.partiallySupportedRequirements?.length > 0 && (
                          <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: 12, borderRadius: 8 }}>
                            <strong style={{ color: "#92400e", fontSize: 13, display: "block", marginBottom: 6 }}>
                              ▲ Partially Supported ({jdAnalysis.partiallySupportedRequirements.length})
                            </strong>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#78350f" }}>
                              {jdAnalysis.partiallySupportedRequirements.map((p, idx) => (
                                <li key={idx} style={{ marginBottom: 4 }}>
                                  <b>{p.requirement}</b>: {p.explanation}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Missing Requirements */}
                        {jdAnalysis.missingRequirements?.length > 0 && (
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 8 }}>
                            <strong style={{ color: "#991b1b", fontSize: 13, display: "block", marginBottom: 6 }}>
                              ✕ Missing Requirements ({jdAnalysis.missingRequirements.length})
                            </strong>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#7f1d1d" }}>
                              {jdAnalysis.missingRequirements.map((mis, idx) => (
                                <li key={idx} style={{ marginBottom: 4 }}>
                                  <b>{mis.requirement}</b>: {mis.explanation}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Unevaluated */}
                        {jdAnalysis.unevaluatedRequirements?.length > 0 && (
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 12, borderRadius: 8 }}>
                            <strong style={{ color: "#475569", fontSize: 13, display: "block", marginBottom: 6 }}>
                              ⚪ Unevaluated Requirements ({jdAnalysis.unevaluatedRequirements.length})
                            </strong>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#334155" }}>
                              {jdAnalysis.unevaluatedRequirements.map((u, idx) => (
                                <li key={idx} style={{ marginBottom: 4 }}>
                                  <b>{u.requirement}</b>: {u.explanation}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Smart-Select Button */}
                      <button
                        type="button"
                        className="primary-btn"
                        style={{ marginTop: 14, width: "100%", fontSize: 13 }}
                        onClick={smartSelectMatchingRecords}
                      >
                        ⚡ Smart-Select Matching Portfolio Records
                      </button>
                    </section>
                  )}

                  {/* Step 3: Interactive Record Selection & Customization (Module 6) */}
                  <section
                    className="panel"
                    style={{
                      background: "white",
                      borderRadius: 14,
                      padding: 20,
                      border: "1px solid #eeecf5",
                    }}
                  >
                    <div className="panel-heading">
                      <span className="section-kicker">STEP 3</span>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3>Select Portfolio Facts to Include</h3>
                        <span style={{ fontSize: 12, color: "#6d52dc", fontWeight: 700 }}>
                          {selectedRecordIds.size} of {entries.length} selected
                        </span>
                      </div>
                      <p>
                        AI is strictly restricted to facts in your selected records. Deselect any item to omit it.
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 10, margin: "10px 0 16px" }}>
                      <button
                        type="button"
                        className="text-btn"
                        style={{ fontSize: 12 }}
                        onClick={selectAllRecords}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="text-btn"
                        style={{ fontSize: 12 }}
                        onClick={deselectAllRecords}
                      >
                        Deselect All
                      </button>
                    </div>

                    {/* Selection Checklist */}
                    <div style={{ maxHeight: 280, overflowY: "auto", display: "grid", gap: 8 }}>
                      {entries.map((entry) => {
                        const isChecked = selectedRecordIds.has(entry.id);
                        return (
                          <label
                            key={entry.id}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              padding: "8px 10px",
                              borderRadius: 8,
                              background: isChecked ? "#f5f3ff" : "#fbfbfe",
                              border: `1px solid ${isChecked ? "#c4b5fd" : "#eeecf5"}`,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRecordSelection(entry.id)}
                              style={{ marginTop: 3 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong style={{ fontSize: 13, color: "#28243c" }}>{entry.title}</strong>
                                <span style={{ fontSize: 10, color: "#77718e", background: "#eeecf5", padding: "2px 6px", borderRadius: 4 }}>
                                  {entry.category}
                                </span>
                              </div>
                              {entry.subtitle && (
                                <span style={{ fontSize: 11, color: "#6a657e", display: "block" }}>
                                  {entry.subtitle}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Custom Professional Summary */}
                    <div style={{ marginTop: 20 }}>
                      <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 13 }}>
                        Custom Professional Summary (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={customSummary}
                        onChange={(e) => setCustomSummary(e.target.value)}
                        placeholder="Leave blank for AI to synthesize from your verified background, or enter custom career objective..."
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                      />
                    </div>

                    {/* Section Ordering */}
                    <div style={{ marginTop: 18 }}>
                      <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 13 }}>
                        Resume Section Ordering
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {sectionOrder.map((sec, idx) => (
                          <div
                            key={sec}
                            style={{
                              background: "#f4f3fb",
                              border: "1px solid #dcd7f2",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 11,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span>{sec}</span>
                            <div style={{ display: "flex", gap: 2 }}>
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveSection(idx, -1)}
                                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: 9 }}
                                >
                                  ▲
                                </button>
                              )}
                              {idx < sectionOrder.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveSection(idx, 1)}
                                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: 9 }}
                                >
                                  ▼
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generate Resume Button */}
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={generateResume}
                      disabled={generating || selectedRecordIds.size === 0}
                      style={{ marginTop: 20, width: "100%", padding: "14px 20px", fontSize: 15 }}
                    >
                      {generating ? "Generating Tailored Resume with Groq..." : "✳ Generate Tailored Resume"}
                    </button>
                  </section>
                </div>

                {/* Right Column: Resume Preview & Download (Module 7) */}
                <section className="resume-preview" style={{ height: "fit-content" }}>
                  <div className="preview-header">
                    <div>
                      <div className="section-kicker">STEP 4: ATS RESUME PREVIEW</div>
                      <h3>Generated Resume Draft</h3>
                    </div>

                    <span className="preview-badge">
                      {generating ? "Generating..." : resumeDraft ? "Draft Ready" : "Preview"}
                    </span>
                  </div>

                  {generating && (
                    <div className="preview-empty" aria-live="polite">
                      <div className="ai-orb">✳</div>
                      <h3>Creating your draft</h3>
                      <p>AI is assembling your tailored resume strictly using authorized facts...</p>
                    </div>
                  )}

                  {!generating && !resumeDraft && (
                    <div className="preview-empty">
                      <div className="ai-orb">✳</div>
                      <h3>Your tailored resume will appear here</h3>
                      <p>Analyze a JD and click "Generate Tailored Resume" to create your draft.</p>
                    </div>
                  )}

                  {resumeError && <p className="resume-error">{resumeError}</p>}

                  {resumeDraft && !generating && (
                    <div className="resume-draft">
                      {/* Actions toolbar */}
                      <div
                        className="no-print"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                          marginBottom: 16,
                          paddingBottom: 16,
                          borderBottom: "1px solid #eeecf5",
                        }}
                      >
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={handleDownloadPdf}
                          style={{ fontSize: 13 }}
                        >
                          📥 Download PDF
                        </button>

                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={handlePrint}
                          style={{ fontSize: 13 }}
                        >
                          🖨 Print / Native PDF
                        </button>

                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(formattedDraft);
                            alert("Copied Markdown to clipboard!");
                          }}
                          style={{ fontSize: 13 }}
                        >
                          📋 Copy Markdown
                        </button>

                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => setShowVersionsModal(true)}
                          style={{ fontSize: 13, marginLeft: "auto" }}
                        >
                          📂 History
                        </button>
                      </div>

                      {/* Save Version Input */}
                      <div
                        className="no-print"
                        style={{
                          display: "flex",
                          gap: 10,
                          marginBottom: 16,
                          background: "#faf9fd",
                          padding: 10,
                          borderRadius: 8,
                          border: "1px solid #eeecf5",
                        }}
                      >
                        <input
                          placeholder={`Version name (e.g. ${jobTitle} v1)`}
                          value={versionName}
                          onChange={(e) => setVersionName(e.target.value)}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}
                        />
                        <button
                          type="button"
                          className="primary-btn"
                          style={{ padding: "6px 14px", fontSize: 12 }}
                          onClick={handleSaveResumeVersion}
                        >
                          💾 Save Version
                        </button>
                      </div>

                      {/* Printable Resume Container */}
                      <div
                        id="printable-resume"
                        className="resume-content"
                        style={{
                          background: "#ffffff",
                          color: "#1f2937",
                          padding: "36px 44px",
                          borderRadius: 8,
                          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                          lineHeight: 1.6,
                        }}
                      >
                        <ReactMarkdown>{formattedDraft}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </section>
          )}

          {/* 4. INTEGRATIONS */}
          {active === "Integrations" && <Integrations portfolioEntries={entries} />}

          {/* FOOTER */}
          <footer>
            PortfoliAI <span>·</span> Complete AI-Powered Portfolio Database & Dynamic Resume Generator
            <span className="footer-right">Authoritative SQLite Storage · Groq Cloud AI</span>
          </footer>
        </div>
      </main>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <form className="entry-form" onSubmit={saveEntry} style={{ maxWidth: 640 }}>
            <div className="form-heading">
              <div>
                <span className="section-kicker">PORTFOLIO DATABASE</span>
                <h2>{editingItem ? "Edit Record" : "Add Portfolio Record"}</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                aria-label="Close form"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>

            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Title / Name
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. React.js, Software Engineering Intern, B.S. Computer Science"
              />
            </label>

            <label>
              Subtitle / Organization / Tech Stack
              <input
                maxLength={200}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="e.g. Google, University of Technology, TypeScript & Node.js"
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                Dates / Timeframe
                <input
                  maxLength={100}
                  value={form.dates}
                  onChange={(e) => setForm({ ...form, dates: e.target.value })}
                  placeholder="e.g. 2023 - Present, May 2024"
                />
              </label>

              <label>
                Proficiency / Grade / Type
                <input
                  maxLength={100}
                  value={form.proficiency}
                  onChange={(e) => setForm({ ...form, proficiency: e.target.value })}
                  placeholder="e.g. Advanced, 3.8 GPA, Full-time"
                />
              </label>
            </div>

            <label>
              Description & Highlights
              <textarea
                maxLength={3000}
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detail key responsibilities, concepts learned, performance metrics..."
              />
            </label>

            <label>
              URL / Link (Optional)
              <input
                maxLength={300}
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="e.g. https://github.com/project, https://credential.url"
              />
            </label>

            <p className="form-note">
              This record will be saved directly to the SQLite database and used as authorized facts.
            </p>

            <div className="form-buttons">
              <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn">
                {editingItem ? "Save Changes" : "Save to Database"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI Quick Add Modal */}
      {showAiModal && (
        <AiQuickAddModal
          onClose={() => setShowAiModal(false)}
          onRecordAdded={() => fetchPortfolio()}
        />
      )}

      {/* Resume Version History Modal */}
      {showVersionsModal && (
        <ResumeVersionsModal
          onClose={() => setShowVersionsModal(false)}
          onLoadVersion={handleLoadVersion}
        />
      )}
    </div>
  );
}

export default App;
