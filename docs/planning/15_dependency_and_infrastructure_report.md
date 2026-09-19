# Deliverable 15: Dependency and Infrastructure Report
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Infrastructure Engineer:** Platform Specialist  

---

## 1. Runtime & Language Environment

| Component | Target Version | Current Configuration | Evaluation |
| :--- | :--- | :--- | :--- |
| **Node.js** | >= 20.x LTS | Node.js v20+ with ES Modules (`"type": "module"`) | **Optimal:** Full modern async, top-level await, native fetch support. |
| **TypeScript (BE)** | >= 5.x | TypeScript 7.0.2 / tsx 4.23.12 | **Modern:** Fast execution via `tsx` watch mode. |
| **TypeScript (FE)** | >= 5.x | TypeScript ~6.0.2 / Vite 8.2.0 | **Modern:** Fast HMR and build optimizations. |
| **Database** | PostgreSQL 15+ | PostgreSQL with `pg` native driver and Prisma ORM | **Robust:** JSONB support, ACID transactions, UUID extensions. |

---

## 2. Production Dependencies & Library Audit

### 2.1 Backend (`/backend/package.json`)
- **Core HTTP:** `express` 5.2.1 (modern Express with native async error routing).
- **ORM & DB:** `@prisma/client` 7.10.0, `@prisma/adapter-pg` 7.9.1, `pg` 8.23.0.
- **Security & Cryptography:** `argon2` 0.45.1, `bcryptjs` 3.0.3, `helmet` 8.3.0, `cors` 2.8.6, `cookie-parser` 1.4.7, `express-rate-limit` 8.7.0.
- **Publishing & File Processing:** `archiver` 8.0.0 (ZIP generation), `ssh2-sftp-client` 12.1.1 (SFTP transport).
- **Auth & Mail:** `passport` 0.7.0, `passport-google-oauth20` 2.0.0, `passport-github2` 0.1.12, `nodemailer` 9.0.6.
- **Validation:** `zod` 4.4.3.
- **Evaluation:** No unnecessary bloat; well-curated production libraries.

### 2.2 Frontend (`/frontend/package.json`)
- **UI Framework:** `react` 19.2.8, `react-dom` 19.2.8.
- **Routing:** `react-router-dom` 7.18.2.
- **Styling:** `tailwindcss` 4.3.3, `@tailwindcss/vite` 4.3.3.
- **Visual Editing & Icons:** `@monaco-editor/react` 4.7.0, `monaco-editor` 0.56.0, `lucide-react` 1.43.0.
- **Sanitization:** `dompurify` 3.4.15.
- **Evaluation:** Leading-edge stack with React 19 and Tailwind 4.

---

## 3. Environment Variable Requirements

| Variable | System | Purpose | Production Default / Guidance |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend | Server port | `5000` |
| `FRONTEND_URL` | Backend | CORS origin whitelist | `http://localhost:5173` |
| `DATABASE_URL` | Backend | PostgreSQL connection URI | `postgresql://user:pass@localhost:5432/forgestudio` |
| `SESSION_SECRET`| Backend | Cryptographic cookie signing | 64-character random hex string |
| `JWT_SECRET` | Backend | JWT token signing key | 64-character random hex string |
| `GOOGLE_CLIENT_ID`| Backend | Google OAuth client ID | Google Cloud Console credentials |
| `GOOGLE_CLIENT_SECRET`| Backend | Google OAuth client secret | Google Cloud Console credentials |
| `GITHUB_CLIENT_ID`| Backend | GitHub OAuth app client ID | GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET`| Backend | GitHub OAuth app secret | GitHub Developer Settings |
| `SMTP_HOST` | Backend | Email transport server | e.g. `smtp.sendgrid.net` |
| `VITE_API_URL` | Frontend | Backend API endpoint | `http://localhost:5000` |
