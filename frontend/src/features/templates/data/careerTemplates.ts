import type { Template } from "../types/template.types";

export const CAREER_TEMPLATES: Template[] = [
  // ============================================================================
  // Variant 1: Scuderia High-Performance Engineering Careers
  // ============================================================================
  {
    id: "pro-career-engineering-01",
    userId: "system-pro",
    name: "Scuderia High-Performance Engineering Careers",
    description: "Championship Formula 1 & hypercar engineering careers portal. Features 6 carbon perk cards, trackside Grand Prix travel benefits, and open engineering positions with salary and bonus transparency.",
    type: "PAGE",
    category: "Career",
    isFavorite: true,
    isShared: true,
    isPro: true,
    shareToken: "pro-career-engineering-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // Top Ticker
        {
          id: "eng-car-ticker",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "8px 24px", borderBottom: "1px solid rgba(225, 6, 0, 0.3)" },
          children: [
            { id: "ec-pill", type: "text", content: "● 14 OPEN ENGINEERING VACANCIES // TRACKSIDE & FACTORY", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
            { id: "ec-target", type: "text", content: "CONSTRUCTORS WORLD CHAMPIONSHIP CAMPAIGN 2026", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "700", fontFamily: "monospace" } },
          ],
        },

        // Navbar
        {
          id: "eng-car-nav",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#0D1117", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "16px 28px", borderRadius: "16px", marginTop: "12px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.1)" },
          children: [
            { id: "ec-brand", type: "heading", content: "⚡ SCUDERIA APEX // MOTORSPORT CAREERS", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" } },
            {
              id: "ec-view-roles",
              type: "button",
              content: "EXPLORE OPEN ROLES ↓",
              styles: { backgroundColor: "#E10600", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", padding: "8px 18px", borderRadius: "6px", border: "none", cursor: "pointer" },
            },
          ],
        },

        // Hero Section
        {
          id: "eng-car-hero",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", alignItems: "center", gap: 16 },
          styles: { backgroundColor: "#090C10", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "48px 32px", borderRadius: "24px", marginBottom: "36px", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" },
          children: [
            { id: "ec-hero-pill", type: "text", content: "✦ PUSH THE BOUNDARIES OF HUMAN & MACHINE VELOCITY", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
            { id: "ec-hero-h1", type: "heading", content: "JOIN THE FRONT ROW // ENGINEER WORLD CHAMPIONS", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "40px", fontWeight: "900", lineHeight: "1.15", maxWidth: "800px" } },
            { id: "ec-hero-p", type: "text", content: "Work alongside legendary aerodynamicists and race strategists. We operate at the cutting edge of computational physics, telemetry firmware, and composite engineering.", styles: { color: "#94A3B8", fontSize: "15px", maxWidth: "640px" } },
          ],
        },

        // 6 High-Tech Perks Matrix
        {
          id: "eng-car-perks",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", gap: 18 },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            { id: "perks-title", type: "heading", content: "THE SCUDERIA ADVANTAGE // WORLD-CLASS PRIVILEGES", headingLevel: "h2", styles: { color: "#FFFFFF", fontSize: "24px", fontWeight: "800" } },
            {
              id: "perks-grid",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 16 },
              styles: { width: "100%", boxSizing: "border-box" },
              children: [
                {
                  id: "pk-1",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                  children: [
                    { id: "pk1-h", type: "heading", content: "🌪️ Wind Tunnel & Supercomputing", headingLevel: "h4", styles: { color: "#00F0FF", fontSize: "16px", fontWeight: "800" } },
                    { id: "pk1-p", type: "text", content: "Unrestricted access to 10,000-core CFD cluster and our 60% scale rolling-road wind tunnel facility.", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                {
                  id: "pk-2",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                  children: [
                    { id: "pk2-h", type: "heading", content: "✈️ Trackside GP Travel", headingLevel: "h4", styles: { color: "#FF3D3D", fontSize: "16px", fontWeight: "800" } },
                    { id: "pk2-p", type: "text", content: "All travel, 5-star hotel accommodations, and FIA paddock passes covered for 24 international Grands Prix.", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                {
                  id: "pk-3",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                  children: [
                    { id: "pk3-h", type: "heading", content: "🏆 Championship Bonus Pool", headingLevel: "h4", styles: { color: "#F59E0B", fontSize: "16px", fontWeight: "800" } },
                    { id: "pk3-p", type: "text", content: "Direct financial upside tied to constructor points, podium finishes, and fastest-lap awards.", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                {
                  id: "pk-4",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                  children: [
                    { id: "pk4-h", type: "heading", content: "🎮 Custom Sim-Rig & Hardware", headingLevel: "h4", styles: { color: "#10B981", fontSize: "16px", fontWeight: "800" } },
                    { id: "pk4-p", type: "text", content: "Bespoke home workstation budget ($15,000) including direct-drive sim rigs and multi-monitor setups.", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                {
                  id: "pk-5",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                  children: [
                    { id: "pk5-h", type: "heading", content: "🩺 Athletic & Human Performance", headingLevel: "h4", styles: { color: "#8B5CF6", fontSize: "16px", fontWeight: "800" } },
                    { id: "pk5-p", type: "text", content: "Comprehensive medical care, personal trainers, and high-G mental resilience coaching.", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                {
                  id: "pk-6",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                  children: [
                    { id: "pk6-h", type: "heading", content: "🔬 Material Patents & IP Sharing", headingLevel: "h4", styles: { color: "#EC4899", fontSize: "16px", fontWeight: "800" } },
                    { id: "pk6-p", type: "text", content: "Engineer-attributed patents with commercial royalty sharing on licensed aerospace composites.", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
              ],
            },
          ],
        },

        // Open Roles Board
        {
          id: "eng-roles-section",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", gap: 14 },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            { id: "roles-title", type: "heading", content: "OPEN ENGINEERING POSITIONS", headingLevel: "h2", styles: { color: "#FFFFFF", fontSize: "24px", fontWeight: "800" } },
            // Job Card 1
            {
              id: "job-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
              styles: { backgroundColor: "#111622", padding: "20px 24px", borderRadius: "14px", border: "1px solid rgba(225, 6, 0, 0.3)", boxSizing: "border-box" },
              children: [
                {
                  id: "j1-info",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 4 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "j1-pos", type: "heading", content: "Lead Aerodynamicist - Front Wing & Venturi", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "800" } },
                    { id: "j1-sub", type: "text", content: "Oxfordshire, UK // Full-Time On-Site // Aerodynamics Department", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                { id: "j1-comp", type: "text", content: "£130,000 - £170,000 + BONUS", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "900", fontFamily: "monospace" } },
                {
                  id: "j1-apply",
                  type: "button",
                  content: "APPLY NOW →",
                  styles: { backgroundColor: "#E10600", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
                },
              ],
            },
            // Job Card 2
            {
              id: "job-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
              styles: { backgroundColor: "#111622", padding: "20px 24px", borderRadius: "14px", border: "1px solid rgba(0, 240, 255, 0.3)", boxSizing: "border-box" },
              children: [
                {
                  id: "j2-info",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 4 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "j2-pos", type: "heading", content: "Embedded Telemetry & CAN-Bus Firmware Engineer", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "800" } },
                    { id: "j2-sub", type: "text", content: "Silverstone, UK // Hybrid // Trackside Systems", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                { id: "j2-comp", type: "text", content: "£95,000 - £130,000 + BONUS", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "900", fontFamily: "monospace" } },
                {
                  id: "j2-apply",
                  type: "button",
                  content: "APPLY NOW →",
                  styles: { backgroundColor: "#00F0FF", color: "#090C10", fontSize: "12px", fontWeight: "800", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
                },
              ],
            },
            // Job Card 3
            {
              id: "job-3",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
              styles: { backgroundColor: "#111622", padding: "20px 24px", borderRadius: "14px", border: "1px solid rgba(245, 158, 11, 0.3)", boxSizing: "border-box" },
              children: [
                {
                  id: "j3-info",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 4 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "j3-pos", type: "heading", content: "Race Strategy & Monte Carlo Simulation Scientist", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "800" } },
                    { id: "j3-sub", type: "text", content: "Monaco HQ or Remote // Trackside Travel // Strategy Division", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                { id: "j3-comp", type: "text", content: "€110,000 - €150,000 + BONUS", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "900", fontFamily: "monospace" } },
                {
                  id: "j3-apply",
                  type: "button",
                  content: "APPLY NOW →",
                  styles: { backgroundColor: "#F59E0B", color: "#090C10", fontSize: "12px", fontWeight: "800", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
                },
              ],
            },
          ],
        },

        // Footer
        {
          id: "eng-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "ef-equal", type: "text", content: "APEX CORSE IS AN EQUAL OPPORTUNITY HIGH-PERFORMANCE EMPLOYER.", styles: { color: "#64748B", fontSize: "11px", fontFamily: "monospace" } },
            { id: "ef-inbox", type: "text", content: "DIRECT TALENT INBOX: CAREERS@APEXCORSE.COM", styles: { color: "#E2E8F0", fontSize: "12px", fontWeight: "700", fontFamily: "monospace" } },
          ],
        },
      ],
      pageSettings: {
        title: "High-Performance Engineering Careers | Scuderia Apex",
        description: "Join Scuderia Apex as a lead aerodynamicist, telemetry engineer, or race strategy data scientist.",
        metaKeywords: "formula 1 jobs, aerodynamicist, telemetry engineer, motorsport careers",
        socialImage: "https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },

  // ============================================================================
  // Variant 2: Remote Simulation & Digital Twin Pioneers
  // ============================================================================
  {
    id: "pro-career-simulation-02",
    userId: "system-pro",
    name: "Remote Simulation & Digital Twin Pioneers",
    description: "Virtual racing simulation and digital twin physics engineering careers. Focused on C++ vehicle dynamics, real-time ML tire degradation models, and remote-first motorsport engineering.",
    type: "PAGE",
    category: "Career",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-career-simulation-02",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // Navbar
        {
          id: "sim-nav",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#0D1117", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "16px 28px", borderRadius: "16px", marginBottom: "28px", border: "1px solid rgba(0, 240, 255, 0.2)" },
          children: [
            { id: "sim-brand", type: "heading", content: "◈ APEX DIGITAL TWIN // SIMULATION DIVISION", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" } },
            { id: "sim-badge", type: "text", content: "● 100% ASYNCHRONOUS REMOTE WORLDWIDE", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
          ],
        },

        // Hero
        {
          id: "sim-hero",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", alignItems: "center", gap: 16 },
          styles: { backgroundColor: "#090C10", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "48px 32px", borderRadius: "24px", marginBottom: "36px", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" },
          children: [
            { id: "sim-pill", type: "text", content: "✦ REAL-TIME MATHEMATICAL PHYSICS & RIG TELEMETRY", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
            { id: "sim-h1", type: "heading", content: "BUILD THE DIGITAL TWIN THAT CONQUERS THE WORLD CHAMPIONSHIP", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "38px", fontWeight: "900", lineHeight: "1.15", maxWidth: "800px" } },
            { id: "sim-p", type: "text", content: "Our drivers win Grand Prix races before they ever touch the circuit. Build high-fidelity laser-scanned physics engines and real-time tire thermo-models.", styles: { color: "#94A3B8", fontSize: "15px", maxWidth: "620px" } },
          ],
        },

        // Open Simulation Roles
        {
          id: "sim-roles-list",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", gap: 14 },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            {
              id: "sr-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
              styles: { backgroundColor: "#111622", padding: "20px 24px", borderRadius: "14px", border: "1px solid rgba(0, 240, 255, 0.3)", boxSizing: "border-box" },
              children: [
                {
                  id: "sr1-d",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 4 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "sr1-t", type: "heading", content: "Vehicle Dynamics & Physics Engine Developer (C++)", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "800" } },
                    { id: "sr1-s", type: "text", content: "Remote (Global) // Custom Physics Core // Multi-Body Simulation", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                { id: "sr1-c", type: "text", content: "$140,000 - $180,000 + EQUITY", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "900", fontFamily: "monospace" } },
                {
                  id: "sr1-b",
                  type: "button",
                  content: "APPLY →",
                  styles: { backgroundColor: "#00F0FF", color: "#090C10", fontSize: "12px", fontWeight: "800", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
                },
              ],
            },
            {
              id: "sr-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
              styles: { backgroundColor: "#111622", padding: "20px 24px", borderRadius: "14px", border: "1px solid rgba(139, 92, 246, 0.3)", boxSizing: "border-box" },
              children: [
                {
                  id: "sr2-d",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 4 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "sr2-t", type: "heading", content: "Tire Degradation ML Research Engineer", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "800" } },
                    { id: "sr2-s", type: "text", content: "Remote // PyTorch & Physics-Informed Neural Networks (PINNs)", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                { id: "sr2-c", type: "text", content: "$130,000 - $165,000 + EQUITY", styles: { color: "#8B5CF6", fontSize: "14px", fontWeight: "900", fontFamily: "monospace" } },
                {
                  id: "sr2-b",
                  type: "button",
                  content: "APPLY →",
                  styles: { backgroundColor: "#8B5CF6", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
                },
              ],
            },
          ],
        },

        // Footer
        {
          id: "sim-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "sf-copy", type: "text", content: "© 2026 APEX SIMULATION LABS. ALL CODE BASES FULLY REPLICATED IN GIT.", styles: { color: "#64748B", fontSize: "12px", fontFamily: "monospace" } },
            { id: "sf-ping", type: "text", content: "GLOBAL DISTRIBUTED SIMULATION NODES ACTIVE", styles: { color: "#10B981", fontSize: "12px", fontWeight: "700", fontFamily: "monospace" } },
          ],
        },
      ],
      pageSettings: {
        title: "Simulation & Digital Twin Careers | Apex Corse",
        description: "Develop vehicle physics engines and machine learning tire models for Formula 1 digital twins.",
        metaKeywords: "simulation jobs, digital twin, physics engine, c++ motorsport, remote engineering",
        socialImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },

  // ============================================================================
  // Variant 3: Creative Media & Trackside Cinematography Studio
  // ============================================================================
  {
    id: "pro-career-media-03",
    userId: "system-pro",
    name: "Trackside Cinematography & Creative Media Studio",
    description: "Creative media, documentary filmmaking, and 3D broadcast motion design careers at 350 km/h. High-energy paddock content creation roles with global Grand Prix circuit travel.",
    type: "PAGE",
    category: "Career",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-career-media-03",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // Navbar
        {
          id: "med-nav",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#0D1117", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "16px 28px", borderRadius: "16px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.1)" },
          children: [
            { id: "med-brand", type: "heading", content: "🎬 APEX CREATIVE MEDIA // TRACKSIDE LAB", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" } },
            { id: "med-badge", type: "text", content: "● RECRUITING 2026 BROADCAST CREW", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
          ],
        },

        // Hero
        {
          id: "med-hero",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", alignItems: "center", gap: 16 },
          styles: { backgroundColor: "#090C10", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "48px 32px", borderRadius: "24px", marginBottom: "36px", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" },
          children: [
            { id: "med-pill", type: "text", content: "✦ RED DIGITAL CINEMA & BROADCAST GRAPHICS", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
            { id: "med-h1", type: "heading", content: "CAPTURE 350 KM/H DRAMA // DEFINE MOTORSPORT CULTURE", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "38px", fontWeight: "900", lineHeight: "1.15", maxWidth: "800px" } },
            { id: "med-p", type: "text", content: "Travel with the team across 24 countries with full access to pit lane, driver telemetry headsets, and Arri cinema rigs.", styles: { color: "#94A3B8", fontSize: "15px", maxWidth: "600px" } },
          ],
        },

        // Open Creative Roles
        {
          id: "med-roles-list",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", gap: 14 },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            {
              id: "mr-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
              styles: { backgroundColor: "#111622", padding: "20px 24px", borderRadius: "14px", border: "1px solid rgba(225, 6, 0, 0.3)", boxSizing: "border-box" },
              children: [
                {
                  id: "mr1-d",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 4 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "mr1-t", type: "heading", content: "Principal Trackside Cinematographer & Director", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "800" } },
                    { id: "mr1-s", type: "text", content: "Global Grand Prix Travel // RED V-Raptor & High-Speed Rigging", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                { id: "mr1-c", type: "text", content: "£85,000 - £115,000 + TRAVEL", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "900", fontFamily: "monospace" } },
                {
                  id: "mr1-b",
                  type: "button",
                  content: "SUBMIT SHOWREEL →",
                  styles: { backgroundColor: "#E10600", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
                },
              ],
            },
            {
              id: "mr-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
              styles: { backgroundColor: "#111622", padding: "20px 24px", borderRadius: "14px", border: "1px solid rgba(245, 158, 11, 0.3)", boxSizing: "border-box" },
              children: [
                {
                  id: "mr2-d",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 4 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "mr2-t", type: "heading", content: "3D Motion & Real-time Broadcast Graphics Artist", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "800" } },
                    { id: "mr2-s", type: "text", content: "London / Remote // Cinema 4D, Unreal Engine 5, Octane", styles: { color: "#94A3B8", fontSize: "13px" } },
                  ],
                },
                { id: "mr2-c", type: "text", content: "£75,000 - £100,000", styles: { color: "#F59E0B", fontSize: "14px", fontWeight: "900", fontFamily: "monospace" } },
                {
                  id: "mr2-b",
                  type: "button",
                  content: "APPLY NOW →",
                  styles: { backgroundColor: "#F59E0B", color: "#090C10", fontSize: "12px", fontWeight: "800", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
                },
              ],
            },
          ],
        },

        // Footer
        {
          id: "med-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "mf-reel", type: "text", content: "SHOWREEL SUBMISSIONS: SHOWREEL@APEXCORSE.COM", styles: { color: "#64748B", fontSize: "12px", fontFamily: "monospace" } },
            { id: "mf-copy", type: "text", content: "© 2026 APEX CREATIVE MEDIA S.A.", styles: { color: "#94A3B8", fontSize: "12px" } },
          ],
        },
      ],
      pageSettings: {
        title: "Trackside Cinematography & Creative Media Careers | Apex Corse",
        description: "Join the trackside media team at Apex Corse covering 24 Formula 1 Grands Prix in 4K cinema.",
        metaKeywords: "cinematographer, motorsport media, broadcast graphics, 3d motion design",
        socialImage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },
];
