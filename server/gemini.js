// Backwards-compatible bridge forwarding to groq.js (Groq is now primary AI provider)
export {
  getAiStatus,
  parseUnstructuredPortfolio,
  analyzeJobDescription,
  tailorResume
} from "./groq.js";
