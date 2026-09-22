import type { Template } from "../types/template.types";

export const ABOUT_TEMPLATES: Template[] = [
  // ============================================================================
  // Variant 1: Formula Engineering & Wind-Tunnel Heritage
  // ============================================================================
  {
    id: "pro-about-heritage-01",
    userId: "system-pro",
    name: "Formula Engineering & Wind-Tunnel Heritage",
    description: "Deep aerodynamic heritage and wind-tunnel research About page. High-voltage Formula 1 aesthetic featuring CFD computational milestones, 4-stat telemetry counter strip, aerodynamic breakthrough cards, and engineering laboratory footer.",
    type: "PAGE",
    category: "About",
    isFavorite: true,
    isShared: true,
    isPro: true,
    shareToken: "pro-about-heritage-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // 1. Aero Facility Status Bar
        {
          id: "aero-status-bar",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: {
            layoutType: "flex",
            direction: "row",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          },
          styles: {
            backgroundColor: "#06090E",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "8px 24px",
            borderBottom: "1px solid rgba(225, 6, 0, 0.3)",
          },
          children: [
            { id: "aero-stat-pill", type: "text", content: "● WIND TUNNEL TUNNEL 02 ACTIVE // 60% SCALE TEST", styles: { backgroundColor: "rgba(225, 6, 0, 0.15)", color: "#FF3D3D", fontSize: "11px", fontWeight: "800", padding: "2px 10px", borderRadius: "9999px", border: "1px solid rgba(225, 6, 0, 0.4)", fontFamily: "monospace" } },
            { id: "aero-stat-air", type: "text", content: "AIR VELOCITY: 180 KM/H | YAW ANGLE: 4.2° | CFD RESOLUTION: 1.2B CELLS", styles: { color: "#94A3B8", fontSize: "11px", fontFamily: "monospace" } },
          ],
        },

        // 2. Glass Navbar
        {
          id: "aero-nav-bar",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: {
            layoutType: "flex",
            direction: "row",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          },
          styles: {
            backgroundColor: "rgba(13, 17, 23, 0.9)",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "16px 28px",
            borderRadius: "16px",
            marginTop: "12px",
            marginBottom: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
          children: [
            { id: "aero-brand", type: "heading", content: "⚡ APEX // AERO DYNAMICS", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "900", letterSpacing: "1.5px" } },
            {
              id: "aero-nav-links",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "row", gap: 20 },
              styles: { boxSizing: "border-box" },
              children: [
                { id: "an-1", type: "text", content: "HERITAGE", styles: { color: "#FFFFFF", fontSize: "13px", fontWeight: "700" } },
                { id: "an-2", type: "text", content: "WIND TUNNEL", styles: { color: "#94A3B8", fontSize: "13px", fontWeight: "600" } },
                { id: "an-3", type: "text", content: "COMPOSITES", styles: { color: "#94A3B8", fontSize: "13px", fontWeight: "600" } },
                { id: "an-4", type: "text", content: "PATENTS", styles: { color: "#94A3B8", fontSize: "13px", fontWeight: "600" } },
              ],
            },
            {
              id: "aero-spec-btn",
              type: "button",
              content: "AERO SPEC SHEET ⤢",
              styles: {
                backgroundColor: "#E10600",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: "800",
                padding: "8px 18px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
              },
            },
          ],
        },

        // 3. Heritage Hero Section
        {
          id: "aero-hero-section",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: {
            layoutType: "flex",
            direction: "row",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 32,
          },
          styles: {
            backgroundColor: "#090C10",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "44px 36px",
            borderRadius: "24px",
            marginBottom: "36px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          },
          children: [
            {
              id: "aero-hero-text",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 16 },
              styles: { width: "100%", maxWidth: "560px", boxSizing: "border-box" },
              children: [
                { id: "aero-pill", type: "text", content: "✦ THREE DECADES OF MOTORSPORT SUPREMACY", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
                { id: "aero-h1", type: "heading", content: "BORN IN THE WIND TUNNEL. HONED AT 350 KM/H.", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "40px", fontWeight: "900", lineHeight: "1.15", letterSpacing: "-0.5px" } },
                { id: "aero-p", type: "text", content: "Founded in 1994, Apex Corse has pioneered computational aero-elasticity, ground-effect vortex management, and autoclave titanium curing. Our vehicles do not fight the wind; they harness it to achieve surgical downforce.", styles: { color: "#94A3B8", fontSize: "15px", lineHeight: "1.6" } },
              ],
            },
            {
              id: "aero-hero-img-wrap",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column" },
              styles: { width: "100%", maxWidth: "480px", boxSizing: "border-box" },
              children: [
                {
                  id: "aero-img",
                  type: "image",
                  content: "",
                  src: "https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80",
                  alt: "Formula 1 Wind Tunnel Testing Smoke Trace Stream",
                  classes: [],
                  styles: { width: "100%", borderRadius: "16px", objectFit: "cover", border: "1px solid rgba(255, 255, 255, 0.15)" },
                },
              ],
            },
          ],
        },

        // 4. Milestone Telemetry Counters (4-Column Strip)
        {
          id: "aero-counters-row",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: {
            layoutType: "flex",
            direction: "row",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          },
          styles: {
            backgroundColor: "#0D1117",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "28px 32px",
            borderRadius: "20px",
            marginBottom: "36px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          },
          children: [
            {
              id: "cnt-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 4 },
              styles: { width: "22%", minWidth: "180px", boxSizing: "border-box" },
              children: [
                { id: "c1-val", type: "text", content: "1,450+", styles: { color: "#00F0FF", fontSize: "32px", fontWeight: "900", fontFamily: "monospace" } },
                { id: "c1-lbl", type: "text", content: "WIND TUNNEL HOURS", styles: { color: "#94A3B8", fontSize: "11px", fontWeight: "700", letterSpacing: "1px" } },
              ],
            },
            {
              id: "cnt-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 4 },
              styles: { width: "22%", minWidth: "180px", boxSizing: "border-box" },
              children: [
                { id: "c2-val", type: "text", content: "94.2%", styles: { color: "#FF3D3D", fontSize: "32px", fontWeight: "900", fontFamily: "monospace" } },
                { id: "c2-lbl", type: "text", content: "CARBON COMPOSITE RATIO", styles: { color: "#94A3B8", fontSize: "11px", fontWeight: "700", letterSpacing: "1px" } },
              ],
            },
            {
              id: "cnt-3",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 4 },
              styles: { width: "22%", minWidth: "180px", boxSizing: "border-box" },
              children: [
                { id: "c3-val", type: "text", content: "28", styles: { color: "#F59E0B", fontSize: "32px", fontWeight: "900", fontFamily: "monospace" } },
                { id: "c3-lbl", type: "text", content: "GRAND PRIX VICTORIES", styles: { color: "#94A3B8", fontSize: "11px", fontWeight: "700", letterSpacing: "1px" } },
              ],
            },
            {
              id: "cnt-4",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 4 },
              styles: { width: "22%", minWidth: "180px", boxSizing: "border-box" },
              children: [
                { id: "c4-val", type: "text", content: "0.002s", styles: { color: "#10B981", fontSize: "32px", fontWeight: "900", fontFamily: "monospace" } },
                { id: "c4-lbl", type: "text", content: "DRS ACTUATION SPEED", styles: { color: "#94A3B8", fontSize: "11px", fontWeight: "700", letterSpacing: "1px" } },
              ],
            },
          ],
        },

        // 5. Aerodynamic Breakthroughs (3-Column Matrix)
        {
          id: "aero-breakthroughs-row",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: {
            layoutType: "flex",
            direction: "row",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            {
              id: "bt-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(225, 6, 0, 0.3)" },
              children: [
                { id: "bt1-tag", type: "text", content: "PATENTED CFD AERO", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "bt1-title", type: "heading", content: "Venturi Vortex Sealing", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "19px", fontWeight: "800" } },
                { id: "bt1-desc", type: "text", content: "Generates high-speed edge vortices along floor skirts to hermetically seal the low-pressure suction underbody from turbulent ambient air.", styles: { color: "#94A3B8", fontSize: "13px", lineHeight: "1.5" } },
              ],
            },
            {
              id: "bt-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(0, 240, 255, 0.3)" },
              children: [
                { id: "bt2-tag", type: "text", content: "CARBON LAYUP TECH", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "bt2-title", type: "heading", content: "Aero-Elastic Wing Flexing", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "19px", fontWeight: "800" } },
                { id: "bt2-desc", type: "text", content: "Precision carbon directional weave allows the front mainplane to flex precisely 12mm under 300+ km/h air loads, shedding straight-line drag.", styles: { color: "#94A3B8", fontSize: "13px", lineHeight: "1.5" } },
              ],
            },
            {
              id: "bt-3",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(245, 158, 11, 0.3)" },
              children: [
                { id: "bt3-tag", type: "text", content: "THERMAL INTEGRATION", styles: { color: "#F59E0B", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "bt3-title", type: "heading", content: "MGU-K Hybrid Ducting", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "19px", fontWeight: "800" } },
                { id: "bt3-desc", type: "text", content: "Internal thermodynamic channels extract radiator heat through the rear beam wing, energizing the rear diffuser wake for additional grip.", styles: { color: "#94A3B8", fontSize: "13px", lineHeight: "1.5" } },
              ],
            },
          ],
        },

        // 6. Aero Lab Footer
        {
          id: "aero-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "af-loc", type: "text", content: "SILVERSTONE TECHNOLOGY CAMPUS // NORTHAMPTONSHIRE NN12 8TN, UK", styles: { color: "#64748B", fontSize: "12px", fontFamily: "monospace" } },
            { id: "af-homologation", type: "text", content: "FIA HOMOLOGATION REGISTRATION: #FIA-2026-F1-APX", styles: { color: "#E2E8F0", fontSize: "12px", fontWeight: "700", fontFamily: "monospace" } },
          ],
        },
      ],
      pageSettings: {
        title: "Aerodynamics & Wind-Tunnel Heritage | Apex Corse",
        description: "Explore 30 years of Formula 1 aerodynamic engineering, wind-tunnel research, and ground-effect composite innovation.",
        metaKeywords: "aerodynamics, wind tunnel, formula 1, carbon composite, cfd simulation",
        socialImage: "https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },

  // ============================================================================
  // Variant 2: The Paddock & Chief Engineers
  // ============================================================================
  {
    id: "pro-about-paddock-02",
    userId: "system-pro",
    name: "The Paddock & Chief Engineers",
    description: "Technical leadership and trackside personnel About page. Showcases Chief Technical Officer, Head of Race Strategy, and Principal Telemetry Engineer profile cards with career telemetry milestones.",
    type: "PAGE",
    category: "About",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-about-paddock-02",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // Navbar
        {
          id: "paddock-navbar",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#0D1117", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "16px 28px", borderRadius: "16px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.1)" },
          children: [
            { id: "pad-brand", type: "heading", content: "⚡ SCUDERIA APEX // PIT WALL LEADERSHIP", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" } },
            { id: "pad-status", type: "text", content: "● PADDOCK PERSONNEL // PIT LANE LEVEL 01 ACTIVE", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "700", fontFamily: "monospace" } },
            {
              id: "pad-contact-btn",
              type: "button",
              content: "CONTACT PIT WALL →",
              styles: { backgroundColor: "#E10600", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", padding: "8px 18px", borderRadius: "6px", border: "none", cursor: "pointer" },
            },
          ],
        },

        // Hero
        {
          id: "paddock-hero",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", alignItems: "center", gap: 16 },
          styles: { backgroundColor: "#090C10", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "48px 32px", borderRadius: "24px", marginBottom: "36px", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" },
          children: [
            { id: "pad-hero-pill", type: "text", content: "✦ HUMAN TELEMETRY & STRATEGIC INTELLECT", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
            { id: "pad-hero-h1", type: "heading", content: "THE MASTERMINDS BEHIND EVERY POLE POSITION", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "40px", fontWeight: "900", lineHeight: "1.15", maxWidth: "800px" } },
            { id: "pad-hero-p", type: "text", content: "In a sport where championships are decided by thousandths of a second, meet the aerodynamicists, strategy analysts, and trackside engineers orchestrating victory.", styles: { color: "#94A3B8", fontSize: "15px", maxWidth: "640px" } },
          ],
        },

        // 3 Chief Engineers Roster Cards
        {
          id: "paddock-engineers-grid",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 20 },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            // Engineer 1
            {
              id: "eng-card-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 14 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "18px", border: "1px solid rgba(225, 6, 0, 0.4)" },
              children: [
                {
                  id: "eng1-img",
                  type: "image",
                  content: "",
                  src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
                  alt: "Dr. Marcus Vance Chief Technical Officer",
                  styles: { width: "100%", height: "240px", borderRadius: "12px", objectFit: "cover" },
                },
                { id: "eng1-role", type: "text", content: "CHIEF TECHNICAL OFFICER", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "eng1-name", type: "heading", content: "Dr. Marcus Vance", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "22px", fontWeight: "800" } },
                { id: "eng1-bio", type: "text", content: "Cambridge PhD in Computational Aerodynamics. Former Scuderia aerodynamics lead with 18 Grand Prix victories and 3 World Championships.", styles: { color: "#94A3B8", fontSize: "13px", lineHeight: "1.5" } },
                { id: "eng1-stat", type: "text", content: "18 GP WINS // 34 POLES", styles: { color: "#00F0FF", fontSize: "12px", fontWeight: "800", fontFamily: "monospace" } },
              ],
            },
            // Engineer 2
            {
              id: "eng-card-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 14 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "18px", border: "1px solid rgba(0, 240, 255, 0.4)" },
              children: [
                {
                  id: "eng2-img",
                  type: "image",
                  content: "",
                  src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
                  alt: "Elena Rostova Head of Race Strategy",
                  styles: { width: "100%", height: "240px", borderRadius: "12px", objectFit: "cover" },
                },
                { id: "eng2-role", type: "text", content: "HEAD OF RACE STRATEGY & SIM", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "eng2-name", type: "heading", content: "Elena Rostova", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "22px", fontWeight: "800" } },
                { id: "eng2-bio", type: "text", content: "Oxford Applied Mathematics graduate. Spearheads real-time Monte Carlo race simulations and dynamic undercut telemetry models.", styles: { color: "#94A3B8", fontSize: "13px", lineHeight: "1.5" } },
                { id: "eng2-stat", type: "text", content: "99.4% STRATEGY ACCURACY", styles: { color: "#10B981", fontSize: "12px", fontWeight: "800", fontFamily: "monospace" } },
              ],
            },
            // Engineer 3
            {
              id: "eng-card-3",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 14 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "18px", border: "1px solid rgba(245, 158, 11, 0.4)" },
              children: [
                {
                  id: "eng3-img",
                  type: "image",
                  content: "",
                  src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
                  alt: "Kenji Takahashi Principal Systems Engineer",
                  styles: { width: "100%", height: "240px", borderRadius: "12px", objectFit: "cover" },
                },
                { id: "eng3-role", type: "text", content: "PRINCIPAL SYSTEMS & TELEMETRY", styles: { color: "#F59E0B", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "eng3-name", type: "heading", content: "Kenji Takahashi", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "22px", fontWeight: "800" } },
                { id: "eng3-bio", type: "text", content: "14 years managing powertrain ECU telemetry and high-voltage kinetic recovery deployment across 280+ race weekends.", styles: { color: "#94A3B8", fontSize: "13px", lineHeight: "1.5" } },
                { id: "eng3-stat", type: "text", content: "280+ RACES // ZERO ECU FAULTS", styles: { color: "#F59E0B", fontSize: "12px", fontWeight: "800", fontFamily: "monospace" } },
              ],
            },
          ],
        },

        // Footer
        {
          id: "paddock-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "pad-copy", type: "text", content: "© 2026 SCUDERIA APEX MOTORSPORT. MARANELLO // SILVERSTONE // MONACO.", styles: { color: "#64748B", fontSize: "12px" } },
            { id: "pad-radio", type: "text", content: "PIT WALL RADIO FREQUENCY: 462.550 MHZ ENCRYPTED", styles: { color: "#FF3D3D", fontSize: "12px", fontFamily: "monospace" } },
          ],
        },
      ],
      pageSettings: {
        title: "The Paddock & Chief Engineers | Apex Motorsport",
        description: "Meet the world-class aerodynamicists, race strategists, and powertrain engineers behind Scuderia Apex.",
        metaKeywords: "race engineers, chief technical officer, aerodynamics, race strategy, pit wall",
        socialImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
      },
    },
  },

  // ============================================================================
  // Variant 3: Interactive Track Record & Global Grand Prix Circuit
  // ============================================================================
  {
    id: "pro-about-circuit-03",
    userId: "system-pro",
    name: "Track Record & Global Circuit Heritage",
    description: "Interactive Grand Prix circuit heritage and victory record template. Features Monaco, Silverstone, and Suzuka track cards with circuit telemetry, sector times, and historical championship timeline.",
    type: "PAGE",
    category: "About",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-about-circuit-03",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // Top Ticker
        {
          id: "circuit-ticker",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "8px 24px", borderBottom: "1px solid rgba(225, 6, 0, 0.3)" },
          children: [
            { id: "c-tick-pill", type: "text", content: "● FIA WORLD CHAMPIONSHIP // 24 CIRCUITS", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
            { id: "c-tick-record", type: "text", content: "CURRENT CONSTRUCTORS STANDINGS: P1 // 542 POINTS", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "700", fontFamily: "monospace" } },
          ],
        },

        // Navbar
        {
          id: "circuit-navbar",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#0D1117", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "16px 28px", borderRadius: "16px", marginTop: "12px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.1)" },
          children: [
            { id: "circ-brand", type: "heading", content: "🏁 APEX // GLOBAL GRAND PRIX CIRCUITS", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" } },
            {
              id: "circ-cta",
              type: "button",
              content: "EXPLORE 2026 CALENDAR →",
              styles: { backgroundColor: "#E10600", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", padding: "8px 18px", borderRadius: "6px", border: "none", cursor: "pointer" },
            },
          ],
        },

        // Hero
        {
          id: "circuit-hero",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", alignItems: "center", gap: 16 },
          styles: { backgroundColor: "#090C10", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "48px 32px", borderRadius: "24px", marginBottom: "36px", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" },
          children: [
            { id: "circ-pill", type: "text", content: "✦ GLOBAL MOTORSPORT ODYSSEY", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
            { id: "circ-h1", type: "heading", content: "VICTORIES ETCHED ACROSS 24 LEGENDARY CIRCUITS", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "40px", fontWeight: "900", lineHeight: "1.15", maxWidth: "800px" } },
            { id: "circ-p", type: "text", content: "From the unforgiving guardrails of Monte Carlo to the high-G sweepers of Silverstone and Suzuka, explore the battlegrounds where Apex machines conquered the podium.", styles: { color: "#94A3B8", fontSize: "15px", maxWidth: "640px" } },
          ],
        },

        // 3 Circuit Cards
        {
          id: "circuit-cards-row",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 20 },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            // Circuit 1: Monaco
            {
              id: "circ-card-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 12 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "18px", border: "1px solid rgba(225, 6, 0, 0.3)" },
              children: [
                {
                  id: "c1-img",
                  type: "image",
                  content: "",
                  src: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80",
                  alt: "Circuit de Monaco Harbor and Street Track",
                  styles: { width: "100%", height: "180px", borderRadius: "12px", objectFit: "cover" },
                },
                { id: "c1-tag", type: "text", content: "ROUND 08 // MONACO", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "c1-name", type: "heading", content: "Circuit de Monaco", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "20px", fontWeight: "800" } },
                { id: "c1-stats", type: "text", content: "3.337 KM | 19 TURNS | POLE: 1:10.810", styles: { color: "#00F0FF", fontSize: "12px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "c1-desc", type: "text", content: "The ultimate test of mechanical grip and driver precision between the yachts of Port Hercules and the Casino square.", styles: { color: "#94A3B8", fontSize: "13px" } },
              ],
            },
            // Circuit 2: Silverstone
            {
              id: "circ-card-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 12 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "18px", border: "1px solid rgba(0, 240, 255, 0.3)" },
              children: [
                {
                  id: "c2-img",
                  type: "image",
                  content: "",
                  src: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80",
                  alt: "Silverstone High-Speed Asphalt Sweepers",
                  styles: { width: "100%", height: "180px", borderRadius: "12px", objectFit: "cover" },
                },
                { id: "c2-tag", type: "text", content: "ROUND 12 // GREAT BRITAIN", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "c2-name", type: "heading", content: "Silverstone Circuit", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "20px", fontWeight: "800" } },
                { id: "c2-stats", type: "text", content: "5.891 KM | 18 TURNS | 290 KM/H CORNERING", styles: { color: "#10B981", fontSize: "12px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "c2-desc", type: "text", content: "The temple of high-speed downforce. Maggotts, Becketts, and Chapel subject the chassis to sustained 5.2G lateral forces.", styles: { color: "#94A3B8", fontSize: "13px" } },
              ],
            },
            // Circuit 3: Suzuka
            {
              id: "circ-card-3",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 12 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "20px", borderRadius: "18px", border: "1px solid rgba(245, 158, 11, 0.3)" },
              children: [
                {
                  id: "c3-img",
                  type: "image",
                  content: "",
                  src: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80",
                  alt: "Suzuka International Racing Course Japan",
                  styles: { width: "100%", height: "180px", borderRadius: "12px", objectFit: "cover" },
                },
                { id: "c3-tag", type: "text", content: "ROUND 16 // JAPAN", styles: { color: "#F59E0B", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "c3-name", type: "heading", content: "Suzuka International Course", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "20px", fontWeight: "800" } },
                { id: "c3-stats", type: "text", content: "5.807 KM | 18 TURNS | FIGURE-8 LAYOUT", styles: { color: "#F59E0B", fontSize: "12px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "c3-desc", type: "text", content: "The driver's ultimate technical challenge with fluid S-curves, the Degner curves, and the notorious flat-out 130R.", styles: { color: "#94A3B8", fontSize: "13px" } },
              ],
            },
          ],
        },

        // Footer
        {
          id: "circ-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "cf-time", type: "text", content: "UTC SYNC: LONDON 12:00 // MONACO 13:00 // TOKYO 21:00", styles: { color: "#64748B", fontSize: "12px", fontFamily: "monospace" } },
            { id: "cf-copy", type: "text", content: "© 2026 APEX RACING CORSE. GRAND PRIX CIRCUIT DATA ARCHIVE.", styles: { color: "#94A3B8", fontSize: "12px" } },
          ],
        },
      ],
      pageSettings: {
        title: "Global Grand Prix Circuit Record | Apex Corse",
        description: "Explore Apex Corse's victories and track records across Monaco, Silverstone, Suzuka, and the world championship.",
        metaKeywords: "monaco grand prix, silverstone, suzuka circuit, lap record, track record",
        socialImage: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },
];
