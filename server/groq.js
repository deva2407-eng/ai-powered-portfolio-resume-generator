import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import Groq from "groq-sdk";

const groqApiKey = process.env.GROQ_API_KEY || "";
const defaultModel = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

// Clean markdown code blocks from JSON output if returned as text
function parseJsonSafe(text) {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse JSON from AI response:", text?.slice(0, 200));
    throw new Error("AI returned a response that could not be parsed as valid JSON: " + err.message);
  }
}

// Check Groq API Configuration Status & Connection
export async function getAiStatus() {
  const currentKey = process.env.GROQ_API_KEY || "";
  const currentModel = process.env.GROQ_MODEL || defaultModel;

  const status = {
    provider: "Groq Cloud API",
    sdk: "groq-sdk",
    configured: Boolean(currentKey && currentKey.trim().length > 10),
    model: currentModel,
    live_test: null,
    error: null,
    troubleshooting: null
  };

  if (!status.configured) {
    status.error = "GROQ_API_KEY is not configured in server/.env";
    status.troubleshooting = "Add your Groq API key to server/.env as GROQ_API_KEY=... and restart the server. Get an API key at https://console.groq.com/keys.";
    return status;
  }

  try {
    const testClient = new Groq({ apiKey: currentKey });
    const res = await testClient.chat.completions.create({
      model: currentModel,
      messages: [{ role: "user", content: "Ping" }],
      max_tokens: 5,
      temperature: 0.1
    });

    if (res?.choices?.length > 0) {
      status.live_test = "success";
    } else {
      status.live_test = "failed";
      status.error = "Groq responded with empty choices.";
    }
  } catch (err) {
    status.live_test = "failed";
    const msg = err.message || "";
    const statusVal = err.status || err.statusCode;

    if (statusVal === 401 || msg.includes("401") || msg.toLowerCase().includes("invalid api key")) {
      status.error = "Invalid Groq API Key (401 Unauthorized).";
      status.troubleshooting = "Verify that GROQ_API_KEY in server/.env is active and copied correctly from https://console.groq.com/keys.";
    } else if (statusVal === 429 || msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
      status.error = "Groq API rate limit or quota exceeded (429).";
      status.troubleshooting = "Your Groq API rate limit has been reached. Please wait a moment before trying again or check your usage at https://console.groq.com/settings/limits.";
    } else if (statusVal === 404 || msg.includes("404") || msg.toLowerCase().includes("model_not_found")) {
      status.error = `Configured model '${currentModel}' is unavailable or deprecated (404).`;
      status.troubleshooting = "Set GROQ_MODEL in server/.env to an active model such as 'qwen/qwen3.8-27b' or 'openai/gpt-oss-120b'.";
    } else {
      status.error = `Groq API connection error: ${msg}`;
      status.troubleshooting = "Check your internet connection and verify that api.groq.com is reachable.";
    }
  }

  return status;
}

// Internal invocation wrapper
async function callGroqChat({ messages, temperature = 0.2, responseFormat = null, maxTokens = null }) {
  const currentKey = process.env.GROQ_API_KEY || "";
  const currentModel = process.env.GROQ_MODEL || defaultModel;

  if (!currentKey) {
    throw new Error("GROQ_API_KEY is not configured in server/.env. Please configure your Groq key.");
  }

  const client = new Groq({ apiKey: currentKey });

  try {
    const params = {
      model: currentModel,
      messages,
      temperature
    };

    if (responseFormat) {
      params.response_format = responseFormat;
    }
    if (maxTokens) {
      params.max_tokens = maxTokens;
    }

    const completion = await client.chat.completions.create(params);
    const content = completion.choices[0]?.message?.content || "";

    if (!content.trim()) {
      throw new Error("Groq returned an empty response. Please retry.");
    }

    return {
      text: content,
      provider: "Groq Cloud API",
      model: currentModel
    };
  } catch (err) {
    const msg = err.message || "";
    const statusVal = err.status || err.statusCode;

    if (statusVal === 401 || msg.includes("401")) {
      throw new Error("Groq Authentication Failed: Invalid or expired GROQ_API_KEY. Please verify server/.env.");
    }
    if (statusVal === 429 || msg.includes("429")) {
      throw new Error("Groq Rate Limit Exceeded: Please wait a moment before submitting another request.");
    }
    if (statusVal === 404 || msg.includes("404")) {
      throw new Error(`Groq Model Error: '${currentModel}' was not found. Please update GROQ_MODEL in server/.env.`);
    }

    throw new Error(`Groq API Error: ${msg}`);
  }
}

