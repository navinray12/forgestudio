# ForgeStudio

> Next-generation Elementor-like visual website builder and SaaS editing platform with integrated WordPress publishing, dynamic content engine, media management, and multi-tenant workspace administration.

---

## Overview

**ForgeStudio** is a high-performance visual website creation platform engineered to deliver an Elementor-like drag-and-drop design environment seamlessly coupled with enterprise SaaS capabilities and native WordPress integration.

ForgeStudio bridges the gap between modern visual design and WordPress deployment by providing:
- **Visual Drag-and-Drop Builder:** High-speed layout editing with real-time responsive previews, inspectors, and component styling.
- **Native WordPress Sync:** Bidirectional publishing engine powered by the custom `forgestudio-connector` plugin and HMAC-signed REST API communication.
- **Dynamic Content & Custom Post Types:** Native Custom Post Type (CPT) builder, custom field engine, and entry management for dynamic template bindings.
- **Enterprise Multi-Tenancy:** Multi-tenant workspace management, role-based access control (RBAC), team collaboration, white-label options, and subscription management.

---

## Key Features

### 🎨 Visual Website Builder
- **Drag-and-Drop Canvas:** Component-based canvas supporting nested sections, columns, flex containers, and responsive breakpoints (Desktop, Tablet, Mobile).
- **Rich Widget Library:** Core and Pro widgets including Hero sections, Nested Tabs, Accordions, Flip Boxes, Image Carousels, Lottie animations, Lightboxes, Countdowns, and WooCommerce product grids.
- **Live Code Editor:** Integrated Monaco Editor (`@monaco-editor/react`) for custom JS/CSS/HTML code snippets with placement targeting (`HEAD`, `BODY_START`, `BODY_END`).
- **Revision History:** Version snapshot creation, automated checkpointing, and instant rollback for published pages and design assets.

### 🔌 WordPress Integration & Publishing
- **ForgeStudio Connector Plugin:** Lightweight PHP plugin establishing secure connection handshakes via the `forgestudio/v1` REST namespace.
- **HMAC SHA-256 Authentication:** Signed REST API requests ensuring secure site pairing without exposing WordPress admin credentials.
- **Gutenberg Block Transformation:** Automated conversion of ForgeStudio layout trees into native Gutenberg blocks (`wp:paragraph`, `wp:heading`, `wp:image`, etc.).
- **Media & Menu Synchronization:** Direct media asset uploading to the WordPress Media Library and dynamic navigation menu synchronization.
- **WooCommerce Product Integration:** Live REST API data fetching for product listings, pricing, and cart calculations.

### 🏢 SaaS & Multi-Tenant Management
- **Workspaces & Organizations:** Multi-tenant organization structure with team invitations, role assignments, and granular permissions.
- **Custom Post Type (CPT) Engine:** Build custom data structures with custom fields (Text, Media, Select, Number) and manage entries directly within the dashboard.
- **White-Label Customization:** Custom branding options for agency clients, including custom logos, favicons, and custom domain routing.
- **Subscription & Licensing:** Subscription plan management with credit ledger allocation and license key activation validation.

### 🔐 Security & Access Control
- **Argon2id Hashing:** Password security using Argon2id algorithms.
- **Role-Based Access Control (RBAC):** Strict role guards (`USER`, `ADMIN`, `SUPER_ADMIN`, `PLATFORM_ADMIN`, `SUPPORT_ADMIN`, `DEVELOPER`, `TEAM_MEMBER`).
- **Input Sanitization & Protection:** DOMPurify content sanitization, Zod schema validation, Helmet security headers, rate limiting, and SSRF guards.

---

## Architecture

```mermaid
graph TD
    User([User / Designer]) <-->|HTTPS / Web App| Frontend[ForgeStudio Frontend - React 19 + Vite]
    Frontend <-->|REST API / JSON| Backend[ForgeStudio Backend - Express v5]
    Backend <-->|Prisma ORM| Database[(PostgreSQL Database)]
    Backend <-->|HMAC Signed REST API| WPConnector[forgestudio-connector Plugin]
    WPConnector <-->|Native REST API| WordPress[(Remote WordPress Site)]
    Backend <-->|SFTP / SSH2| RemoteHost[(Remote SFTP Host)]
```

