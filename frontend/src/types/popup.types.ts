import type { EditorElement } from "../pages/editor/WebsiteEditor";

export type PopupLayoutMode = "modal" | "slide-in" | "hello-bar" | "full-screen";
export type PopupTriggerType = "load" | "scroll" | "exit-intent" | "click" | "inactivity";
export type SlideInPosition = "left" | "right" | "bottom-right" | "bottom-left";
export type HelloBarPosition = "top" | "bottom";

export interface PopupTriggerConfig {
  type: PopupTriggerType;
  delaySeconds?: number;
  scrollPercentage?: number;
  inactivitySeconds?: number;
  selector?: string;
}

export interface PopupConditionsConfig {
  allPages: boolean;
  includePaths: string[];
  excludePaths: string[];
}

export interface PopupTargetingConfig {
  devices: ("desktop" | "tablet" | "mobile")[];
  frequencyCap: "every-time" | "once-per-session" | "once-every-x-days";
  frequencyDays?: number;
  referrerSource?: "all" | "search" | "social";
}

export interface PopupConfig {
  id: string;
  name: string;
  layoutMode: PopupLayoutMode; // modal (F-282), slide-in (F-286 Off-Canvas), hello-bar (F-288), full-screen
  slidePosition?: SlideInPosition;
  helloBarPosition?: HelloBarPosition;
  width: string; // e.g., '650px', '90vw', '100%'
  height: string; // e.g., 'auto', '500px', '60px'
  backdropOverlay: boolean;
  backdropColor: string;
  closeOnBackdropClick: boolean;
  closeButton: boolean;
  closeButtonPosition: "inside" | "outside";
  entranceAnimation: "fade" | "zoom" | "slide-up" | "slide-down" | "slide-left" | "slide-right";
  elements: EditorElement[]; // Standard container/elements built using existing builder widgets
  triggers: PopupTriggerConfig[]; // F-283
  conditions: PopupConditionsConfig; // F-284
  targeting: PopupTargetingConfig; // F-285
  viewsCount?: number; // F-290
  clicksCount?: number; // F-290
  isActive?: boolean;
}

export function generatePopupId(): string {
  return "pop_" + Math.random().toString(36).substring(2, 9);
}

