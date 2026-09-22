# Deliverable 16: Feature Dependency Graph
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Scope:** Architectural Dependency Hierarchy Across All Implementation Phases  

---

## 1. High-Level Workstream Dependency Model

```mermaid
graph TD
    P0["Phase 0: Branch Safety, Baselines & Discovery"]
    P1["Phase 1: System Stabilization & Dead Code Pruning"]
    P2["Phase 2: SaaS Platform & Real Admin Dashboards"]
    P3["Phase 3: Unified 7+7 RBAC & Tenant Isolation"]
    P4["Phase 4: Multi-Page Lifecycle & Durable Revisions"]
    P5["Phase 5: Canonical Schema & Editor Parity"]
    P6["Phase 6: Widget Parity across Canvas, Public & Static Compiler"]
    P7["Phase 7: Dynamic Content & CPT Loop Resolver"]
    P8["Phase 8: Forms, Leads & Webhook Automation"]
    P9["Phase 9: Real Media Library & Image Optimization"]
    P10["Phase 10: Real WordPress Connector Plugin & REST Publishing"]
    P11["Phase 11: Multi-Destination Deployments (SFTP, Static, WP)"]
    P12["Phase 12: Agency Collaboration, Approvals & Workspaces"]
    P13["Phase 13: Developer Platform & Scoped API v1"]
    P14["Phase 14: Durable Job Queue & Operations Dashboard"]
    P15["Phase 15: Security Hardening, Anti-SSRF & Performance"]
    P16["Phase 16: Production Verification & Regression Testing"]

    P0 --> P1
    P1 --> P2
    P1 --> P3
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P6 --> P8
    P5 --> P9
    P6 --> P10
    P9 --> P10
    P10 --> P11
    P4 --> P11
    P3 --> P12
    P11 --> P12
    P5 --> P13
    P11 --> P14
    P14 --> P15
    P12 --> P15
    P15 --> P16
```

---

## 2. Critical Dependency Invariants

1. **Schema Precedes Editor:** The `CanonicalWebsiteData` TypeScript definitions and PostgreSQL JSONB validators must be finalized before adding new widget attributes to the editor canvas.
2. **Real WordPress Plugin Precedes WordPress Publishing:** In accordance with Rule #6, we cannot test or claim WordPress publishing works without the real `forgestudio-connector` PHP plugin deployed and responding to REST calls.
3. **Widget Renderer Parity:** Any widget that renders in `renderers.tsx` for the visual canvas MUST have equivalent render branches in `PublishedSite.tsx` and `staticCompiler.ts`.
4. **Server-Side RBAC Precedes Collaboration UI:** Role inheritance and capability overrides must be strictly validated on the backend before building agency team management frontends.