---

## Technology Stack

| Layer | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Core** | React | `^19.2.8` | Declarative UI component engine |
| **Build System** | Vite | `^8.2.0` | Lightning-fast frontend module bundler |
| **Language** | TypeScript | `^5.7.0` | Static typing across monorepo |
| **Styling** | Tailwind CSS | `^4.3.3` | Utility-first CSS styling engine |
| **Code Editor** | Monaco Editor | `^0.56.0` | In-browser code editing capabilities |
| **Backend Core** | Express | `^5.2.1` | REST API HTTP server framework |
| **Database ORM** | Prisma ORM | `^7.10.0` | Type-safe database client and migrations |
| **Database Engine** | PostgreSQL | `pg ^8.23.0` | Relational database storage |
| **Password Security**| Argon2 | `^0.45.1` | Secure password hashing algorithm |
| **Input Validation** | Zod | `^4.4.3` | Schema-based payload validation |
| **WordPress Plugin**| PHP | `>=7.4` | WordPress connector plugin runtime |
| **Image Processing**| Sharp | `^0.35.4` | High-performance WebP image optimization |

---

## Project Structure

```text
forgestudio/
├── frontend/                     # React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/           # Reusable UI components & Error Boundary
│   │   ├── context/              # Auth & Accessibility React contexts
│   │   ├── features/             # Feature modules (Editor, Publishing, Dashboards)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/                # Route components (Auth, Dashboards, Editor, CPTs)
│   │   ├── services/             # API HTTP client integration services
│   │   ├── styles/               # Global CSS & Tailwind configuration
│   │   ├── types/                # TypeScript interfaces & types
│   │   ├── App.tsx               # Main routing & role authorization engine
│   │   └── main.tsx              # Application entry point
│   └── package.json
├── backend/                      # Express v5 + Prisma Backend API
│   ├── prisma/
│   │   └── schema.prisma         # Prisma PostgreSQL database schema
│   ├── src/
│   │   ├── config/               # Environment & database configuration
│   │   ├── controllers/          # API endpoint logic controllers
│   │   ├── middlewares/          # Auth, RBAC, Rate-limit, and Error middlewares
│   │   ├── routes/               # API route definitions
│   │   ├── services/             # WordPress connector, publishing, auth services
│   │   ├── utils/                # Crypto, HMAC, and helper utilities
│   │   ├── app.ts                # Express application bootstrap
│   │   └── server.ts             # HTTP server execution entry point
│   └── package.json
├── wordpress-plugin/             # WordPress Connector Plugin
│   ├── forgestudio-connector/
│   │   ├── forgestudio-connector.php # PHP connector implementation
│   │   └── wordpress-stubs.php   # IDE development stubs
│   └── readme.txt                # WordPress plugin repository metadata
├── docs/                         # Technical Architecture & Plugin Documentation
│   ├── wordpress-connector-plugin.md # Comprehensive WordPress integration guide
│   └── planning/                 # System design & architecture specifications
├── tests/                        # Automated Regression & E2E Test Suite
└── README.md                     # Official Production Documentation
```

---

## Prerequisites

Before deploying or running ForgeStudio locally, ensure your environment meets the following requirements:

- **Node.js:** `v20.x` or `v22.x` LTS
- **npm:** `v10.x` or higher
- **PostgreSQL:** `v15.x` or `v16.x`
- **WordPress:** `v6.0+` with PHP `>=7.4` (For remote site publishing features)
- **Git:** `v2.x`

---

## Environment Setup

Create a `.env` file inside the `backend/` directory based on the following template:

