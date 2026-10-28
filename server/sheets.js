import { google } from "googleapis";
import { getAllPortfolio, getSheetsConfig, saveSheetsConfig } from "./db.js";

// Format portfolio records for sheet export with stable IDs
export function prepareWorksheetData(userId = 1) {
  const { structured } = getAllPortfolio(userId);

  const worksheets = {
    "Personal Information": {
      headers: ["Record ID", "Full Name", "Email", "Phone", "Location", "LinkedIn", "GitHub", "Website", "Last Updated"],
      rows: (structured.personal_information || []).map(p => [
        `personal_${p.id}`,
        p.full_name || "",
        p.email || "",
        p.phone || "",
        p.location || "",
        p.linkedin_url || "",
        p.github_url || "",
        p.portfolio_website || "",
        p.updated_at || new Date().toISOString()
      ])
    },
    "Education": {
      headers: ["Record ID", "Institution", "Degree", "Field of Study", "Start Date", "End Date", "Grade", "Highlights", "Last Updated"],
      rows: (structured.education || []).map(e => [
        `education_${e.id}`,
        e.institution || "",
        e.degree || "",
        e.field_of_study || "",
        e.start_date || "",
        e.end_date || "",
        e.grade || "",
        e.highlights || "",
        e.updated_at || new Date().toISOString()
      ])
    },
    "Skills": {
      headers: ["Record ID", "Skill Name", "Category", "Proficiency Level", "Years of Experience", "Last Updated"],
      rows: (structured.skills || []).map(s => [
        `skill_${s.id}`,
        s.name || "",
        s.category || "",
        s.proficiency_level || "",
        s.years_of_experience || 1,
        s.updated_at || new Date().toISOString()
      ])
    },
    "Projects": {
      headers: ["Record ID", "Title", "Role", "Tech Stack", "Description", "Live URL", "Repo URL", "Start Date", "End Date", "Last Updated"],
      rows: (structured.projects || []).map(pr => [
        `project_${pr.id}`,
        pr.title || "",
        pr.role || "",
        pr.tech_stack || "",
        pr.description || "",
        pr.live_url || "",
        pr.repo_url || "",
        pr.start_date || "",
        pr.end_date || "",
        pr.updated_at || new Date().toISOString()
      ])
    },
    "Certifications": {
      headers: ["Record ID", "Certification Name", "Issuer", "Issue Date", "Expiration Date", "Credential ID", "Credential URL", "Last Updated"],
      rows: (structured.certifications || []).map(c => [
        `cert_${c.id}`,
        c.name || "",
        c.issuer || "",
        c.issue_date || "",
        c.expiration_date || "",
        c.credential_id || "",
        c.credential_url || "",
        c.updated_at || new Date().toISOString()
      ])
    },
    "Experience": {
      headers: ["Record ID", "Organization", "Position", "Type", "Location", "Start Date", "End Date", "Description", "Last Updated"],
      rows: (structured.experience || []).map(exp => [
        `experience_${exp.id}`,
        exp.organization || "",
        exp.position || "",
        exp.type || "",
        exp.location || "",
        exp.start_date || "",
        exp.end_date || (exp.is_current ? "Present" : ""),
        exp.description || "",
        exp.updated_at || new Date().toISOString()
      ])
    },
    "Achievements": {
      headers: ["Record ID", "Title", "Issuer", "Date Received", "Description", "Last Updated"],
      rows: (structured.achievements || []).map(a => [
        `achievement_${a.id}`,
        a.title || "",
        a.issuer || "",
        a.date_received || "",
        a.description || "",
        a.updated_at || new Date().toISOString()
      ])
    },
    "Publications and Activities": {
      headers: ["Record ID", "Type", "Title", "Organization", "Date", "URL", "Description", "Last Updated"],
      rows: (structured.publications_activities || []).map(pa => [
        `publication_${pa.id}`,
        pa.type || "",
        pa.title || "",
        pa.publisher_organization || "",
        pa.date || "",
        pa.url || "",
        pa.description || "",
        pa.updated_at || new Date().toISOString()
      ])
    },
    "Languages": {
      headers: ["Record ID", "Language", "Proficiency", "Last Updated"],
      rows: (structured.languages || []).map(l => [
        `language_${l.id}`,
        l.language || "",
        l.proficiency || "",
        l.updated_at || new Date().toISOString()
      ])
    }
  };

  return worksheets;
}