// 1. Structure raw unstructured input into organized portfolio category fields
export async function parseUnstructuredPortfolio(rawText) {
  const prompt = `
You are an intelligent career data parser for PortfoliAI.
Analyze the following unstructured input provided by a candidate:
"${rawText}"

Organize it into structured fields.
Allowed categories:
- Technical Skill
- Soft Skill
- Project
- Education
- Certification
- Internship
- Work Experience
- Achievement
- Publication
- Relevant Activity
- Language
- Additional Competency

Return ONLY a valid JSON object matching this schema:
{
  "category": "One of the allowed categories above",
  "title": "Concise main title (e.g. React.js, Software Engineering Intern, B.S. Computer Science)",
  "subtitle": "Secondary info (e.g. Company name, University, Proficiency, Tech Stack)",
  "description": "Clear detailed description of duties, achievements, or concepts learned",
  "dates": "Date range if mentioned (e.g. 2023 - 2024), or null",
  "proficiency": "For skills or languages: Beginner / Intermediate / Advanced / Expert / Native, or null",
  "years_of_experience": "Number of years if applicable, or null"
}
`;

  const result = await callGroqChat({
    messages: [
      { role: "system", content: "You parse unstructured career text into strictly valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    responseFormat: { type: "json_object" }
  });

  const data = parseJsonSafe(result.text);
  data._aiMeta = { provider: result.provider, model: result.model };
  return data;
}

// 2. Job Description Analyzer & Semantic Portfolio Matcher
export async function analyzeJobDescription(jobTitle, jobDescription, portfolioRecords = []) {
  const portfolioSummary = portfolioRecords.map(r => ({
    id: r.id,
    category: r.category,
    title: r.title,
    subtitle: r.subtitle || "",
    description: (r.description || "").slice(0, 400)
  }));

  const prompt = `
You are an expert ATS and technical recruiter evaluating a candidate for this role.

TARGET ROLE:
${jobTitle}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S PORTFOLIO RECORDS:
${JSON.stringify(portfolioSummary, null, 2)}

INSTRUCTIONS:
1. Extract from the JD:
   - requiredSkills: must-have technical and domain skills
   - preferredSkills: nice-to-have or bonus qualifications
   - educationalRequirements: required or preferred degrees / fields
   - experienceRequirements: years of experience or specific roles
   - relevantKeywords: important keywords and technologies from the JD

2. Match the candidate's actual portfolio records against these requirements.
   STRICT HONESTY RULES:
   - Match a requirement ONLY if the candidate's portfolio contains actual evidence.
   - Do NOT assume the candidate knows a technology just because it is mentioned in the JD.
   - Categorize each requirement into one of four states:
     a) "matched": The candidate has direct supporting evidence in their portfolio.
     b) "partiallySupported": The candidate has related or adjacent skills/projects, but not exact.
     c) "missing": The candidate's portfolio contains no evidence for this requirement.
     d) "unevaluated": The requirement cannot be evaluated from standard portfolio data (e.g. willingness to relocate).

3. Calculate a matchScore from 0 to 100 based on required skills coverage.

Return ONLY a valid JSON object matching this schema:
{
  "targetJobTitle": "${jobTitle}",
  "requiredSkills": ["skill1", "skill2"],
  "preferredSkills": ["skill1", "skill2"],
  "educationalRequirements": ["req1"],
  "experienceRequirements": ["req1"],
  "relevantKeywords": ["keyword1", "keyword2"],
  "matchScore": 85,
  "summaryAnalysis": "Concise 2-sentence summary of candidate fit and major strengths.",
  "matchedRequirements": [
    {
      "requirement": "React & Modern JavaScript",
      "matchedRecordId": "id of matching record or null",
      "evidence": "Candidate built PortfoliAI and has React.js listed"
    }
  ],
  "partiallySupportedRequirements": [
    {
      "requirement": "Cloud Infrastructure",
      "relatedRecordId": "id of related record",
      "explanation": "Has AWS Cloud Practitioner certification, but limited production DevOps experience"
    }
  ],
  "missingRequirements": [
    {
      "requirement": "GraphQL",
      "explanation": "No GraphQL projects or skills found in portfolio"
    }
  ],
  "unevaluatedRequirements": [
    {
      "requirement": "Must be able to work Pacific Time",
      "explanation": "Working hours/scheduling cannot be assessed from technical portfolio"
    }
  ],
  "recommendedRecordIds": ["list of portfolio IDs that are most relevant to feature on the resume"]
}
`;

  const result = await callGroqChat({
    messages: [
      {
        role: "system",
        content: "You are a precise ATS evaluator who strictly assesses candidate credentials against job requirements without hallucination. Output strictly valid JSON."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    responseFormat: { type: "json_object" }
  });

  const analysis = parseJsonSafe(result.text);

  analysis.methodologyNote = "Transparent Matching Methodology: Relevance and match scores are heuristic estimates comparing JD keywords and requirements against verified portfolio records. This is an assessment of keyword alignment, not an objective guarantee of qualification.";
  analysis._aiMeta = { provider: result.provider, model: result.model };

  return analysis;
}

// 3. Dynamic Tailored Resume Generator
export async function tailorResume({
  jobTitle,
  jobDescription,
  selectedRecords,
  customSummary = "",
  sectionOrder = []
}) {
  const prompt = `
You are a senior executive resume writer.

Generate a complete, ATS-optimized Markdown resume tailored for:
TARGET ROLE: ${jobTitle}
TARGET JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}

CANDIDATE'S AUTHORIZED PORTFOLIO RECORDS:
${JSON.stringify(selectedRecords, null, 2)}

CUSTOM PROFESSIONAL SUMMARY:
${customSummary ? customSummary : "Synthesize from the candidate's verified background tailored to this target role."}

PREFERRED SECTION ORDERING:
${sectionOrder && sectionOrder.length > 0 ? sectionOrder.join(" -> ") : "Summary -> Technical Skills -> Experience -> Projects -> Education -> Certifications -> Achievements -> Languages"}

STRICT ANTI-HALLUCINATION & INTEGRITY MANDATES:
1. Ground every statement STRICTLY in the supplied portfolio records.
2. NEVER invent:
   - Employers, companies, client names
   - Degrees, institutions, GPAs
   - Certifications or credential IDs
   - Projects or performance statistics (e.g. do not invent 'increased revenue by 40%' unless written in the record)
   - Skills or tools not present in the candidate's selected list.
3. If a JD requirement is missing from the candidate's records, DO NOT add it.
4. If an essential contact detail is missing, omit or place a placeholder like [Email].
5. Format with clean, structured Markdown:
   - Level 1 Heading (# Name)
   - Subtitle with contact info
   - Level 2 Headings (## Section Name)
   - Professional bullet points highlighting action verbs and actual technical competencies.

Return ONLY the Markdown text of the resume draft.
`;

  const result = await callGroqChat({
    messages: [
      {
        role: "system",
        content: "You write world-class, ATS-compliant resumes using only verified factual portfolio data. Never invent qualifications, experience, or achievements."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  return {
    draft: result.text,
    provider: result.provider,
    model: result.model
  };
}
