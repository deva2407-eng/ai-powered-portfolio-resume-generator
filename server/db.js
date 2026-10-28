import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "portfolio.db");
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON;");

// Initialize Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS personal_information (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      location TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      portfolio_website TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS professional_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      institution TEXT NOT NULL,
      degree TEXT NOT NULL,
      field_of_study TEXT,
      start_date TEXT,
      end_date TEXT,
      grade TEXT,
      highlights TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Technical Skill',
      proficiency_level TEXT DEFAULT 'Intermediate',
      years_of_experience REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      issuer TEXT NOT NULL,
      issue_date TEXT,
      expiration_date TEXT,
      credential_id TEXT,
      credential_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      role TEXT,
      tech_stack TEXT,
      description TEXT NOT NULL,
      live_url TEXT,
      repo_url TEXT,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS experience (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      organization TEXT NOT NULL,
      position TEXT NOT NULL,
      type TEXT DEFAULT 'Internship',
      location TEXT,
      start_date TEXT,
      end_date TEXT,
      is_current INTEGER DEFAULT 0,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      issuer TEXT,
      date_received TEXT,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS publications_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'Publication',
      title TEXT NOT NULL,
      publisher_organization TEXT,
      date TEXT,
      url TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      proficiency TEXT DEFAULT 'Fluent',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resume_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      version_name TEXT NOT NULL,
      target_role TEXT NOT NULL,
      job_description TEXT NOT NULL,
      selected_record_ids TEXT NOT NULL,
      tailored_content TEXT NOT NULL,
      custom_summary TEXT,
      section_order TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS google_sheets_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      sheet_url TEXT,
      sheet_id TEXT,
      webhook_url TEXT,
      last_synced_at TEXT,
      sync_status TEXT,
      last_error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure default user exists
  const user = db.prepare("SELECT id FROM users WHERE id = 1").get();
  if (!user) {
    db.prepare("INSERT INTO users (id, name, email) VALUES (1, 'Alex Morgan', 'alex.morgan@example.edu')").run();
  }

  // Check if we need to seed initial records
  const count = db.prepare("SELECT COUNT(*) as c FROM skills").get().c;
  if (count === 0) {
    seedDatabase();
  }
}