// Google Apps Script code snippet for the user to copy-paste into Extensions > Apps Script
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `
/**
 * PortfoliAI Google Sheets Sync Webhook Script
 * 1. Create a Google Spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this script and click Save.
 * 4. Click Deploy > New deployment.
 * 5. Select type: 'Web app'.
 * 6. Execute as: 'Me', Who has access: 'Anyone'.
 * 7. Click Deploy, authorize permissions, and copy the Web App URL.
 * 8. Paste the Web App URL into PortfoliAI Integrations.
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var worksheets = payload.worksheets;

    for (var sheetName in worksheets) {
      var data = worksheets[sheetName];
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      // Clear existing content to ensure clean synchronization
      sheet.clearContents();

      var allData = [data.headers].concat(data.rows);
      if (allData.length > 0) {
        sheet.getRange(1, 1, allData.length, data.headers.length).setValues(allData);
        sheet.getRange(1, 1, 1, data.headers.length).setFontWeight("bold").setBackground("#EEECF5");
        sheet.setFrozenRows(1);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Portfolio data successfully synced to Google Sheets",
      spreadsheetUrl: ss.getUrl(),
      syncedAt: new Date().toISOString(),
      sheetsCount: Object.keys(worksheets).length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "PortfoliAI Sheets Sync Webhook",
    activeSpreadsheet: SpreadsheetApp.getActiveSpreadsheet().getUrl()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

// Sync to Google Sheets via Webhook or Google Sheets API
export async function syncToGoogleSheets(targetConfig, userId = 1) {
  const currentConfig = getSheetsConfig(userId);
  const webhookUrl = targetConfig?.webhook_url || currentConfig.webhook_url;
  const sheetId = targetConfig?.sheet_id || currentConfig.sheet_id;

  const worksheets = prepareWorksheetData(userId);

  // Method 1: Webhook / Apps Script Web App
  if (webhookUrl && webhookUrl.startsWith("http")) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_portfolio",
          userId,
          worksheets,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (result.status === "error") {
        throw new Error(result.message || "Google Apps Script returned an error.");
      }

      const updated = saveSheetsConfig({
        webhook_url: webhookUrl,
        sheet_url: result.spreadsheetUrl || currentConfig.sheet_url,
        sheet_id: sheetId,
        last_synced_at: new Date().toISOString(),
        sync_status: "Synchronized",
        last_error: null
      }, userId);

      return {
        success: true,
        method: "apps_script_webhook",
        config: updated,
        details: result
      };
    } catch (err) {
      saveSheetsConfig({
        webhook_url: webhookUrl,
        sheet_url: currentConfig.sheet_url,
        sheet_id: sheetId,
        last_synced_at: currentConfig.last_synced_at,
        sync_status: "Sync Failed",
        last_error: err.message
      }, userId);
      throw err;
    }
  }

  // Method 2: Google Sheets API v4 using Service Account (if configured in env)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && sheetId) {
    try {
      const auth = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        ["https://www.googleapis.com/auth/spreadsheets"]
      );

      const sheets = google.sheets({ version: "v4", auth });

      for (const [sheetName, sheetData] of Object.entries(worksheets)) {
        // Clear and update sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${sheetName}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [sheetData.headers, ...sheetData.rows]
          }
        });
      }

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      const updated = saveSheetsConfig({
        sheet_id: sheetId,
        sheet_url: sheetUrl,
        webhook_url: webhookUrl,
        last_synced_at: new Date().toISOString(),
        sync_status: "Synchronized",
        last_error: null
      }, userId);

      return {
        success: true,
        method: "google_sheets_api",
        config: updated
      };
    } catch (err) {
      saveSheetsConfig({
        sheet_id: sheetId,
        sheet_url: currentConfig.sheet_url,
        webhook_url: webhookUrl,
        last_synced_at: currentConfig.last_synced_at,
        sync_status: "Sync Failed",
        last_error: err.message
      }, userId);
      throw err;
    }
  }

  throw new Error("No Google Sheets integration configured. Please enter a Google Apps Script Web App URL or configure Google Service Account credentials.");
}
