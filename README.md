# ForgeStudio

Visual website builder and publishing platform built with React, TypeScript, Node.js, Express, Prisma, and PostgreSQL.

## Architecture
- **Frontend**: Vite, React 19, TypeScript, Tailwind CSS, Monaco Editor
- **Backend**: Node.js (ESM), Express 5, TypeScript, Prisma ORM, PostgreSQL
- **WordPress Integration**: Headless sync & publishing bridge

## Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- PostgreSQL >= 15.x

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm ci
cp .env.example .env # Configure DATABASE_URL and session secrets
npm run db:generate  # Generate Prisma client
npm run db:validate  # Validate schema
npm run build        # Build TypeScript bundle
npm run dev          # Start development server
```

### 2. Frontend Setup
```bash
cd frontend
npm ci
npm run dev          # Start Vite development server
npm run build        # Production build
npm run lint         # Run ESLint
```
