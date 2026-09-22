import type { Template } from "../types/template.types";

export const CONTACT_TEMPLATES: Template[] = [
  // ============================================================================
  // Variant 1: VIP Paddock Club & Sponsorship Consultation Hub
  // ============================================================================
  {
    id: "pro-contact-paddock-01",
    userId: "system-pro",
    name: "VIP Paddock Club & Sponsorship Hub",
    description: "Exclusive Formula 1 paddock hospitality and brand partnership contact hub. Split-layout featuring direct VIP concierge communication channels and high-contrast dark glass credential application form.",
    type: "PAGE",
    category: "Contact",
    isFavorite: true,
    isShared: true,
    isPro: true,
    shareToken: "pro-contact-paddock-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // Top Access Ticker
        {
          id: "paddock-vip-ticker",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "8px 24px", borderBottom: "1px solid rgba(225, 6, 0, 0.3)" },
          children: [
            { id: "vip-tick-pill", type: "text", content: "● VIP HOSPITALITY DESK // ACTIVE CONCIERGE", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
            { id: "vip-tick-notice", type: "text", content: "MONACO & SILVERSTONE PADDOCK PASSES: LIMITED ALLOCATION", styles: { color: "#94A3B8", fontSize: "11px", fontFamily: "monospace" } },
          ],
        },

        // Navbar
        {
          id: "paddock-vip-nav",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#0D1117", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "16px 28px", borderRadius: "16px", marginTop: "12px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.1)" },
          children: [
            { id: "vip-nav-brand", type: "heading", content: "⚡ APEX PADDOCK CLUB // VIP RELATIONS", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" } },
            {
              id: "vip-nav-direct",
              type: "button",
              content: "URGENT WHATSAPP DESK ↗",
              styles: { backgroundColor: "#10B981", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", padding: "8px 18px", borderRadius: "6px", border: "none", cursor: "pointer" },
            },
          ],
        },

        // Split Contact Section
        {
          id: "paddock-split-section",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 28 },
          styles: { backgroundColor: "#090C10", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "40px 32px", borderRadius: "24px", marginBottom: "36px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            // Left Column: Direct Concierge Channels
            {
              id: "paddock-channels-col",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 20 },
              styles: { width: "100%", maxWidth: "480px", boxSizing: "border-box" },
              children: [
                { id: "pc-pill", type: "text", content: "✦ DIRECT EXECUTIVE CHANNELS", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
                { id: "pc-h1", type: "heading", content: "SECURE YOUR GRID PASS & TITLE SPONSORSHIP", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "36px", fontWeight: "900", lineHeight: "1.2" } },
                { id: "pc-desc", type: "text", content: "Direct access to our executive hospitality suite, private pit-lane garages, and sovereign title sponsorship desk.", styles: { color: "#94A3B8", fontSize: "15px", lineHeight: "1.6" } },
                // Contact Channels Box
                {
                  id: "pc-cards-stack",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 12 },
                  styles: { boxSizing: "border-box", marginTop: "12px" },
                  children: [
                    {
                      id: "chan-1",
                      type: "container",
                      content: "",
                      classes: [],
                      layout: { layoutType: "flex", direction: "column", gap: 4 },
                      styles: { backgroundColor: "#111622", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                      children: [
                        { id: "c1-h", type: "text", content: "VIP PADDOCK CONCIERGE DIRECT LINE", styles: { color: "#64748B", fontSize: "10px", fontWeight: "800", letterSpacing: "1px" } },
                        { id: "c1-v", type: "text", content: "+377 98 06 20 00 (MONACO HQ)", styles: { color: "#00F0FF", fontSize: "16px", fontWeight: "900", fontFamily: "monospace" } },
                      ],
                    },
                    {
                      id: "chan-2",
                      type: "container",
                      content: "",
                      classes: [],
                      layout: { layoutType: "flex", direction: "column", gap: 4 },
                      styles: { backgroundColor: "#111622", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                      children: [
                        { id: "c2-h", type: "text", content: "GLOBAL SPONSORSHIP & PARTNERSHIPS", styles: { color: "#64748B", fontSize: "10px", fontWeight: "800", letterSpacing: "1px" } },
                        { id: "c2-v", type: "text", content: "PARTNERS@APEXCORSE.COM", styles: { color: "#FFFFFF", fontSize: "16px", fontWeight: "900", fontFamily: "monospace" } },
                      ],
                    },
                    {
                      id: "chan-3",
                      type: "container",
                      content: "",
                      classes: [],
                      layout: { layoutType: "flex", direction: "column", gap: 4 },
                      styles: { backgroundColor: "#111622", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" },
                      children: [
                        { id: "c3-h", type: "text", content: "PRIVATE HELIPAD & JET TRANSFERS", styles: { color: "#64748B", fontSize: "10px", fontWeight: "800", letterSpacing: "1px" } },
                        { id: "c3-v", type: "text", content: "NICE (NCE) ⇄ MONACO HELIPORT (MCM)", styles: { color: "#F59E0B", fontSize: "14px", fontWeight: "800", fontFamily: "monospace" } },
                      ],
                    },
                  ],
                },
              ],
            },

            // Right Column: Dark Glass Inquiry Form
            {
              id: "paddock-form-col",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 16 },
              styles: {
                backgroundColor: "#111622",
                width: "100%",
                maxWidth: "500px",
                boxSizing: "border-box",
                padding: "28px",
                borderRadius: "20px",
                border: "1px solid rgba(225, 6, 0, 0.4)",
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.7)",
              },
              children: [
                { id: "pf-title", type: "heading", content: "REQUEST PADDOCK CLUB CREDENTIALS", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "20px", fontWeight: "800" } },
                { id: "pf-sub", type: "text", content: "All VIP requests are vetted within 2 hours by the Scuderia Hospitality Director.", styles: { color: "#94A3B8", fontSize: "13px" } },
                // Form Field 1: Name
                {
                  id: "fld-1",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "f1-lbl", type: "text", content: "FULL NAME & TITLE", styles: { color: "#E2E8F0", fontSize: "12px", fontWeight: "700" } },
                    { id: "f1-val", type: "text", content: "e.g. Lord Alexander Wright, Managing Partner", styles: { backgroundColor: "rgba(255, 255, 255, 0.04)", color: "#FFFFFF", fontSize: "14px", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.15)" } },
                  ],
                },
                // Form Field 2: Corporate Entity
                {
                  id: "fld-2",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "f2-lbl", type: "text", content: "CORPORATE ENTITY / SPONSOR", styles: { color: "#E2E8F0", fontSize: "12px", fontWeight: "700" } },
                    { id: "f2-val", type: "text", content: "e.g. Zurich Sovereign Capital Ltd.", styles: { backgroundColor: "rgba(255, 255, 255, 0.04)", color: "#FFFFFF", fontSize: "14px", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.15)" } },
                  ],
                },
                // Form Field 3: Tier
                {
                  id: "fld-3",
                  type: "container",
                  content: "",
                  classes: [],
                  layout: { layoutType: "flex", direction: "column", gap: 6 },
                  styles: { boxSizing: "border-box" },
                  children: [
                    { id: "f3-lbl", type: "text", content: "DESIRED ACCESS TIER", styles: { color: "#E2E8F0", fontSize: "12px", fontWeight: "700" } },
                    { id: "f3-val", type: "text", content: "PADDOCK CLUB VIP + GARAGE TOUR + TELEMETRY HEADSET", styles: { backgroundColor: "rgba(225, 6, 0, 0.1)", color: "#FF3D3D", fontSize: "13px", fontWeight: "800", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(225, 6, 0, 0.4)", fontFamily: "monospace" } },
                  ],
                },
                // Submit Button
                {
                  id: "pf-submit",
                  type: "button",
                  content: "SUBMIT VIP CREDENTIAL APPLICATION →",
                  styles: {
                    backgroundColor: "#E10600",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: "800",
                    letterSpacing: "1px",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 10px 30px -5px rgba(225, 6, 0, 0.6)",
                    marginTop: "8px",
                  },
                },
              ],
            },
          ],
        },

        // Footer
        {
          id: "paddock-vip-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "pv-conf", type: "text", content: "STRICT CONFIDENTIALITY GUARANTEED. ALL COMMUNICATIONS GOVERNED BY MONACO ARBITRATION.", styles: { color: "#64748B", fontSize: "11px", fontFamily: "monospace" } },
            { id: "pv-copy", type: "text", content: "© 2026 APEX VIP PADDOCK DESK.", styles: { color: "#94A3B8", fontSize: "12px" } },
          ],
        },
      ],
      pageSettings: {
        title: "VIP Paddock Club & Sponsorship Consultation | Apex Corse",
        description: "Apply for exclusive Formula 1 VIP Paddock Club passes, private pit-lane garage tours, and corporate sponsorships.",
        metaKeywords: "f1 paddock club, sponsorship, monaco grand prix pass, executive motorsport",
        socialImage: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },

  // ============================================================================
  // Variant 2: High-Performance Technical Support
  // ============================================================================
  {
    id: "pro-contact-support-02",
    userId: "system-pro",
    name: "Mission Control 24/7 Technical Support",
    description: "High-performance telemetry support desk and mission control contact page. Includes live telemetry SLA indicator, encrypted radio channel desk, and incident ticketing interface.",
    type: "PAGE",
    category: "Contact",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-contact-support-02",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // Mission Control Top Status
        {
          id: "mc-top-bar",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "8px 24px", borderBottom: "1px solid rgba(0, 240, 255, 0.3)" },
          children: [
            { id: "mc-pill", type: "text", content: "● MISSION CONTROL 24/7 // AVERAGE SLA: 4.8 MINUTES", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
            { id: "mc-uptime", type: "text", content: "TELEMETRY BUS: 99.999% OPERATIONAL // ZERO DROPPED FRAMES", styles: { color: "#10B981", fontSize: "11px", fontWeight: "700", fontFamily: "monospace" } },
          ],
        },

        // Hero
        {
          id: "mc-hero-section",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", alignItems: "center", gap: 16 },
          styles: { backgroundColor: "#090C10", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "48px 32px", borderRadius: "24px", marginBottom: "36px", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" },
          children: [
            { id: "mc-hero-tag", type: "text", content: "✦ TRACKSIDE SENSOR & TELEMETRY DESK", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
            { id: "mc-hero-h1", type: "heading", content: "MISSION CONTROL // 24/7 TRACKSIDE & TELEMETRY SUPPORT", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "38px", fontWeight: "900", lineHeight: "1.15", maxWidth: "800px" } },
            { id: "mc-hero-p", type: "text", content: "Dedicated real-time assistance for race engineers, trackside telemetry data scientists, and simulator technicians worldwide.", styles: { color: "#94A3B8", fontSize: "15px", maxWidth: "600px" } },
          ],
        },

        // 3 Support Channel Cards
        {
          id: "mc-channels-row",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 20 },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            {
              id: "sup-card-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(225, 6, 0, 0.3)" },
              children: [
                { id: "sc1-tag", type: "text", content: "P1 ACTIVE RACE CRITICAL", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "sc1-title", type: "heading", content: "Urgent Pit-Wall Hotwire", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "19px", fontWeight: "800" } },
                { id: "sc1-desc", type: "text", content: "Instant encrypted voice & data hotline reserved strictly for cars currently on track during live sessions.", styles: { color: "#94A3B8", fontSize: "13px" } },
                { id: "sc1-act", type: "text", content: "CALL: +44 1327 850 999", styles: { color: "#FF3D3D", fontSize: "14px", fontWeight: "900", fontFamily: "monospace", marginTop: "8px" } },
              ],
            },
            {
              id: "sup-card-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(0, 240, 255, 0.3)" },
              children: [
                { id: "sc2-tag", type: "text", content: "CAN-BUS & API PROTOCOLS", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "sc2-title", type: "heading", content: "Telemetry API Desk", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "19px", fontWeight: "800" } },
                { id: "sc2-desc", type: "text", content: "SDK debugging, real-time WebSocket data packet drop analysis, and custom ECU sensor mapping.", styles: { color: "#94A3B8", fontSize: "13px" } },
                { id: "sc2-act", type: "text", content: "API-SUPPORT@APEXCORSE.COM", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "900", fontFamily: "monospace", marginTop: "8px" } },
              ],
            },
            {
              id: "sup-card-3",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(245, 158, 11, 0.3)" },
              children: [
                { id: "sc3-tag", type: "text", content: "HARDWARE & SIMULATOR", styles: { color: "#F59E0B", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "sc3-title", type: "heading", content: "Sim-Rig Hardware Support", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "19px", fontWeight: "800" } },
                { id: "sc3-desc", type: "text", content: "Direct drive wheelbase calibration, haptic pedal feedback firmware, and dual hydraulic motion diagnostics.", styles: { color: "#94A3B8", fontSize: "13px" } },
                { id: "sc3-act", type: "text", content: "RIG-TECH@APEXCORSE.COM", styles: { color: "#F59E0B", fontSize: "14px", fontWeight: "900", fontFamily: "monospace", marginTop: "8px" } },
              ],
            },
          ],
        },

        // Footer
        {
          id: "mc-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "mcf-status", type: "text", content: "STATUS: MISSION CONTROL 100% OPERATIONAL", styles: { color: "#10B981", fontSize: "12px", fontWeight: "800", fontFamily: "monospace" } },
            { id: "mcf-copy", type: "text", content: "© 2026 APEX TELEMETRY SYSTEMS LTD.", styles: { color: "#64748B", fontSize: "12px" } },
          ],
        },
      ],
      pageSettings: {
        title: "Mission Control 24/7 Technical Support | Apex Corse",
        description: "24/7 trackside telemetry, pit-wall hotwire support, and simulator hardware engineering assistance.",
        metaKeywords: "technical support, mission control, telemetry api, pit wall support",
        socialImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },

  // ============================================================================
  // Variant 3: Global Racing HQ & Atelier
  // ============================================================================
  {
    id: "pro-contact-hq-03",
    userId: "system-pro",
    name: "Global Racing HQ & Atelier Locator",
    description: "International headquarters and bespoke track car showroom locator. Features Monaco, Oxfordshire, and Maranello ateliers with private appointment scheduling form.",
    type: "PAGE",
    category: "Contact",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-contact-hq-03",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        // Navbar
        {
          id: "atelier-nav",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#0D1117", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "16px 28px", borderRadius: "16px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.1)" },
          children: [
            { id: "at-brand", type: "heading", content: "⚡ APEX ATELIER // GLOBAL LOCATIONS", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" } },
            { id: "at-coords", type: "text", content: "MONACO // MARANELLO // OXFORDSHIRE", styles: { color: "#64748B", fontSize: "12px", fontFamily: "monospace" } },
            {
              id: "at-book-btn",
              type: "button",
              content: "BOOK ATELIER VISIT →",
              styles: { backgroundColor: "#FFFFFF", color: "#090C10", fontSize: "12px", fontWeight: "800", padding: "8px 18px", borderRadius: "6px", border: "none", cursor: "pointer" },
            },
          ],
        },

        // Hero
        {
          id: "atelier-hero",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "column", alignItems: "center", gap: 16 },
          styles: { backgroundColor: "#090C10", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "48px 32px", borderRadius: "24px", marginBottom: "36px", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" },
          children: [
            { id: "at-pill", type: "text", content: "✦ BESPOKE CHASSIS COMMISSIONS & PRIVATE TESTING", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px" } },
            { id: "at-h1", type: "heading", content: "VISIT OUR RACING ATELIERS & WIND TUNNEL CENTRES", headingLevel: "h1", styles: { color: "#FFFFFF", fontSize: "38px", fontWeight: "900", lineHeight: "1.15", maxWidth: "800px" } },
            { id: "at-p", type: "text", content: "Schedule a confidential consultation with our vehicle architects to configure bespoke track prototypes or inspect our active wind tunnels.", styles: { color: "#94A3B8", fontSize: "15px", maxWidth: "600px" } },
          ],
        },

        // 3 Global HQ Cards
        {
          id: "atelier-hqs-row",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 20 },
          styles: { width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: "36px" },
          children: [
            {
              id: "hq-1",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(225, 6, 0, 0.3)" },
              children: [
                { id: "hq1-city", type: "text", content: "MONACO ATELIER // HARBOR", styles: { color: "#FF3D3D", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "hq1-title", type: "heading", content: "Monaco Showroom & Delivery", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "20px", fontWeight: "800" } },
                { id: "hq1-addr", type: "text", content: "14 Quai Antoine 1er, 98000 Monaco", styles: { color: "#94A3B8", fontSize: "13px" } },
                { id: "hq1-tel", type: "text", content: "+377 99 92 10 10", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "800", fontFamily: "monospace" } },
              ],
            },
            {
              id: "hq-2",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(0, 240, 255, 0.3)" },
              children: [
                { id: "hq2-city", type: "text", content: "UNITED KINGDOM // TECHNOLOGY", styles: { color: "#00F0FF", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "hq2-title", type: "heading", content: "Silverstone Wind Tunnel Lab", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "20px", fontWeight: "800" } },
                { id: "hq2-addr", type: "text", content: "Silverstone Tech Park, Towcester NN12 8TN, UK", styles: { color: "#94A3B8", fontSize: "13px" } },
                { id: "hq2-tel", type: "text", content: "+44 1327 850 100", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "800", fontFamily: "monospace" } },
              ],
            },
            {
              id: "hq-3",
              type: "container",
              content: "",
              classes: [],
              layout: { layoutType: "flex", direction: "column", gap: 10 },
              styles: { backgroundColor: "#111622", width: "31%", minWidth: "280px", boxSizing: "border-box", padding: "24px", borderRadius: "16px", border: "1px solid rgba(245, 158, 11, 0.3)" },
              children: [
                { id: "hq3-city", type: "text", content: "ITALY // POWERTRAIN", styles: { color: "#F59E0B", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" } },
                { id: "hq3-title", type: "heading", content: "Maranello Simulation Hub", headingLevel: "h3", styles: { color: "#FFFFFF", fontSize: "20px", fontWeight: "800" } },
                { id: "hq3-addr", type: "text", content: "Via Abetone Inferiore 4, 41053 Maranello, Italy", styles: { color: "#94A3B8", fontSize: "13px" } },
                { id: "hq3-tel", type: "text", content: "+39 0536 949 111", styles: { color: "#00F0FF", fontSize: "14px", fontWeight: "800", fontFamily: "monospace" } },
              ],
            },
          ],
        },

        // Footer
        {
          id: "atelier-footer",
          type: "container",
          content: "",
          classes: ["w-full", "box-border"],
          layout: { layoutType: "flex", direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
          styles: { backgroundColor: "#06090E", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "24px 32px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" },
          children: [
            { id: "at-clearance", type: "text", content: "SECURITY NOTICE: APPOINTMENTS REQUIRE ADVANCE PASSPORT CLEARANCE.", styles: { color: "#64748B", fontSize: "11px", fontFamily: "monospace" } },
            { id: "at-copy", type: "text", content: "© 2026 APEX ATELIER RACING S.A.", styles: { color: "#94A3B8", fontSize: "12px" } },
          ],
        },
      ],
      pageSettings: {
        title: "Global Racing HQ & Atelier Locator | Apex Corse",
        description: "Visit our global racing ateliers in Monaco, Silverstone, and Maranello for private hypercar commissioning.",
        metaKeywords: "racing atelier, monaco showroom, silverstone wind tunnel, maranello engineering",
        socialImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },
];