export function createDefaultPopup(
  name = "New Promotion Popup",
  layoutMode: PopupLayoutMode = "modal"
): PopupConfig {
  const id = generatePopupId();

  const baseContainer: EditorElement = {
    id: "el_" + Math.random().toString(36).substring(2, 9),
    type: "container",
    content: "Popup Content Container",
    layout: {
      layoutType: "flex",
      direction: "column",
      justifyContent: "center",
      alignItems: "stretch",
      gap: 16,
    },
    styles: {
      width: "100%",
      backgroundColor: "#ffffff",
      paddingTop: "32px",
      paddingRight: "32px",
      paddingBottom: "32px",
      paddingLeft: "32px",
      borderRadius: layoutMode === "hello-bar" ? "0px" : "16px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    },
    children: [
      {
        id: "el_" + Math.random().toString(36).substring(2, 9),
        type: "heading",
        content: layoutMode === "hello-bar" ? "Special Announcement! Get 25% Off Today" : "Exclusive Limited Offer!",
        styles: {
          color: "#0f172a",
          fontSize: layoutMode === "hello-bar" ? "18px" : "26px",
          fontWeight: "700",
          textAlign: "center",
          marginTop: "0px",
          marginBottom: "8px",
        },
      },
      {
        id: "el_" + Math.random().toString(36).substring(2, 9),
        type: "text",
        content:
          layoutMode === "hello-bar"
            ? "Use promo code FORGE25 at checkout before midnight."
            : "Subscribe to our newsletter to receive the latest updates, special promotions, and VIP product insights.",
        styles: {
          color: "#475569",
          fontSize: "14px",
          fontWeight: "400",
          textAlign: "center",
          marginTop: "0px",
          marginBottom: "12px",
          lineHeight: "1.5",
        },
      },
      {
        id: "el_" + Math.random().toString(36).substring(2, 9),
        type: "button",
        content: "Claim My 25% Discount Now",
        href: "#",
        styles: {
          color: "#ffffff",
          backgroundColor: "#2563eb",
          fontSize: "14px",
          fontWeight: "600",
          textAlign: "center",
          paddingTop: "12px",
          paddingBottom: "12px",
          paddingLeft: "24px",
          paddingRight: "24px",
          borderRadius: "8px",
          marginTop: "8px",
          marginBottom: "0px",
        },
      },
    ],
  };

  return {
    id,
    name,
    layoutMode,
    slidePosition: layoutMode === "slide-in" ? "bottom-right" : undefined,
    helloBarPosition: layoutMode === "hello-bar" ? "top" : undefined,
    width: layoutMode === "hello-bar" ? "100%" : layoutMode === "slide-in" ? "380px" : "580px",
    height: "auto",
    backdropOverlay: layoutMode === "modal" || layoutMode === "full-screen",
    backdropColor: "rgba(15, 23, 42, 0.65)",
    closeOnBackdropClick: true,
    closeButton: true,
    closeButtonPosition: "inside",
    entranceAnimation: layoutMode === "slide-in" ? "slide-up" : layoutMode === "hello-bar" ? "slide-down" : "zoom",
    elements: [baseContainer],
    triggers: [
      {
        type: "load",
        delaySeconds: 3,
      },
      {
        type: "exit-intent",
      },
    ],
    conditions: {
      allPages: true,
      includePaths: [],
      excludePaths: [],
    },
    targeting: {
      devices: ["desktop", "tablet", "mobile"],
      frequencyCap: "once-per-session",
      referrerSource: "all",
    },
    viewsCount: 0,
    clicksCount: 0,
    isActive: true,
  };
}

export const POPUP_TEMPLATES = [
  {
    id: "lead-magnet",
    name: "Lead Magnet Opt-In",
    category: "Lead Generation",
    description: "High-converting modal with headline, value proposition, and CTA button.",
    layoutMode: "modal" as PopupLayoutMode,
    previewImg: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&auto=format&fit=crop&q=60",
    create: () => {
      const p = createDefaultPopup("Lead Magnet Opt-In", "modal");
      p.width = "540px";
      p.entranceAnimation = "zoom";
      return p;
    },
  },
  {
    id: "exit-intent-discount",
    name: "Exit-Intent 20% Discount",
    category: "Ecommerce",
    description: "Triggered when visitor moves mouse to close tab. Recovers abandoning traffic.",
    layoutMode: "modal" as PopupLayoutMode,
    previewImg: "https://images.unsplash.com/photo-1556742049-0a67c55c5678?w=300&auto=format&fit=crop&q=60",
    create: () => {
      const p = createDefaultPopup("Exit-Intent 20% Discount", "modal");
      p.width = "600px";
      p.triggers = [{ type: "exit-intent" }];
      p.targeting.frequencyCap = "once-every-x-days";
      p.targeting.frequencyDays = 7;
      return p;
    },
  },
  {
    id: "slidein-support",
    name: "Off-Canvas Support & Live Chat",
    category: "Customer Service",
    description: "Sleek corner slide-in drawer appearing on scroll depth.",
    layoutMode: "slide-in" as PopupLayoutMode,
    previewImg: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=60",
    create: () => {
      const p = createDefaultPopup("Off-Canvas Support Drawer", "slide-in");
      p.slidePosition = "bottom-right";
      p.width = "360px";
      p.backdropOverlay = false;
      p.triggers = [{ type: "scroll", scrollPercentage: 40 }];
      p.entranceAnimation = "slide-up";
      return p;
    },
  },
  {
    id: "hello-bar-banner",
    name: "Sticky Announcement Bar",
    category: "Notification",
    description: "Compact full-width top banner for sales, coupons, and announcements.",
    layoutMode: "hello-bar" as PopupLayoutMode,
    previewImg: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&auto=format&fit=crop&q=60",
    create: () => {
      const p = createDefaultPopup("Top Announcement Bar", "hello-bar");
      p.helloBarPosition = "top";
      p.width = "100%";
      p.backdropOverlay = false;
      p.triggers = [{ type: "load", delaySeconds: 0 }];
      p.entranceAnimation = "slide-down";
      return p;
    },
  },
];