```env
# Backend Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection
DATABASE_URL=postgresql://postgres:postgres_password@localhost:5432/forgestudio?schema=public

# Cryptographic & Session Secrets
JWT_SECRET=your_512_bit_secure_jwt_secret_key_here
SESSION_COOKIE_SECRET=your_secure_session_cookie_secret_key_here
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here
WP_CONNECTOR_SECRET=your_256_bit_hmac_webhook_secret_here

# Mailer Configuration (Optional)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM_EMAIL=noreply@forgestudio.io
```

Create a `.env` file inside the `frontend/` directory if connecting to a custom backend host:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Installation & Running Locally

### 1. Clone Repository & Install Monorepo Dependencies
```bash
git clone https://github.com/your-org/forgestudio.git
cd forgestudio
npm install
```

### 2. Setup & Initialize Database (Prisma)
```bash
cd backend
npm run db:generate
npm run db:push
npm run db:seed
```

### 3. Start Development Servers

**Backend API (`http://localhost:5000`):**
```bash
cd backend
npm run dev
```

**Frontend Builder Application (`http://localhost:5173`):**
```bash
cd frontend
npm run dev
```

---

## WordPress Connector Plugin Setup

1. Copy the `wordpress-plugin/forgestudio-connector` directory into your target WordPress site's `wp-content/plugins/` directory.
2. Log into the WordPress Admin Dashboard, navigate to **Plugins**, and click **Activate** on **ForgeStudio Connector**.
3. Go to **Settings -> ForgeStudio** in WordPress to locate your **API Key** and **Webhook Secret**.
4. In ForgeStudio under **Website Settings -> WordPress Connection**, input your WordPress Site URL and API credentials to establish pairing.

---

## API Architecture Summary

The backend exposes a structured REST API under the `/api` namespace:

| Area | Base Path | Key Capabilities |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | User register, login, logout, OTP verification, OAuth callback |
| **Websites** | `/api/websites` | Website CRUD, page editor data save/fetch, revision snapshots |
| **WordPress** | `/api/websites/:id/wordpress` | WP pairing, live post publishing, media sync, menu sync |
| **Custom Post Types** | `/api/cpts` | CPT schema creation, custom fields, entry CRUD management |
| **Media Library** | `/api/media` | Image upload, WebP optimization, alt text update, deletion |
| **Deployments** | `/api/deployments` | Static ZIP compilation, SFTP sync, deployment history |
| **Teams & Workspaces** | `/api/teams`, `/api/workspaces` | Workspace setup, member invitations, role management |
| **Health** | `/api/health` | System health check, database ping, memory diagnostic |

---

## Automated Testing & Quality Assurance

ForgeStudio includes a regression testing suite executed via `tsx`:

```bash
# Run complete Part B regression test suite
npm run test:part-b

# Run individual test modules
npm run test:api         # API Endpoint Integration Tests
npm run test:db          # PostgreSQL Database Integrity Tests
npm run test:wp          # WordPress REST API E2E Tests
npm run test:security    # Security & RBAC Guard Tests
npm run test:performance # Performance & Latency Tests
npm run test:recovery    # Environment Failover & Recovery Tests
```

---

## Production Deployment Checklist

Before deploying ForgeStudio to a production environment:

1. **Secret Rotation:** Ensure all development default secrets (`JWT_SECRET`, `SESSION_COOKIE_SECRET`, `WP_CONNECTOR_SECRET`) are rotated to 512-bit CSPRNG keys in production environment secrets management.
2. **TLS / HTTPS:** Secure all domain endpoints (`app.forgestudio.io`, `api.forgestudio.io`) behind reverse proxies (Nginx / Caddy) enforcing TLS 1.3 and HSTS headers.
3. **Database Migration:** Use `npx prisma migrate deploy` for zero-downtime production database schema updates.
4. **CORS Configuration:** Restrict `CLIENT_URL` in backend production configuration strictly to your verified frontend domain.
5. **Log Hygiene:** Ensure log outputs run with production log sanitization enabled to prevent secret exposure.

---

## License

This project is proprietary software. All rights reserved. Unauthorized copying, distribution, or usage is strictly prohibited.
