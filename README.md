# Voca

> Your career, clearly organised. Your next move, better prepared.

A free, privacy-conscious career workspace for organising experience, building application documents, understanding role fit, and managing a job search.

The project is intentionally **free and local-first**. The new Job Match feature uses a transparent rule-based engine that runs entirely in the browser — no OpenAI API, paid AI provider, backend, account, API key, or usage quota is required.

## ✨ Features

### 📊 Experience Management
- Real-time experience duration calculations
- Company, role, location and employment details
- Skills and technologies per role
- Achievement bullets
- Current-position support
- LocalStorage persistence
- JSON import/export

### 📄 Resume Builder
- Classic, Modern and Minimal templates
- Profile and professional summary
- Work experience
- Technical skills aggregation
- Education
- Certifications
- Projects
- PDF export
- Print support
- Template switching
- Dark mode and responsive layouts

### 🎯 Job Match — NEW
Paste a complete job description and compare it with the career information stored in the app.

The matcher reports:
- Overall match score
- Required-skill coverage
- Preferred-skill coverage
- Keyword coverage
- Matched keywords
- Missing keywords
- Skill-category coverage
- Detected seniority
- Education requirement coverage

**Privacy/free guarantee:** Job Match runs locally in the browser using deterministic JavaScript. The job description and analysis are stored only in browser LocalStorage. Nothing is sent to an AI provider or paid service.

### 🧪 Automated Quality Checks
Every pull request and push runs:
- React unit tests
- Production build
- Playwright desktop browser tests
- Playwright mobile browser tests
- Dark-mode/responsive regression checks
- Resume template switching checks
- LocalStorage persistence checks
- PDF download checks
- Job Match analysis and persistence checks
- GitHub Pages deployment only after all checks pass

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm

### Installation

```bash
git clone https://github.com/aniket-r2Dev2/voca.git
cd voca
npm install
npm start
```

Open `http://localhost:3000`.

### Production build

```bash
npm run build
```

### Unit tests

```bash
npm test
```

### Browser tests

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

The browser suite starts the built application with the repository's GitHub Pages basename so routing is tested in the same shape as production.

## 🎯 How to Use

### Track your experience

1. Open **Experiences**.
2. Add your companies, roles, dates, skills and achievements.
3. Your data is automatically persisted locally.
4. Use JSON export for backups.

### Build a resume

1. Open **Resume**.
2. Add your profile information.
3. Add education, certifications and projects under **Resume Sections**.
4. Choose Classic, Modern or Minimal.
5. Download PDF or print.

### Match a job description

1. Open **Job Match**.
2. Paste the complete job description.
3. Select **Analyze Match**.
4. Review the overall score, matched skills and gaps.
5. Use the gaps as a checklist for improving your resume **only where they reflect real experience**.

The current matcher is intentionally deterministic. It does not invent skills, achievements, metrics or experience.

## 🧠 How Job Match Works

The first version does not depend on a server or AI API.

1. The JD is normalized locally.
2. Known skills, seniority terms and education terms are detected.
3. The engine searches the saved profile, experiences, education, certifications and projects.
4. Required, preferred and overall keyword coverage are calculated.
5. Results are grouped by skill category.

The score is designed to be transparent rather than pretending to be an authoritative ATS score. It is a useful comparison signal, not a hiring prediction.

### Scoring

- Required skills: 60%
- Overall detected keyword coverage: 25%
- Preferred skills: 10%
- Education requirement: 5%

When a JD contains no recognized keywords, the analyzer does not penalize the user for something it cannot understand.

## 🔒 Privacy & Free-Use Principles

- Career data is stored in browser LocalStorage.
- Job descriptions and Job Match results are stored locally.
- Job Match has no backend and no external AI calls.
- No paid package is required for Job Match.
- No API key is required for Job Match.
- Export/import lets users keep control of their data.

Some older autocomplete functionality in the application may use optional external data integrations. The Job Match feature intentionally does **not** add any paid dependency or external service.

## 🧱 Technology Stack

### Core
- React 19
- React Router
- Tailwind CSS
- Lucide React

### Resume
- react-to-print
- html2canvas
- jsPDF

### Testing
- React Testing Library
- Jest via Create React App
- Playwright

### Storage
- Browser LocalStorage

### Deployment
- GitHub Actions
- GitHub Pages

No new paid service, hosted database, AI API, or proprietary SDK is required by the Job Match feature.

## 📁 Project Structure

```text
career-workbench/
├── e2e/
│   ├── server.js
│   ├── resume-builder.spec.js
│   └── job-match.spec.js
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── forms/
│   │   ├── layout/
│   │   └── resume/
│   ├── config/
│   ├── hooks/
│   │   ├── useExperience.js
│   │   ├── useProfile.js
│   │   ├── useResumeSections.js
│   │   └── useJobMatch.js
│   ├── pages/
│   │   ├── Dashboard.js
│   │   ├── Resume.js
│   │   └── JobMatch.js
│   ├── utils/
│   │   ├── dateUtils.js
│   │   └── jobMatchUtils.js
│   └── __tests__/
├── playwright.config.js
└── .github/workflows/deploy.yml
```

## 🗺️ Product roadmap

See the [Voca product vision and delivery roadmap](ROADMAP.md), including product principles, phase exit criteria, and the long-term plan.

## 🚀 Deployment

The production site is deployed through GitHub Pages after the CI pipeline passes.

Live app:

https://aniket-r2dev2.github.io/voca/

GitHub Actions workflow:

`.github/workflows/deploy.yml`

The deployment job is deliberately last in the pipeline, so a failing unit test, build, or browser regression blocks deployment.

## 🤝 Contributing

1. Create a feature branch.
2. Implement the feature with unit tests.
3. Add Playwright coverage for user-visible workflows where appropriate.
4. Run the production build.
5. Open a pull request.
6. Merge only after CI is green.

## 📄 License

MIT License — see `LICENSE`.

---

Built with React and open-source tooling. ❤️
