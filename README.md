# PortfoliAI – AI-Powered Portfolio & Resume Generator

PortfoliAI is an AI-powered portfolio management system that helps users organize their professional information, manage achievements and projects, analyze job descriptions, and generate customized resumes.

The system combines structured portfolio storage with AI-assisted features to make resume preparation easier and more organized.

## ✨ Features

- **Portfolio Management:** Store and manage personal details, education, skills, certifications, projects, experience, achievements, and other professional information.
- **AI Quick-Add:** Organize portfolio information with AI assistance.
- **Job Description Analyzer:** Analyze job descriptions and identify matching skills, supporting evidence, and missing or partially matched requirements.
- **Dynamic Resume Builder:** Customize resume content, summaries, sections, and section order.
- **Resume Version History:** Keep track of saved resume versions.
- **PDF Export:** Export customized resumes as PDF documents.
- **Google Sheets Integration:** Support portfolio data integration through an Apps Script webhook and CSV export.
- **Database Storage:** Use SQLite for structured portfolio data management.

## 🛠️ Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js

**Database**
- SQLite (`node:sqlite`)

**AI Integration**
- Groq API

**Other Tools**
- Google Apps Script
- jsPDF
- html2canvas

## 📁 Project Structure

```text
Portfolio/
├── public/
├── server/
│   ├── db.js
│   ├── index.js
│   ├── groq.js
│   ├── gemini.js
│   ├── sheets.js
│   ├── package.json
│   └── .env.example
├── src/
│   ├── components/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- A Groq API key for AI-powered features

### 1. Clone the repository

```bash
git clone https://github.com/deva2407-eng/ai-powered-portfolio-resume-generator.git
cd ai-powered-portfolio-resume-generator
```

### 2. Install dependencies

```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
cd ..
```

### 3. Configure environment variables

Create your local environment file using the example:

```bash
cp server/.env.example server/.env
```

Add your required configuration and Groq API key to `server/.env`, following the variable names in `server/.env.example`.

Never commit your real API keys or secrets.

### 4. Run the application

Start the frontend and backend using the development scripts configured in their respective `package.json` files.

Check the available scripts:

```bash
npm run
```

```bash
cd server
npm run
```

Use the appropriate development or start scripts listed for each application.

## 🔐 Security

- Keep API keys and credentials in environment variables.
- Do not upload `.env` files or database files containing private information.
- Use `.env.example` for documenting required configuration.
- Avoid storing sensitive personal information in public repositories.

## 🎯 Project Objective

The objective of PortfoliAI is to simplify professional portfolio management and resume creation through structured data storage, AI-assisted analysis, and customizable resume generation.

## 👩‍💻 Author

**Devaanshee Kerkar**

GitHub: [@deva2407-eng](https://github.com/deva2407-eng)

## 📌 Repository

[AI-Powered Portfolio & Resume Generator](https://github.com/deva2407-eng/ai-powered-portfolio-resume-generator)