// Seed realistic fictional records
export function seedDatabase(userId = 1) {
  // Clear existing records for this user
  const tables = [
    "personal_information",
    "professional_summary",
    "education",
    "skills",
    "certifications",
    "projects",
    "experience",
    "achievements",
    "publications_activities",
    "languages"
  ];

  for (const t of tables) {
    db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(userId);
  }

  // Personal Info
  db.prepare(`
    INSERT INTO personal_information (user_id, full_name, email, phone, location, linkedin_url, github_url, portfolio_website)
    VALUES (?, 'Alex Morgan', 'alex.morgan@university.edu', '+1 (555) 234-5678', 'San Francisco, CA', 'https://linkedin.com/in/alexmorgan-dev', 'https://github.com/alexmorgan', 'https://alexmorgan.dev')
  `).run(userId);

  // Summary
  db.prepare(`
    INSERT INTO professional_summary (user_id, title, summary)
    VALUES (?, 'Full-Stack Software Engineer & CS Graduate', 'Results-driven software engineering graduate with hands-on experience in full-stack development, modern JavaScript frameworks (React, Node.js), and database design. Adept at building scalable web applications, RESTful APIs, and responsive user interfaces with a rigorous commitment to code quality.')
  `).run(userId);

  // Education
  db.prepare(`
    INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, grade, highlights)
    VALUES (?, 'State University of Technology', 'Bachelor of Science (B.S.)', 'Computer Science & Engineering', '2022', '2026', 'GPA 3.85 / 4.0', 'Relevant Coursework: Data Structures & Algorithms, Distributed Systems, Database Management Systems, Web Architecture, Machine Learning Foundations. Dean''s Honor List.')
  `).run(userId);

  // Skills
  const skillsData = [
    ['React.js', 'Technical Skill', 'Advanced', 3.0],
    ['JavaScript / TypeScript', 'Technical Skill', 'Advanced', 3.5],
    ['Node.js & Express', 'Technical Skill', 'Advanced', 2.5],
    ['SQLite & PostgreSQL', 'Technical Skill', 'Intermediate', 2.0],
    ['HTML5 & CSS3 / Tailwind', 'Technical Skill', 'Advanced', 3.0],
    ['Python', 'Technical Skill', 'Intermediate', 2.0],
    ['Git & GitHub CI/CD', 'Technical Skill', 'Advanced', 3.0],
    ['RESTful API Design', 'Technical Skill', 'Advanced', 2.5],
    ['Problem Solving & Debugging', 'Soft Skill', 'Advanced', 4.0],
    ['Cross-functional Team Collaboration', 'Soft Skill', 'Advanced', 3.0],
    ['Agile & Scrum Methodologies', 'Soft Skill', 'Intermediate', 2.0],
    ['Technical Documentation', 'Additional Competency', 'Advanced', 2.5],
    ['Docker & Containerization', 'Additional Competency', 'Intermediate', 1.5]
  ];

  for (const [name, cat, prof, yrs] of skillsData) {
    db.prepare(`
      INSERT INTO skills (user_id, name, category, proficiency_level, years_of_experience)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, cat, prof, yrs);
  }

  // Certifications
  db.prepare(`
    INSERT INTO certifications (user_id, name, issuer, issue_date, expiration_date, credential_id, credential_url)
    VALUES (?, 'AWS Certified Cloud Practitioner (CLF-C02)', 'Amazon Web Services', '2024-05', '2027-05', 'AWS-CCP-984210', 'https://aws.amazon.com/verification')
  `).run(userId);

  db.prepare(`
    INSERT INTO certifications (user_id, name, issuer, issue_date, expiration_date, credential_id, credential_url)
    VALUES (?, 'Meta Front-End Developer Professional Certificate', 'Meta (Coursera)', '2023-11', 'None', 'META-FED-55219', 'https://coursera.org/verify/meta-fed')
  `).run(userId);

  // Projects
  db.prepare(`
    INSERT INTO projects (user_id, title, role, tech_stack, description, live_url, repo_url, start_date, end_date)
    VALUES (?, 'PortfoliAI - Portfolio & Resume Generator', 'Lead Full-Stack Developer', 'React 19, Node.js, Express, SQLite, Gemini API', 'Architected an automated career management platform featuring relational database persistence, JD semantic gap analyzer, and dynamic ATS-tailored resume generation.', 'https://portfoliai.dev', 'https://github.com/alexmorgan/portfoliai', '2024-08', 'Present')
  `).run(userId);

  db.prepare(`
    INSERT INTO projects (user_id, title, role, tech_stack, description, live_url, repo_url, start_date, end_date)
    VALUES (?, 'TaskFlow - Collaborative Kanban Board', 'Full-Stack Developer', 'React, TypeScript, WebSocket, Node.js, PostgreSQL', 'Engineered a real-time team collaboration application with drag-and-drop task pipelines, role-based access control, and instant WebSocket state synchronization.', 'https://taskflow.dev', 'https://github.com/alexmorgan/taskflow', '2023-10', '2024-03')
  `).run(userId);

  db.prepare(`
    INSERT INTO projects (user_id, title, role, tech_stack, description, live_url, repo_url, start_date, end_date)
    VALUES (?, 'EcoTrack - Carbon Footprint Analytics API', 'Backend Developer', 'Python, FastAPI, SQLite, Docker', 'Developed a high-throughput microservice calculating commuting emissions based on open geodata; implemented Redis caching reducing API response latency by 45%.', 'https://ecotrack.dev', 'https://github.com/alexmorgan/ecotrack', '2023-04', '2023-08')
  `).run(userId);

  // Experience / Internships
  db.prepare(`
    INSERT INTO experience (user_id, organization, position, type, location, start_date, end_date, is_current, description)
    VALUES (?, 'NextGen Software Labs', 'Software Engineering Intern', 'Internship', 'San Francisco, CA (Hybrid)', '2024-05', '2024-08', 0, 'Collaborated with senior engineers to implement reusable React components, refactored 12+ legacy REST endpoints in Express, improved test coverage to 88% using Jest, and participated in daily standups and bi-weekly sprint demos.')
  `).run(userId);

  db.prepare(`
    INSERT INTO experience (user_id, organization, position, type, location, start_date, end_date, is_current, description)
    VALUES (?, 'University IT Academic Services', 'Student Web Developer', 'Part-time', 'Campus', '2023-09', '2024-04', 0, 'Maintained and updated departmental web portals supporting over 4,000 active students and faculty; improved page load performance by 35% through image optimization and asset minification.')
  `).run(userId);

  // Achievements
  db.prepare(`
    INSERT INTO achievements (user_id, title, issuer, date_received, description)
    VALUES (?, '1st Place Winner - Collegiate Hackathon 2024', 'TechHub Annual Hackathon', '2024-03', 'Won first place among 65 collegiate teams for developing an accessible AI-powered learning aid in 36 hours.')
  `).run(userId);

  db.prepare(`
    INSERT INTO achievements (user_id, title, issuer, date_received, description)
    VALUES (?, 'Academic Excellence Award in Computer Science', 'Department of Computer Science', '2023-12', 'Recognized for top 5% academic performance in computational theory and software architecture.')
  `).run(userId);

  // Publications & Activities
  db.prepare(`
    INSERT INTO publications_activities (user_id, type, title, publisher_organization, date, url, description)
    VALUES (?, 'Publication', 'Optimizing Client-Side State Reconciliation in Modern Web Apps', 'Undergraduate Research Symposium Proceedings', '2024-04', 'https://doi.org/10.1234/cs.2024.01', 'Authored paper investigating virtual DOM diffing efficiency under heavy concurrent state updates.')
  `).run(userId);

  db.prepare(`
    INSERT INTO publications_activities (user_id, type, title, publisher_organization, date, url, description)
    VALUES (?, 'Relevant Activity', 'Vice President - Association for Computing Machinery (ACM) Student Chapter', 'ACM Student Chapter', '2023-09', 'Present', 'Organized 8 technical workshops on modern web stacks, cloud fundamentals, and technical interview preparation for 150+ members.')
  `).run(userId);

  // Languages
  db.prepare(`
    INSERT INTO languages (user_id, language, proficiency)
    VALUES (?, 'English', 'Native')
  `).run(userId);

  db.prepare(`
    INSERT INTO languages (user_id, language, proficiency)
    VALUES (?, 'Spanish', 'Conversational')
  `).run(userId);
}

// Get all portfolio items in structured and flattened format
export function getAllPortfolio(userId = 1) {
  const personal = db.prepare("SELECT * FROM personal_information WHERE user_id = ?").all(userId);
  const summary = db.prepare("SELECT * FROM professional_summary WHERE user_id = ?").all(userId);
  const education = db.prepare("SELECT * FROM education WHERE user_id = ? ORDER BY id DESC").all(userId);
  const skills = db.prepare("SELECT * FROM skills WHERE user_id = ? ORDER BY category, name").all(userId);
  const certs = db.prepare("SELECT * FROM certifications WHERE user_id = ? ORDER BY id DESC").all(userId);
  const projects = db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY id DESC").all(userId);
  const experience = db.prepare("SELECT * FROM experience WHERE user_id = ? ORDER BY id DESC").all(userId);
  const achievements = db.prepare("SELECT * FROM achievements WHERE user_id = ? ORDER BY id DESC").all(userId);
  const pubActivities = db.prepare("SELECT * FROM publications_activities WHERE user_id = ? ORDER BY id DESC").all(userId);
  const languages = db.prepare("SELECT * FROM languages WHERE user_id = ? ORDER BY id DESC").all(userId);

  // Flattened entries for unified view / backward compatibility
  const flat = [];

  for (const p of personal) {
    flat.push({
      id: `personal_${p.id}`,
      table: 'personal_information',
      numeric_id: p.id,
      category: 'Personal Information',
      title: p.full_name,
      subtitle: `${p.email} | ${p.phone || ''} | ${p.location || ''}`,
      description: [
        p.linkedin_url ? `LinkedIn: ${p.linkedin_url}` : '',
        p.github_url ? `GitHub: ${p.github_url}` : '',
        p.portfolio_website ? `Website: ${p.portfolio_website}` : ''
      ].filter(Boolean).join('\n'),
      raw: p
    });
  }

  for (const s of summary) {
    flat.push({
      id: `summary_${s.id}`,
      table: 'professional_summary',
      numeric_id: s.id,
      category: 'Professional Summary',
      title: s.title,
      subtitle: 'Career Objective & Profile',
      description: s.summary,
      raw: s
    });
  }

  for (const e of education) {
    flat.push({
      id: `education_${e.id}`,
      table: 'education',
      numeric_id: e.id,
      category: 'Education',
      title: `${e.degree} in ${e.field_of_study || 'Computer Science'}`,
      subtitle: `${e.institution} (${e.start_date || ''} - ${e.end_date || ''})`,
      description: [e.grade ? `Grade: ${e.grade}` : '', e.highlights].filter(Boolean).join('\n'),
      dates: `${e.start_date || ''} - ${e.end_date || ''}`,
      raw: e
    });
  }

  for (const sk of skills) {
    flat.push({
      id: `skill_${sk.id}`,
      table: 'skills',
      numeric_id: sk.id,
      category: sk.category || 'Technical Skill',
      title: sk.name,
      subtitle: `${sk.proficiency_level || 'Intermediate'}${sk.years_of_experience ? ` (${sk.years_of_experience} yrs)` : ''}`,
      description: `Proficiency: ${sk.proficiency_level || 'Intermediate'}, Experience: ${sk.years_of_experience || 1} year(s)`,
      raw: sk
    });
  }

  for (const c of certs) {
    flat.push({
      id: `cert_${c.id}`,
      table: 'certifications',
      numeric_id: c.id,
      category: 'Certification',
      title: c.name,
      subtitle: `${c.issuer} (${c.issue_date || ''})`,
      description: [
        c.credential_id ? `ID: ${c.credential_id}` : '',
        c.credential_url ? `URL: ${c.credential_url}` : '',
        c.expiration_date ? `Expires: ${c.expiration_date}` : ''
      ].filter(Boolean).join('\n'),
      dates: c.issue_date,
      raw: c
    });
  }

  for (const pr of projects) {
    flat.push({
      id: `project_${pr.id}`,
      table: 'projects',
      numeric_id: pr.id,
      category: 'Project',
      title: pr.title,
      subtitle: `${pr.role || 'Developer'} | Stack: ${pr.tech_stack || ''}`,
      description: pr.description,
      dates: `${pr.start_date || ''} - ${pr.end_date || ''}`,
      raw: pr
    });
  }

  for (const exp of experience) {
    flat.push({
      id: `experience_${exp.id}`,
      table: 'experience',
      numeric_id: exp.id,
      category: exp.type === 'Internship' ? 'Internship' : 'Work Experience',
      title: `${exp.position} @ ${exp.organization}`,
      subtitle: `${exp.type} (${exp.start_date || ''} - ${exp.end_date || (exp.is_current ? 'Present' : '')}) | ${exp.location || ''}`,
      description: exp.description,
      dates: `${exp.start_date || ''} - ${exp.end_date || (exp.is_current ? 'Present' : '')}`,
      raw: exp
    });
  }

  for (const a of achievements) {
    flat.push({
      id: `achievement_${a.id}`,
      table: 'achievements',
      numeric_id: a.id,
      category: 'Achievement',
      title: a.title,
      subtitle: `${a.issuer || ''} (${a.date_received || ''})`,
      description: a.description,
      dates: a.date_received,
      raw: a
    });
  }

  for (const pa of pubActivities) {
    flat.push({
      id: `publication_${pa.id}`,
      table: 'publications_activities',
      numeric_id: pa.id,
      category: pa.type || 'Publication',
      title: pa.title,
      subtitle: `${pa.publisher_organization || ''} (${pa.date || ''})`,
      description: [pa.description, pa.url ? `URL: ${pa.url}` : ''].filter(Boolean).join('\n'),
      dates: pa.date,
      raw: pa
    });
  }

  for (const l of languages) {
    flat.push({
      id: `language_${l.id}`,
      table: 'languages',
      numeric_id: l.id,
      category: 'Language',
      title: l.language,
      subtitle: `Proficiency: ${l.proficiency}`,
      description: `${l.language} (${l.proficiency})`,
      raw: l
    });
  }

  return {
    structured: {
      personal_information: personal,
      professional_summary: summary,
      education,
      skills,
      certifications: certs,
      projects,
      experience,
      achievements,
      publications_activities: pubActivities,
      languages
    },
    flat
  };
}

// Add generic record
export function addPortfolioRecord(category, data, userId = 1) {
  const cat = (category || '').toLowerCase().trim();

  if (cat.includes('personal') || cat === 'contact') {
    const res = db.prepare(`
      INSERT INTO personal_information (user_id, full_name, email, phone, location, linkedin_url, github_url, portfolio_website)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      data.full_name || data.title || 'Anonymous',
      data.email || 'user@example.com',
      data.phone || '',
      data.location || '',
      data.linkedin_url || '',
      data.github_url || '',
      data.portfolio_website || ''
    );
    return { id: `personal_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'personal_information' };
  }

  if (cat.includes('summary') || cat.includes('objective')) {
    const res = db.prepare(`
      INSERT INTO professional_summary (user_id, title, summary)
      VALUES (?, ?, ?)
    `).run(userId, data.title || 'Professional Summary', data.description || data.summary || '');
    return { id: `summary_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'professional_summary' };
  }

  if (cat.includes('education') || cat.includes('degree') || cat.includes('qualification')) {
    const res = db.prepare(`
      INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, grade, highlights)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      data.institution || data.subtitle || data.title || 'University',
      data.degree || data.title || 'Degree',
      data.field_of_study || '',
      data.start_date || '',
      data.end_date || '',
      data.grade || '',
      data.description || data.highlights || ''
    );
    return { id: `education_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'education' };
  }

  if (cat.includes('skill') || cat.includes('competency')) {
    let skillCat = 'Technical Skill';
    if (cat.includes('soft')) skillCat = 'Soft Skill';
    else if (cat.includes('additional') || cat.includes('competency')) skillCat = 'Additional Competency';
    else if (data.category) skillCat = data.category;

    const res = db.prepare(`
      INSERT INTO skills (user_id, name, category, proficiency_level, years_of_experience)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      data.title || data.name || 'New Skill',
      skillCat,
      data.proficiency_level || data.proficiency || 'Intermediate',
      Number(data.years_of_experience) || 1.0
    );
    return { id: `skill_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'skills' };
  }

  if (cat.includes('cert') || cat.includes('course')) {
    const res = db.prepare(`
      INSERT INTO certifications (user_id, name, issuer, issue_date, expiration_date, credential_id, credential_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      data.title || data.name || 'Certification',
      data.issuer || data.subtitle || 'Organization',
      data.issue_date || data.dates || '',
      data.expiration_date || '',
      data.credential_id || '',
      data.credential_url || ''
    );
    return { id: `cert_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'certifications' };
  }

  if (cat.includes('project')) {
    const res = db.prepare(`
      INSERT INTO projects (user_id, title, role, tech_stack, description, live_url, repo_url, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      data.title || 'Project',
      data.role || 'Developer',
      data.tech_stack || data.subtitle || '',
      data.description || '',
      data.live_url || '',
      data.repo_url || '',
      data.start_date || '',
      data.end_date || ''
    );
    return { id: `project_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'projects' };
  }

  if (cat.includes('experience') || cat.includes('internship') || cat.includes('work')) {
    const res = db.prepare(`
      INSERT INTO experience (user_id, organization, position, type, location, start_date, end_date, is_current, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      data.organization || data.subtitle || 'Company',
      data.position || data.title || 'Role',
      cat.includes('intern') ? 'Internship' : (data.type || 'Full-time'),
      data.location || '',
      data.start_date || '',
      data.end_date || '',
      data.is_current ? 1 : 0,
      data.description || ''
    );
    return { id: `experience_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'experience' };
  }

  if (cat.includes('achieve') || cat.includes('award')) {
    const res = db.prepare(`
      INSERT INTO achievements (user_id, title, issuer, date_received, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      data.title || 'Achievement',
      data.issuer || data.subtitle || '',
      data.date_received || data.dates || '',
      data.description || ''
    );
    return { id: `achievement_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'achievements' };
  }

  if (cat.includes('pub') || cat.includes('paper') || cat.includes('activity') || cat.includes('research')) {
    const pubType = cat.includes('activity') ? 'Relevant Activity' : (cat.includes('research') ? 'Research Paper' : 'Publication');
    const res = db.prepare(`
      INSERT INTO publications_activities (user_id, type, title, publisher_organization, date, url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      pubType,
      data.title || 'Publication / Activity',
      data.publisher_organization || data.subtitle || '',
      data.date || data.dates || '',
      data.url || '',
      data.description || ''
    );
    return { id: `publication_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'publications_activities' };
  }

  if (cat.includes('lang')) {
    const res = db.prepare(`
      INSERT INTO languages (user_id, language, proficiency)
      VALUES (?, ?, ?)
    `).run(
      userId,
      data.title || data.language || 'Language',
      data.proficiency || data.subtitle || 'Fluent'
    );
    return { id: `language_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'languages' };
  }

  // Fallback: Skills or Projects
  const res = db.prepare(`
    INSERT INTO skills (user_id, name, category, proficiency_level, years_of_experience)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, data.title || 'Skill', 'Technical Skill', 'Intermediate', 1.0);
  return { id: `skill_${res.lastInsertRowid}`, numeric_id: res.lastInsertRowid, table: 'skills' };
}

// Update generic record
export function updatePortfolioRecord(idStr, data, userId = 1) {
  const parts = String(idStr).split('_');
  const prefix = parts[0];
  const numId = Number(parts[1] || idStr);

  const tableMap = {
    personal: 'personal_information',
    summary: 'professional_summary',
    education: 'education',
    skill: 'skills',
    cert: 'certifications',
    project: 'projects',
    experience: 'experience',
    achievement: 'achievements',
    publication: 'publications_activities',
    language: 'languages'
  };

  const table = tableMap[prefix] || 'skills';

  if (table === 'personal_information') {
    db.prepare(`
      UPDATE personal_information
      SET full_name = ?, email = ?, phone = ?, location = ?, linkedin_url = ?, github_url = ?, portfolio_website = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.full_name || data.title,
      data.email || 'user@example.com',
      data.phone || '',
      data.location || '',
      data.linkedin_url || '',
      data.github_url || '',
      data.portfolio_website || '',
      numId,
      userId
    );
  } else if (table === 'professional_summary') {
    db.prepare(`
      UPDATE professional_summary
      SET title = ?, summary = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(data.title, data.description || data.summary, numId, userId);
  } else if (table === 'education') {
    db.prepare(`
      UPDATE education
      SET institution = ?, degree = ?, field_of_study = ?, start_date = ?, end_date = ?, grade = ?, highlights = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.institution || data.subtitle || data.title,
      data.degree || data.title,
      data.field_of_study || '',
      data.start_date || '',
      data.end_date || '',
      data.grade || '',
      data.description || data.highlights || '',
      numId,
      userId
    );
  } else if (table === 'skills') {
    db.prepare(`
      UPDATE skills
      SET name = ?, category = ?, proficiency_level = ?, years_of_experience = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.title || data.name,
      data.category || 'Technical Skill',
      data.proficiency_level || data.proficiency || 'Intermediate',
      Number(data.years_of_experience) || 1.0,
      numId,
      userId
    );
  } else if (table === 'certifications') {
    db.prepare(`
      UPDATE certifications
      SET name = ?, issuer = ?, issue_date = ?, expiration_date = ?, credential_id = ?, credential_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.title || data.name,
      data.issuer || data.subtitle || '',
      data.issue_date || data.dates || '',
      data.expiration_date || '',
      data.credential_id || '',
      data.credential_url || '',
      numId,
      userId
    );
  } else if (table === 'projects') {
    db.prepare(`
      UPDATE projects
      SET title = ?, role = ?, tech_stack = ?, description = ?, live_url = ?, repo_url = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.title,
      data.role || '',
      data.tech_stack || data.subtitle || '',
      data.description || '',
      data.live_url || '',
      data.repo_url || '',
      data.start_date || '',
      data.end_date || '',
      numId,
      userId
    );
  } else if (table === 'experience') {
    db.prepare(`
      UPDATE experience
      SET organization = ?, position = ?, type = ?, location = ?, start_date = ?, end_date = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.organization || data.subtitle || '',
      data.position || data.title || '',
      data.type || 'Full-time',
      data.location || '',
      data.start_date || '',
      data.end_date || '',
      data.description || '',
      numId,
      userId
    );
  } else if (table === 'achievements') {
    db.prepare(`
      UPDATE achievements
      SET title = ?, issuer = ?, date_received = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.title,
      data.issuer || data.subtitle || '',
      data.date_received || data.dates || '',
      data.description || '',
      numId,
      userId
    );
  } else if (table === 'publications_activities') {
    db.prepare(`
      UPDATE publications_activities
      SET type = ?, title = ?, publisher_organization = ?, date = ?, url = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.type || 'Publication',
      data.title,
      data.publisher_organization || data.subtitle || '',
      data.date || data.dates || '',
      data.url || '',
      data.description || '',
      numId,
      userId
    );
  } else if (table === 'languages') {
    db.prepare(`
      UPDATE languages
      SET language = ?, proficiency = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.title || data.language,
      data.proficiency || data.subtitle || 'Fluent',
      numId,
      userId
    );
  }

  return { success: true, id: idStr };
}

// Delete record
export function deletePortfolioRecord(idStr, userId = 1) {
  const parts = String(idStr).split('_');
  const prefix = parts[0];
  const numId = Number(parts[1] || idStr);

  const tableMap = {
    personal: 'personal_information',
    summary: 'professional_summary',
    education: 'education',
    skill: 'skills',
    cert: 'certifications',
    project: 'projects',
    experience: 'experience',
    achievement: 'achievements',
    publication: 'publications_activities',
    language: 'languages'
  };

  const table = tableMap[prefix];
  if (!table) {
    // Try by checking if numId exists in any table
    for (const t of Object.values(tableMap)) {
      const res = db.prepare(`DELETE FROM ${t} WHERE id = ? AND user_id = ?`).run(numId, userId);
      if (res.changes > 0) return { success: true, table: t, id: numId };
    }
    return { success: false, error: 'Record not found' };
  }

  db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`).run(numId, userId);
  return { success: true, table, id: numId };
}

// Migrate entries from localStorage
export function migrateLocalStorageEntries(entries, userId = 1) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { migrated: 0 };
  }

  let count = 0;
  for (const item of entries) {
    if (!item.title) continue;
    addPortfolioRecord(item.category || 'Skill', {
      title: item.title,
      description: item.description || ''
    }, userId);
    count++;
  }
  return { migrated: count };
}

// Resume Drafts CRUD
export function getResumeDrafts(userId = 1) {
  return db.prepare("SELECT * FROM resume_drafts WHERE user_id = ? ORDER BY id DESC").all(userId);
}

export function saveResumeDraft(draftData, userId = 1) {
  const {
    version_name,
    target_role,
    job_description,
    selected_record_ids,
    tailored_content,
    custom_summary,
    section_order
  } = draftData;

  const res = db.prepare(`
    INSERT INTO resume_drafts (user_id, version_name, target_role, job_description, selected_record_ids, tailored_content, custom_summary, section_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    version_name || `${target_role || 'Resume'} - ${new Date().toLocaleDateString()}`,
    target_role || '',
    job_description || '',
    typeof selected_record_ids === 'string' ? selected_record_ids : JSON.stringify(selected_record_ids || []),
    tailored_content || '',
    custom_summary || '',
    typeof section_order === 'string' ? section_order : JSON.stringify(section_order || [])
  );

  return { id: res.lastInsertRowid };
}

export function deleteResumeDraft(id, userId = 1) {
  db.prepare("DELETE FROM resume_drafts WHERE id = ? AND user_id = ?").run(id, userId);
  return { success: true };
}

// Google Sheets Sync Config
export function getSheetsConfig(userId = 1) {
  const cfg = db.prepare("SELECT * FROM google_sheets_sync WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(userId);
  return cfg || {
    sheet_url: '',
    sheet_id: '',
    webhook_url: '',
    last_synced_at: null,
    sync_status: 'Not connected',
    last_error: null
  };
}

export function saveSheetsConfig(config, userId = 1) {
  const existing = db.prepare("SELECT id FROM google_sheets_sync WHERE user_id = ?").get(userId);
  if (existing) {
    db.prepare(`
      UPDATE google_sheets_sync
      SET sheet_url = ?, sheet_id = ?, webhook_url = ?, last_synced_at = ?, sync_status = ?, last_error = ?
      WHERE id = ?
    `).run(
      config.sheet_url || '',
      config.sheet_id || '',
      config.webhook_url || '',
      config.last_synced_at || null,
      config.sync_status || 'Configured',
      config.last_error || null,
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO google_sheets_sync (user_id, sheet_url, sheet_id, webhook_url, last_synced_at, sync_status, last_error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      config.sheet_url || '',
      config.sheet_id || '',
      config.webhook_url || '',
      config.last_synced_at || null,
      config.sync_status || 'Configured',
      config.last_error || null
    );
  }
  return getSheetsConfig(userId);
}

// Initialize on import
initDatabase();
