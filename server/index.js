import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import {
  initDatabase,
  getAllPortfolio,
  addPortfolioRecord,
  updatePortfolioRecord,
  deletePortfolioRecord,
  migrateLocalStorageEntries,
  seedDatabase,
  getResumeDrafts,
  saveResumeDraft,
  deleteResumeDraft,
  getSheetsConfig,
  saveSheetsConfig
} from "./db.js";

import {
  getAiStatus,
  parseUnstructuredPortfolio,
  analyzeJobDescription,
  tailorResume
} from "./groq.js";

import {
  syncToGoogleSheets,
  prepareWorksheetData,
  GOOGLE_APPS_SCRIPT_TEMPLATE
} from "./sheets.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

app.use(express.json({ limit: "2mb" }));

// 1. Health check & Diagnostics
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "PortfoliAI API",
    database: "SQLite (Node.js Native DatabaseSync)",
    aiProvider: "Groq Cloud API (groq-sdk)",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/ai/status", async (req, res) => {
  try {
    const status = await getAiStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Portfolio CRUD Routes (Authoritative SQLite source of truth)
app.get("/api/portfolio", (req, res) => {
  try {
    const data = getAllPortfolio();
    res.json(data);
  } catch (err) {
    console.error("Error fetching portfolio:", err);
    res.status(500).json({ error: "Failed to fetch portfolio records." });
  }
});

app.post("/api/portfolio", (req, res) => {
  try {
    const { category, ...data } = req.body;
    if (!category || (!data.title && !data.full_name && !data.name)) {
      return res.status(400).json({ error: "Category and a title/name are required." });
    }
    const record = addPortfolioRecord(category, data);
    res.status(201).json({ message: "Record created successfully.", record });
  } catch (err) {
    console.error("Error creating record:", err);
    res.status(500).json({ error: "Failed to create portfolio record." });
  }
});

app.put("/api/portfolio/:id", (req, res) => {
  try {
    const { id } = req.params;
    const result = updatePortfolioRecord(id, req.body);
    res.json(result);
  } catch (err) {
    console.error("Error updating record:", err);
    res.status(500).json({ error: "Failed to update record." });
  }
});

app.delete("/api/portfolio/:id", (req, res) => {
  try {
    const { id } = req.params;
    const result = deletePortfolioRecord(id);
    if (!result.success) {
      return res.status(404).json({ error: "Record not found." });
    }
    res.json(result);
  } catch (err) {
    console.error("Error deleting record:", err);
    res.status(500).json({ error: "Failed to delete record." });
  }
});

app.post("/api/portfolio/migrate", (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: "Entries must be an array." });
    }
    const result = migrateLocalStorageEntries(entries);
    res.json({ message: `Successfully migrated ${result.migrated} records into SQLite database.`, ...result });
  } catch (err) {
    console.error("Error migrating entries:", err);
    res.status(500).json({ error: "Failed to migrate entries." });
  }
});

app.post("/api/portfolio/reset-seed", (req, res) => {
  try {
    seedDatabase();
    res.json({ message: "Database re-seeded with realistic fictional profile." });
  } catch (err) {
    console.error("Error resetting seed:", err);
    res.status(500).json({ error: "Failed to reset sample records." });
  }
});

// 3. AI Unstructured Data Structuring
app.post("/api/ai/parse-unstructured", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Please enter text to parse." });
    }
    const structured = await parseUnstructuredPortfolio(text);
    res.json(structured);
  } catch (err) {
    console.error("Unstructured parsing failed:", err);
    res.status(500).json({ error: err.message || "Failed to parse text with AI." });
  }
});

// 4. Job Description Analyzer & Semantic Matching
app.post("/api/ai/analyze-jd", async (req, res) => {
  try {
    const { jobTitle, jobDescription } = req.body;
    if (!jobTitle || !jobDescription) {
      return res.status(400).json({ error: "Job title and job description are required." });
    }

    const { flat } = getAllPortfolio();
    const analysis = await analyzeJobDescription(jobTitle, jobDescription, flat);
    res.json(analysis);
  } catch (err) {
    console.error("JD analysis failed:", err);
    res.status(500).json({ error: err.message || "Failed to analyze Job Description." });
  }
});

// 5. Dynamic Tailored Resume Generator
app.post("/api/resume/tailor", async (req, res) => {
  try {
    const { jobTitle, jobDescription, portfolio, selectedRecords, customSummary, sectionOrder } = req.body;

    if (!jobTitle || !jobDescription) {
      return res.status(400).json({ error: "Please provide a target job title and job description." });
    }

    // Support both selectedRecords (new) and legacy portfolio array
    const recordsToUse = selectedRecords || portfolio || [];

    if (!Array.isArray(recordsToUse) || recordsToUse.length === 0) {
      return res.status(400).json({ error: "Please select at least one portfolio record to include." });
    }

    const result = await tailorResume({
      jobTitle,
      jobDescription,
      selectedRecords: recordsToUse,
      customSummary,
      sectionOrder
    });

    res.json(result);
  } catch (err) {
    console.error("Resume tailoring failed:", err);
    res.status(500).json({ error: err.message || "Failed to tailor resume." });
  }
});

// 6. Resume Versions / Drafts Persistence
app.get("/api/resume/drafts", (req, res) => {
  try {
    const drafts = getResumeDrafts();
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resume versions." });
  }
});

app.post("/api/resume/drafts", (req, res) => {
  try {
    const draft = saveResumeDraft(req.body);
    res.status(201).json(draft);
  } catch (err) {
    res.status(500).json({ error: "Failed to save resume version." });
  }
});

app.delete("/api/resume/drafts/:id", (req, res) => {
  try {
    deleteResumeDraft(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete resume draft." });
  }
});

// 7. Google Sheets Integration
app.get("/api/sheets/config", (req, res) => {
  try {
    const config = getSheetsConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Failed to get sheets config." });
  }
});

app.post("/api/sheets/config", (req, res) => {
  try {
    const updated = saveSheetsConfig(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to save sheets config." });
  }
});

app.post("/api/sheets/sync", async (req, res) => {
  try {
    const result = await syncToGoogleSheets(req.body);
    res.json(result);
  } catch (err) {
    console.error("Google Sheets sync failed:", err);
    res.status(500).json({ error: err.message || "Failed to sync to Google Sheets." });
  }
});

app.get("/api/sheets/template", (req, res) => {
  res.json({ script: GOOGLE_APPS_SCRIPT_TEMPLATE });
});

app.get("/api/sheets/export/csv", (req, res) => {
  try {
    const worksheets = prepareWorksheetData();
    let combinedCsv = "";

    for (const [sheetName, data] of Object.entries(worksheets)) {
      combinedCsv += `=== ${sheetName} ===\n`;
      combinedCsv += data.headers.map(h => `"${h}"`).join(",") + "\n";
      for (const row of data.rows) {
        combinedCsv += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
      }
      combinedCsv += "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=portfoliai_export.csv");
    res.send(combinedCsv);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate CSV export." });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`PortfoliAI API running on port ${PORT}`);
  console.log(` authoritative SQLite database active.`);
});
