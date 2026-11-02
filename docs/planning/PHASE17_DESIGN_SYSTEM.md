# ForgeStudio Phase 17: Global Design System & Styling Parity Specification

## 1. Executive Summary

Phase 17 elevates ForgeStudio's styling architecture from ad-hoc inline styles and ephemeral local storage variables to an enterprise-grade, website-scoped design system with complete parity across Editor Canvas, Published Runtime, and Static Export.

### Key Capabilities Delivered:
1. **Authoritative Website-Scoped Persistence:** Centralized design variables and global classes stored within PostgreSQL under website `editorData.globalVariables` and `editorData.globalClasses`, isolated per website and protected by RBAC.
2. **Safe LocalStorage Migration:** Transparent on-demand migration of legacy `forgestudio_atomic_variables` and `forgestudio_global_classes` into website-scoped storage without data loss.
3. **CSS Security & Injection Defense:**
   - Strict CSS variable name token sanitization (`--[a-z0-9_-]+`) with trailing hyphen and duplicate delimiter stripping.
   - Global class name validation preventing class hijacking or CSS escape sequences.
   - Comprehensive CSS value sanitization stripping breakout characters (`;`, `{`, `}`) and blocking dangerous execution vectors (`expression()`, `javascript:`, `vbscript:`, `data:` URI scripts).
   - Immune prototype pollution defense (`Object.create(null)` dictionaries stripping `__proto__`, `constructor`, `prototype`).
4. **Circular Variable Reference Detection:** Tarjan/DFS cycle detection identifying circular variable chains (`var(--a)` -> `var(--b)` -> `var(--a)`) and breaking them automatically with safe `inherit` fallbacks to prevent browser hanging.
5. **Dynamic Theme Modes & Breakpoints:** First-class light and dark mode token mappings emitted into `:root` and `[data-theme="dark"], .dark` blocks with automatic `prefers-color-scheme` support.
6. **Optimistic Concurrency Control (CAS):** Multi-tab and multi-user save conflict protection via `expectedVersion` checking on design system updates returning `409 STALE_VERSION_CONFLICT` upon race conditions.
7. **Portable JSON Export / Import:** Standardized Version 2 JSON format with configurable conflict resolution (`merge`, `skip`, `replace`).
8. **Tri-Renderer Styling Parity:** Identical computed styles and token resolution across Editor Canvas, Published Runtime, and Static Export (`styles.css` compilation).
9. **Automated Verification:** 100% pass rate across 24 tests in `backend/tests/phase17-design-system.test.ts`, including real Chromium Playwright E2E browser verification.

---

## 2. Architecture & Data Model

### 2.1 Backend Token & Class Entities (`designToken.service.ts`)
```typescript
export interface DesignVariable {
  id: string;
  name: string;
  category: "color" | "typography" | "font" | "spacing" | "shadow" | "radius" | "dimension" | "number" | "custom";
  token: string; // e.g. "--fs-color-primary"
  value: string; // e.g. "#4f46e5"
  description?: string;
  defaultMode?: "light" | "dark";
  modes?: Record<string, string>; // e.g. { light: '#ffffff', dark: '#0f172a' }
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalClass {
  id: string;
  name: string; // e.g. "Action Button"
  className: string; // e.g. "fs-btn-action"
  description?: string;
  styles: Record<string, string | number>;
  pseudoStyles?: {
    hover?: Record<string, string | number>;
    focus?: Record<string, string | number>;
    active?: Record<string, string | number>;
  };
  createdAt?: string;
  updatedAt?: string;
}
```

### 2.2 API Endpoints (`designToken.routes.ts`)
| Method | Endpoint | Capability Required | Description |
|---|---|---|---|
| `GET` | `/api/websites/:websiteId/design-system` | `VIEW` | Fetch variables, classes, and compiled CSS |
| `PUT` | `/api/websites/:websiteId/design-system` | `EDIT_DESIGN` | Atomic update with CAS expectedVersion |
| `GET`/`POST` | `/api/websites/:websiteId/design-system/export` | `VIEW` | Download portable Version 2 JSON file |
| `POST` | `/api/websites/:websiteId/design-system/import` | `EDIT_DESIGN` | Import JSON with merge/skip/replace mode |

---

## 3. Security & Anti-Injection Architecture

### 3.1 CSS Sanitization Pipeline
```mermaid
graph TD
    Input[Raw User CSS Input] --> SanitizeUrl[Sanitize url: Block javascript:, vbscript:, SVG data scripts]
    SanitizeUrl --> CheckDangerous[Block Dangerous Patterns: expression, behavior, moz-binding, import]
    CheckDangerous --> StripBreakout[Strip Breakout Characters: ;, {, }, <, >]
    StripBreakout --> ProtoDefense[Object.create null: Reject __proto__, constructor, prototype]
    ProtoDefense --> CycleDetect[Tarjan DFS Cycle Detection: Fallback to inherit]
    CycleDetect --> CleanCSS[Safe Compiled CSS Output]
```

---

## 4. Test Verification Matrix

All 24 automated tests in `backend/tests/phase17-design-system.test.ts` passed cleanly:

| Group | Category | Assertions | Result |
|---|---|---|---|
| **Gate 1** | Database Safety Gate | Dedicated disposable database validation (`forgestudio_disposable_fresh`) | **PASS** |
| **Group 1** | CSS Sanitization & Anti-Injection | Token name normalization, class validation, breakout removal, dangerous protocol blocking, prototype pollution defense | **PASS** |
| **Group 2** | Circular Variable Reference | Tarjan cycle detection, fallback to `inherit`, safe token preservation | **PASS** |
| **Group 3** | CSS Compilation Engine | `:root` emissions, dark mode override blocks, OS media queries, pseudo styles (`:hover`, `:active`) | **PASS** |
| **Group 4** | RBAC & Authorization | Owner read/write, Designer edit capability, Viewer 403 mutation block, Foreign tenant 403 isolation, Explicit DENY override | **PASS** |
| **Group 5** | CAS Optimistic Locking | Version increment verification, stale version update rejection (409 Conflict) | **PASS** |
| **Group 6** | Export & Import Conflict Modes | Version 2 portable export, `merge` mode conflict replacement, `skip` mode preservation | **PASS** |
| **Group 7** | Tri-Renderer Static Parity | Static export compilation of `styles.css` and `index.html` with canonical tokens and class bindings | **PASS** |
| **Group 8** | Playwright Chromium E2E | Real Chromium engine computes button background from `var(--fs-color-primary)` (`rgb(99, 102, 241)`) and verifies theme switching | **PASS** |

**Total Phase 17 Tests: 24 PASSED, 0 FAILED**
