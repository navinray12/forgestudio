
import PopupManagerModal from "./components/PopupManagerModal";
import PopupRuntimePreview from "./components/PopupRuntimePreview";
import DeveloperModal, { type DeveloperModalMode } from "./components/DeveloperModal";
import { SaveTemplateDialog, ReplaceTemplateDialog, ImportWebsiteKitDialog, useSaveTemplate, useTemplateLibrary, TemplateLibrary, exportWebsiteKitAsJson, type Template } from "../../features/templates";
import { RevisionHistoryPanel, revisionHistoryService } from "../../features/revision-history";
import { useAutosave, AutosaveStatusIndicator } from "../../features/autosave";
import { AtomicEditor, GlobalElementService, ReusableComponentService } from "../../features/atomic-editor";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Monitor, Smartphone, Tablet, Undo, Redo, Save, Eye, Settings, Plus, Trash2, Copy,
  ChevronDown, ChevronRight, Layers, Type, Image as ImageIcon, Box, Grid,
  Sliders, Palette, FileText, Globe, Code, Play, Check, X, Move, Lock, Unlock,
  HelpCircle, ExternalLink, RefreshCw, Database, Server, Cpu, HardDrive, Key,
  Mail, MessageSquare, Phone, User, Calendar, MapPin, Search, Star, Share2,
  AlertCircle, Info, Download, Upload, Zap, Shield, Sparkles, Layout, Compass,
  Terminal, ShieldCheck, StickyNote, FormInput, Link as LinkIcon, Navigation, ArrowRight, Menu
} from "lucide-react";

// ==========================================
// Types & Interfaces
// ==========================================



// Extracted Modular Imports
export * from "./types";
export * from "./utils";
export * from "./defaults";
export * from "./widgets";
import {
  triggerImagePicker,
  ImageWidgetInspector,
  BackgroundImageInspector,
  VideoWidgetInspector,
  GalleryWidgetInspector,
  SlidesWidgetInspector,
  ShareButtonsInspector,
  FormWidgetInspector,
  ReviewsWidgetInspector,
  VideoPlaylistInspector,
  NavMenuWidgetInspector,
  CountdownWidgetInspector,
  LottieWidgetInspector,
  CodeHighlightWidgetInspector,
  ButtonWidgetInspector,
  PortfolioWidgetInspector,
  LoginWidgetInspector,
  AnimatedTextWidgetInspector,
  PriceTableWidgetInspector,
  PriceListWidgetInspector,
  FlipBoxWidgetInspector,
  CTAWidgetInspector,
  MediaCarouselWidgetInspector,
  TestimonialCarouselWidgetInspector,
  NestedCarouselWidgetInspector,
  LoopCarouselWidgetInspector,
  TOCWidgetInspector,
  FacebookWidgetInspector,
  BlockquoteWidgetInspector,
  PaymentWidgetInspector,
  WooCommerceWidgetInspector,
  AudioPlaylistInspector,
  PayPalWidgetInspector
} from "./inspector/DynamicWidgetInspectors";

import type {
  PageConfig,
  ElementType,
  NavSubmenuItem,
  NavMenuItem,
  PricePlanFeature,
  PricingPlan,
  PriceListItem,
  GalleryImageItem,
  AnimatedHeadlineStyle,
  WidgetRegistryItem,
  DeviceMode,
  Breakpoint,
  PlaylistItem,
  ImageCarouselItem,
  MediaCarouselItem,
  MegaMenuColumnLink,
  MegaMenuColumn,
  MegaMenuItem,
  TestimonialItem,
  ReviewItem,
  LoopCarouselItem,
  FormFieldType,
  FormFieldItem,
  SlideItem,
  PortfolioItem,
  ShareNetworkType,
  ShareNetworkItem,
  PostItem,
  ContainerLayout,
  ElementStyles,
  ElementState,
  EditorElement,
  WebsiteData
} from "./types";
import {
  ALL_WIDGET_REGISTRY,
  DEFAULT_VISIBLE_WIDGETS
} from "./types";

import {
  generateId,
  resolveImageUrl,
  parseSpacingUnit,
  getEffectiveStyle,
  getEffectiveHoverStyle,
  getControlStyleValue,
  isControlStyleConfigured,
  hasHoverStyleOverride,
  getEffectiveLayout,
  getMergedStyles,
  getMergedLayout,
  getInnerStyles,
  hasStyleOverride,
  generateElementsHoverCSS,
  findTreeElement,
  getElementBreadcrumbPath,
  updateTreeElement,
  insertTreeElement,
  insertTreeElementAtPosition,
  deleteTreeElement,
  duplicateTreeElement,
  moveTreeElement,
  reorderTreeElement
} from "./utils";

import {
  PRESET_SECTION_TEMPLATES,
  createDefaultElement
} from "./defaults";

import {
  ContainerBoxIcon,
  HeadingBoxIcon,
  TextBoxIcon,
  ImageBoxIcon,
  ButtonBoxIcon,
  PostsBoxIcon,
  ShareButtonsBoxIcon,
  PortfolioBoxIcon,
  SlidesBoxIcon,
  FormBoxIcon,
  LoginBoxIcon,
  NavMenuBoxIcon,
  AnimatedHeadlineBoxIcon,
  PriceTableBoxIcon,
  PriceListBoxIcon,
  GalleryBoxIcon,
  FlipBoxIcon,
  CtaBoxIcon,
  MediaCarouselBoxIcon,
  TestimonialBoxIcon,
  NestedCarouselBoxIcon,
  LoopCarouselBoxIcon,
  TocBoxIcon,
  CountdownBoxIcon,
  FacebookPageBoxIcon,
  BlockquoteBoxIcon,
  TemplateBoxIcon,
  ReviewsBoxIcon,
  FacebookButtonBoxIcon,
  FacebookEmbedBoxIcon,
  FacebookCommentsBoxIcon,
  PayPalButtonBoxIcon,
  StripeButtonBoxIcon,
  LottieBoxIcon,
  CodeHighlightBoxIcon,
  VideoPlaylistBoxIcon,
  MegaMenuBoxIcon,
  OffCanvasBoxIcon,
  ImageCarouselBoxIcon,
  EmptyPictureIcon,
  UploadCloudIcon,
  AnimatedCounter
} from "./widgets";

import {
  SlidesWidgetRenderer,
  FormWidgetRenderer,
  LoginWidgetRenderer,
  NavMenuWidgetRenderer,
  AnimatedHeadlineWidgetRenderer,
  PriceTableWidgetRenderer,
  PriceListWidgetRenderer,
  GalleryWidgetRenderer,
  FlipBoxWidgetRenderer,
  CtaWidgetRenderer,
  MediaCarouselWidgetRenderer,
  TestimonialCarouselWidgetRenderer,
  NestedCarouselWidgetRenderer,
  LoopCarouselWidgetRenderer,
  TocWidgetRenderer,
  CountdownWidgetRenderer,
  FacebookPageWidgetRenderer,
  BlockquoteWidgetRenderer,
  TemplateWidgetRenderer,
  ReviewsWidgetRenderer,
  FacebookButtonWidgetRenderer,
  FacebookEmbedWidgetRenderer,
  FacebookCommentsWidgetRenderer,
  PayPalButtonWidgetRenderer,
  StripeButtonWidgetRenderer,
  ImageCarouselWidgetRenderer,
  LottieWidgetRenderer,
  CodeHighlightWidgetRenderer,
  MegaMenuWidgetRenderer,
  OffCanvasWidgetRenderer,
  BasicMediaCarouselWidgetRenderer,
  BasicGalleryWidgetRenderer,
  AudioPlaylistWidgetRenderer,
  DynamicLightboxWidgetRenderer,
  CustomSvgWidgetRenderer,
  IconLibraryWidgetRenderer,
  ShareButtonsWidgetRenderer,
  WcProductTitleWidgetRenderer,
  WcProductPriceWidgetRenderer,
  WcProductImagesWidgetRenderer,
  WcAddToCartWidgetRenderer,
  WcProductRatingWidgetRenderer
} from "./widgets";

import { SpacingControl } from "./inspector";

export default function WebsiteEditor() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // State Management
  const [website, setWebsite] = useState<WebsiteData | null>(null);

  const [globalSettings, setGlobalSettings] = useState<any>({
    siteIdentity: { name: "My Website" },
    backToTop: { enabled: true, position: "bottom-right", offset: 300 },
    floatingActionButton: { enabled: false, icon: "whatsapp", label: "Chat with us", position: "bottom-left" }
  });

  const [elements, setElements] = useState<EditorElement[]>([]);

const [popups, setPopups] = useState<any[]>([]);

  const [isPopupManagerOpen, setIsPopupManagerOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isComponentAccessOpen, setIsComponentAccessOpen] = useState(false);
  const [activeCanvasMode, setActiveCanvasMode] = useState<"page" | "popup">("page");
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [devModalMode, setDevModalMode] = useState<DeveloperModalMode | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>("widgets");
  const [pageCss, setPageCss] = useState<string>("");

  const handleSelectPopupForEdit = (popup: any) => {
    setActivePopupId(popup.id);
  };
  const handleCreatePopup = (popup: any) => {
    setPopups((prev) => [...prev, popup]);
  };
  const handleUpdatePopup = (id: string, popup: any) => {
    setPopups((prev) => prev.map((p) => (p.id === id ? { ...p, ...popup } : p)));
  };
  const handleDeletePopup = (id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  };
  const handleDuplicatePopup = (id: string) => {
    const p = popups.find((pop) => pop.id === id);
    if (p) setPopups((prev) => [...prev, { ...p, id: generateId(), title: `${p.title} (Copy)` }]);
  };
  const handleTrackPopupView = (id: string) => {};
  const handleTrackPopupClick = (id: string) => {};


  const handleSampleColor = async (onColorPicked: (hex: string) => void) => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          onColorPicked(result.sRGBHex);
        }
      } catch (err) {
        console.warn("EyeDropper error:", err);
      }
    }
  };

  const renderTypographySection = () => null;

  const [breakpoints, setBreakpoints] = useState<any[]>([
    { id: "desktop", name: "Desktop", minWidth: 1025 },
    { id: "tablet", name: "Tablet", minWidth: 768, maxWidth: 1024 },
    { id: "mobile", name: "Mobile", maxWidth: 767 }
  ]);
  const activeBreakpointId = "desktop";

  const getStyleVal = (element: any, key: string, breakpointId: string, _bpList: any[]) => {
    if (!element) return undefined;
    if (element.responsiveStyles && element.responsiveStyles[breakpointId]?.[key]) {
      return element.responsiveStyles[breakpointId][key];
    }
    return element.styles?.[key];
  };

  const renderResponsiveLabel = (label: string) => (
    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
  );

  const renderAccordion = (title: string, id: string, children: React.ReactNode) => (
    <details key={id} className="group border border-slate-200 rounded-lg bg-white overflow-hidden my-2">
      <summary className="flex cursor-pointer items-center justify-between p-3 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 select-none">
        <span>{title}</span>
        <span className="transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="p-3 border-t border-slate-200 space-y-3">{children}</div>
    </details>
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const findTreeElement = (tree: EditorElement[], targetId: string): EditorElement | null => {
    for (const item of tree) {
      if (item.id === targetId) return item;
      if (item.children && item.children.length > 0) {
        const found = findTreeElement(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };
  const selectedElement = selectedId ? findTreeElement(elements, selectedId) : null;
  const selectedElementAny = selectedElement as any;
  const [allowedComponentIds, setAllowedComponentIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeElementState, setActiveElementState] = useState<ElementState>("normal");

  // Reusable Components State (F-005)
  const [components, setComponents] = useState<Record<string, { name: string; element: EditorElement }>>({});

  const syncComponentInstances = (compId: string, updatedSource: EditorElement) => {
    const updateMatching = (list: EditorElement[]): EditorElement[] => {
      return list.map((item) => {
        let currentItem = item;
        if (item.componentId === compId) {
          currentItem = {
            ...currentItem,
            content: updatedSource.content,
            src: updatedSource.src,
            alt: updatedSource.alt,
            href: updatedSource.href,
            styles: { ...updatedSource.styles },
            hoverStyles: updatedSource.hoverStyles ? JSON.parse(JSON.stringify(updatedSource.hoverStyles)) : undefined,
            layout: updatedSource.layout ? { ...updatedSource.layout } : undefined,
            responsiveStyles: updatedSource.responsiveStyles ? JSON.parse(JSON.stringify(updatedSource.responsiveStyles)) : undefined,
            responsiveHoverStyles: updatedSource.responsiveHoverStyles ? JSON.parse(JSON.stringify(updatedSource.responsiveHoverStyles)) : undefined,
            responsiveLayout: updatedSource.responsiveLayout ? JSON.parse(JSON.stringify(updatedSource.responsiveLayout)) : undefined,
          };
        }
        if (currentItem.children && currentItem.children.length > 0) {
          currentItem = {
            ...currentItem,
            children: updateMatching(currentItem.children),
          };
        }
        return currentItem;
      });
    };

    setElements((prev) => updateMatching(prev));
  };

  const handleSaveAsComponent = (elementId: string) => {
    const el = findTreeElement(elements, elementId);
    if (!el) return;
    const compId = "comp_" + Math.random().toString(36).substring(2, 9);
    const compName = el.componentName || `${el.type.charAt(0).toUpperCase() + el.type.slice(1)} Component`;

    const masterCopy: EditorElement = JSON.parse(JSON.stringify(el));
    masterCopy.componentId = compId;
    masterCopy.isComponent = true;

    setComponents((prev) => ({
      ...prev,
      [compId]: {
        name: compName,
        element: masterCopy,
      },
    }));

    setElements((prev) =>
      updateTreeElement(prev, elementId, (item) => ({
        ...item,
        componentId: compId,
        isComponent: true,
        componentName: compName,
      }))
    );
  };

  const handleAddInstanceFromComponent = (compId: string) => {
    const comp = components[compId];
    if (!comp) return;

    const createInstance = (base: EditorElement): EditorElement => ({
      ...JSON.parse(JSON.stringify(base)),
      id: generateId(),
      componentId: compId,
      isComponent: true,
      componentName: comp.name,
      children: base.children ? base.children.map(createInstance) : undefined,
    });

    const newInstance = createInstance(comp.element);
    setElements((prev) => [...prev, newInstance]);
    setSelectedId(newInstance.id);
    setSelectedIds([newInstance.id]);
  };

  const handleSelectTemplate = (elementId: string, templateId?: string, presetName?: string) => {
    setElements((prev) =>
      updateTreeElement(prev, elementId, (item) => ({
        ...item,
        templateId: templateId,
        templateSource: templateId ? "custom" : "preset",
        templatePresetName: presetName as any,
      }))
    );
  };

  const handleUnpackTemplate = (elementId: string) => {
    const el = findTreeElement(elements, elementId);
    if (!el) return;

    let unpackedElements: EditorElement | null = null;

    if (el.templateId && components[el.templateId]) {
      const comp = components[el.templateId];
      const createInstance = (base: EditorElement): EditorElement => ({
        ...JSON.parse(JSON.stringify(base)),
        id: generateId(),
        children: base.children ? base.children.map(createInstance) : undefined,
      });
      unpackedElements = createInstance(comp.element);
    } else if (el.templatePresetName && PRESET_SECTION_TEMPLATES[el.templatePresetName]) {
      unpackedElements = PRESET_SECTION_TEMPLATES[el.templatePresetName].getElements(generateId);
    }

    if (!unpackedElements) return;

    setElements((prev) => {
      const replaceInTree = (list: EditorElement[]): EditorElement[] => {
        return list.map((item) => {
          if (item.id === elementId) {
            return unpackedElements!;
          }
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: replaceInTree(item.children),
            };
          }
          return item;
        });
      };
      return replaceInTree(prev);
    });

    setSelectedId(unpackedElements.id);
    setSelectedIds([unpackedElements.id]);
  };

  // Drag & Drop State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "inside" | null>(null);

  // Context Menu State (F-010)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Favorite Widgets State (F-012)
  const [favoriteWidgets, setFavoriteWidgets] = useState<ElementType[]>(() => {
    try {
      const saved = localStorage.getItem("forgestudio_favorite_widgets");
      return saved ? JSON.parse(saved) : ["heading", "button"];
    } catch {
      return ["heading", "button"];
    }
  });

  // User Preferences State (F-026)
  const [userPreferences, setUserPreferences] = useState<{
    autoSaveEnabled: boolean;
    gridOverlay: boolean;
    themeMode: "dark" | "light";
  }>(() => {
    try {
      const saved = localStorage.getItem("forgestudio_user_preferences");
      return saved ? JSON.parse(saved) : { autoSaveEnabled: true, gridOverlay: false, themeMode: "dark" };
    } catch {
      return { autoSaveEnabled: true, gridOverlay: false, themeMode: "dark" };
    }
  });

  const updatePreference = <K extends keyof typeof userPreferences>(
    key: K,
    value: (typeof userPreferences)[K]
  ) => {
    setUserPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem("forgestudio_user_preferences", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save user preferences:", err);
      }
      return updated;
    });
  };

  const toggleFavoriteWidget = (type: ElementType, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavoriteWidgets((prev) => {
      const isFav = prev.includes(type);
      const updated = isFav ? prev.filter((item) => item !== type) : [...prev, type];
      try {
        localStorage.setItem("forgestudio_favorite_widgets", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save favorite widgets:", err);
      }
      return updated;
    });
  };

  // Revision & History State (F-013)
  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoAction = useRef(false);

  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    setHistory((prev) => {
      const sliced = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : prev;
      const updated = [...sliced, JSON.parse(JSON.stringify(elements))];
      if (updated.length > 50) updated.shift();
      return updated;
    });

    setHistoryIndex(historyIndex >= 0 ? Math.min(historyIndex + 1, 49) : 0);
  }, [elements]);

  const handleUndo = () => {
    if (historyIndex > 0 && history[historyIndex - 1]) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleSelectElement = (id: string | null, e?: React.MouseEvent) => {
    setActiveElementState("normal");
    if (!id) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }

    if (e && (e.ctrlKey || e.metaKey)) {
      setSelectedIds((prev) => {
        const isAlreadySelected = prev.includes(id);
        const updated = isAlreadySelected
          ? prev.filter((item) => item !== id)
          : [...prev, id];
        setSelectedId(updated.length > 0 ? updated[updated.length - 1] : null);
        return updated;
      });
    } else {
      setSelectedId(id);
      setSelectedIds([id]);
    }
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [activeDevice, setActiveDevice] = useState<DeviceMode>("desktop");
  const [isMarginLinked, setIsMarginLinked] = useState<boolean>(true);
  const [isPaddingLinked, setIsPaddingLinked] = useState<boolean>(true);
  const [isBorderRadiusLinked, setIsBorderRadiusLinked] = useState<boolean>(true);

  const [isPreview, setIsPreview] = useState(false);
  const [isFullScreenCanvas, setIsFullScreenCanvas] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Navigator & Sidebar State
  const [leftSidebarTab, setLeftSidebarTab] = useState<"elements" | "navigator" | "templates">("elements");
  const [collapsedContainers, setCollapsedContainers] = useState<Record<string, boolean>>({});
  const [structureSearchQuery, setStructureSearchQuery] = useState("");


  // Element Manager & Widget Visibility State
  const [disabledWidgets, setDisabledWidgets] = useState<ElementType[]>(() => {
    try {
      const saved = localStorage.getItem("forgestudio_disabled_widgets");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    // Default on fresh launch: Show ALL widgets in sidebar palette
    return [];
  });
  const [isElementManagerOpen, setIsElementManagerOpen] = useState(false);
  const [isRevisionHistoryOpen, setIsRevisionHistoryOpen] = useState(false);
  const [widgetLibrarySearch, setWidgetLibrarySearch] = useState("");
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  const [managerCategoryFilter, setManagerCategoryFilter] = useState<string>("All");

  const handleRestoreRevision = (restoredElements: EditorElement[], restoredPageSettings?: any) => {
    if (Array.isArray(restoredElements)) {
      setElements(JSON.parse(JSON.stringify(restoredElements)));
    }
    if (restoredPageSettings) {
      setPageSettings(JSON.parse(JSON.stringify(restoredPageSettings)));
    }
    if (updateAutosaveBaseline) {
      updateAutosaveBaseline(restoredElements, restoredPageSettings);
    }
    setSelectedId(null);
    setSelectedIds([]);
    setSaveMessage("Restored revision successfully!");
    setTimeout(() => setSaveMessage(""), 3500);
  };

  const toggleWidgetAvailability = (type: ElementType) => {
    setDisabledWidgets((prev) => {
      const updated = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      try {
        localStorage.setItem("forgestudio_disabled_widgets", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save widget visibility preferences:", err);
      }
      return updated;
    });
  };

  const enableAllWidgets = () => {
    setDisabledWidgets([]);
    try {
      localStorage.setItem("forgestudio_disabled_widgets", JSON.stringify([]));
    } catch (err) {
      console.error("Failed to save widget visibility preferences:", err);
    }
  };

  const resetWidgetsToDefault = () => {
    const core5: ElementType[] = ["heading", "text", "button", "image", "container"];
    const nonCore = ALL_WIDGET_REGISTRY.map((w) => w.type).filter((t) => !core5.includes(t));
    setDisabledWidgets(nonCore);
    try {
      localStorage.setItem("forgestudio_disabled_widgets", JSON.stringify(nonCore));
    } catch (err) {
      console.error("Failed to save widget visibility preferences:", err);
    }
  };

  const isWidgetLibraryVisible = (type: ElementType, name?: string) => {
    if (disabledWidgets.includes(type)) return false;
    if (!widgetLibrarySearch.trim()) return true;
    const q = widgetLibrarySearch.toLowerCase().trim();
    const label = name || ALL_WIDGET_REGISTRY.find((w) => w.type === type)?.name || type;
    return label.toLowerCase().includes(q) || type.toLowerCase().includes(q);
  };

  // Copy / Paste State
  const [copiedElement, setCopiedElement] = useState<EditorElement | null>(null);
  const [copiedElements, setCopiedElements] = useState<EditorElement[]>([]);
  const [copiedStyles, setCopiedStyles] = useState<{
    styles?: ElementStyles;
    responsiveStyles?: Partial<Record<DeviceMode, Partial<ElementStyles>>>;
    hoverStyles?: Partial<ElementStyles>;
    responsiveHoverStyles?: Partial<Record<DeviceMode, Partial<ElementStyles>>>;
  } | null>(null);

  // Page Settings State (F-018 & F-019 & F-022)
  const [pageSettings, setPageSettings] = useState<{
    title?: string;
    description?: string;
    path?: string;
    backgroundColor?: string;
    customHead?: string;
    isMaintenanceMode?: boolean;
    siteLanguage?: string;
  }>({
    title: "Home",
    description: "",
    path: "/",
    backgroundColor: "#ffffff",
    customHead: "",
    isMaintenanceMode: false,
    siteLanguage: "en",
  });

// Multi-Page Management & Preview States
const [pages, setPages] = useState<PageConfig[]>([]);
const [activePageId, setActivePageId] = useState<string>("home");
const [activePreviewPageId, setActivePreviewPageId] = useState<string>("home");
const [isPageSelectorOpen, setIsPageSelectorOpen] = useState<boolean>(false);
const [isAddPageModalOpen, setIsAddPageModalOpen] = useState<boolean>(false);
const [newPageName, setNewPageName] = useState<string>("");
const [newPageSlug, setNewPageSlug] = useState<string>("");
const [editingPageId, setEditingPageId] = useState<string | null>(null);
const [editPageName, setEditPageName] = useState<string>("");
const [editPageSlug, setEditPageSlug] = useState<string>("");
const [isEditPageModalOpen, setIsEditPageModalOpen] = useState<boolean>(false);
const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

// Sync live editor state (elements & pageSettings) with the active page entry in pages array
useEffect(() => {
  if (!activePageId) return;

  setPages((prevPages) => {
    if (!prevPages || prevPages.length === 0) return prevPages;

    const exists = prevPages.some((p) => p.id === activePageId);
    if (!exists) return prevPages;

    return prevPages.map((p) => {
      if (p.id === activePageId) {
        const updatedName = pageSettings.title || p.name;
        const updatedSlug = pageSettings.path || p.slug;

        if (
          p.elements === elements &&
          p.pageSettings === pageSettings &&
          p.name === updatedName &&
          p.slug === updatedSlug
        ) {
          return p;
        }

        return {
          ...p,
          name: updatedName,
          slug: updatedSlug,
          elements,
          pageSettings,
        };
      }

      return p;
    });
  });
}, [elements, pageSettings, activePageId]);

// Sync preview active page with URL query parameter "?page=..." and popstate listener
useEffect(() => {
  if (!isPreview || pages.length === 0) return;

  const syncFromUrl = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlPageParam =
      searchParams.get("page") || searchParams.get("previewPage");

    if (urlPageParam) {
      const found = pages.find(
        (p) =>
          p.id === urlPageParam ||
          p.slug === urlPageParam ||
          p.slug === `/${urlPageParam}` ||
          p.name.toLowerCase() === urlPageParam.toLowerCase()
      );

      if (found) {
        setActivePreviewPageId(found.id);
        return;
      }
    }

    const homePage =
      pages.find(
        (p) => p.isHome || p.slug === "/" || p.id === "home"
      ) || pages[0];

    if (homePage) {
      setActivePreviewPageId(homePage.id);
    }
  };

  syncFromUrl();

  window.addEventListener("popstate", syncFromUrl);

  return () => window.removeEventListener("popstate", syncFromUrl);
}, [isPreview, pages]);

const handlePreviewPageNavigate = (targetPage: PageConfig) => {
  setActivePreviewPageId(targetPage.id);

  const newUrl = new URL(window.location.href);

  const cleanSlug =
    targetPage.slug === "/"
      ? "home"
      : targetPage.slug.replace(/^\//, "");

  newUrl.searchParams.set("page", cleanSlug);

  window.history.pushState({}, "", newUrl.toString());
};

const handleSwitchEditingPage = (targetPageId: string) => {
  const target = pages.find((p) => p.id === targetPageId);

  if (!target) return;

  setPages((prev) =>
    prev.map((p) =>
      p.id === activePageId
        ? {
            ...p,
            elements,
            pageSettings,
            name: pageSettings.title || p.name,
            slug: pageSettings.path || p.slug,
          }
        : p
    )
  );

  setActivePageId(target.id);
  setElements(target.elements || []);

  setPageSettings(
    target.pageSettings || {
      title: target.name,
      path: target.slug,
    }
  );

  setSelectedId(null);
  setSelectedIds([]);
  setIsPageSelectorOpen(false);
};

const handleCreateNewPage = () => {
  const rawTitle =
    newPageName.trim() || `Page ${pages.length + 1}`;

  const formattedSlug = newPageSlug.trim()
    ? newPageSlug.startsWith("/")
      ? newPageSlug
      : `/${newPageSlug}`
    : `/${rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;

  const newPageObj: PageConfig = {
    id: `page_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 6)}`,

    name: rawTitle,
    slug: formattedSlug,

    elements: [],

    pageSettings: {
      title: rawTitle,
      path: formattedSlug,
      description: "",
      backgroundColor: "#ffffff",
      isMaintenanceMode: false,
      siteLanguage: "en",
    },

    isHome: pages.length === 0,
  };

  const updatedPages = [...pages, newPageObj];

  setPages(updatedPages);
  setActivePageId(newPageObj.id);

  setElements([]);
  setPageSettings(newPageObj.pageSettings);

  setSelectedId(null);
  setSelectedIds([]);

  setNewPageName("");
  setNewPageSlug("");

  setIsAddPageModalOpen(false);
  setIsPageSelectorOpen(false);

  setSaveMessage(`Page "${rawTitle}" created!`);

  setTimeout(() => setSaveMessage(""), 3000);
};

const handleDeletePage = (
  pageIdToDelete: string,
  e: React.MouseEvent
) => {
  e.stopPropagation();

  if (pages.length <= 1) {
    setErrorMessage("Cannot delete the only remaining page.");

    setTimeout(() => setErrorMessage(""), 3000);

    return;
  }

  const target = pages.find(
    (p) => p.id === pageIdToDelete
  );

  if (!target) return;

  if (
    !window.confirm(
      `Are you sure you want to delete page "${target.name}"?`
    )
  ) {
    return;
  }

  const remainingPages = pages
    .filter((p) => p.id !== pageIdToDelete)
    .map((p, idx) => ({
      ...p,
      isHome: idx === 0,
    }));

  setPages(remainingPages);

  if (activePageId === pageIdToDelete) {
    const nextActive = remainingPages[0];

    setActivePageId(nextActive.id);
    setElements(nextActive.elements || []);

    setPageSettings(
      nextActive.pageSettings || {
        title: nextActive.name,
        path: nextActive.slug,
      }
    );
  }

  setSaveMessage(`Deleted page "${target.name}".`);

  setTimeout(() => setSaveMessage(""), 3000);
};

const openEditPageModal = (
  page: PageConfig,
  e: React.MouseEvent
) => {
  e.stopPropagation();

  setEditingPageId(page.id);
  setEditPageName(page.name);
  setEditPageSlug(page.slug);

  setIsEditPageModalOpen(true);
  setIsPageSelectorOpen(false);
};

const handleSaveEditPage = () => {
  if (!editingPageId) return;

  const rawTitle = editPageName.trim();

  if (!rawTitle) return;

  const formattedSlug = editPageSlug.trim()
    ? editPageSlug.startsWith("/")
      ? editPageSlug
      : `/${editPageSlug}`
    : `/${rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;

  setPages((prev) =>
    prev.map((p) => {
      if (p.id === editingPageId) {
        const updatedSettings = {
          ...(p.pageSettings || {}),
          title: rawTitle,
          path: formattedSlug,
        };

        return {
          ...p,
          name: rawTitle,
          slug: formattedSlug,
          pageSettings: updatedSettings,
        };
      }

      return p;
    })
  );

  if (activePageId === editingPageId) {
    setPageSettings((prev) => ({
      ...prev,
      title: rawTitle,
      path: formattedSlug,
    }));
  }

  setIsEditPageModalOpen(false);
  setEditingPageId(null);

  setSaveMessage(`Page updated to "${rawTitle}"!`);

  setTimeout(() => setSaveMessage(""), 3000);
};

const navigate = useNavigate();

  // Quit Visual Editor Handler (F-024)
  const handleQuitEditor = () => {
    navigate("/dashboard");
  };

  // Editor UI Language State & Dictionary (F-022 & F-024)
  const [editorLanguage, setEditorLanguage] = useState<"en" | "es" | "fr" | "de">("en");

  const editorTranslations: Record<string, Record<string, string>> = {
    en: {
      save: "Save",
      saving: "Saving...",
      preview: "Preview",
      exitPreview: "Exit Preview",
      undo: "Undo",
      redo: "Redo",
      elements: "Elements",
      navigator: "Navigator",
      pageSettings: "Page Settings",
      container: "Container",
      heading: "Heading",
      text: "Text",
      image: "Image",
      button: "Button",
      properties: "Properties",
      editorLang: "Editor UI Language",
      siteLang: "Site Language (Published)",
      quitEditor: "Quit Editor",
    },
    es: {
      save: "Guardar",
      saving: "Guardando...",
      preview: "Vista Previa",
      exitPreview: "Salir de Vista Previa",
      undo: "Deshacer",
      redo: "Rehacer",
      elements: "Elementos",
      navigator: "Navegador",
      pageSettings: "Configuración de Página",
      container: "Contenedor",
      heading: "Encabezado",
      text: "Texto",
      image: "Imagen",
      button: "Botón",
      properties: "Propiedades",
      editorLang: "Idioma de Interfaz",
      siteLang: "Idioma del Sitio (Publicado)",
      quitEditor: "Salir del Editor",
    },
    fr: {
      save: "Enregistrer",
      saving: "Enregistrement...",
      preview: "Aperçu",
      exitPreview: "Quitter l'aperçu",
      undo: "Annuler",
      redo: "Rétablir",
      elements: "Éléments",
      navigator: "Navigateur",
      pageSettings: "Paramètres de Page",
      container: "Conteneur",
      heading: "Titre",
      text: "Texte",
      image: "Image",
      button: "Bouton",
      properties: "Propriétés",
      editorLang: "Langue de l'Éditeur",
      siteLang: "Langue du Site (Publié)",
      quitEditor: "Quitter l'éditeur",
    },
    de: {
      save: "Speichern",
      saving: "Speichern...",
      preview: "Vorschau",
      exitPreview: "Vorschau Beenden",
      undo: "Rückgängig",
      redo: "Wiederholen",
      elements: "Elemente",
      navigator: "Navigator",
      pageSettings: "Seiteneinstellungen",
      container: "Behälter",
      heading: "Überschrift",
      text: "Text",
      image: "Bild",
      button: "Schaltfläche",
      properties: "Eigenschaften",
      editorLang: "Editor-Sprache",
      siteLang: "Website-Sprache (Veröffentlicht)",
      quitEditor: "Editor Beenden",
    },
  };

  const t = (key: string, fallback: string) => {
    return editorTranslations[editorLanguage]?.[key] || fallback;
  };

  // Temporary Support Credentials State (F-020)
  const [supportToken, setSupportToken] = useState<string | null>(null);
  const [supportExpiresAt, setSupportExpiresAt] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportCopied, setSupportCopied] = useState(false);

  // Generate Support Token (F-020)
  const handleGenerateSupportToken = async () => {
    try {
      setIsGeneratingToken(true);
      setSupportMessage("");
      const res = await fetch(`${apiUrl}/api/v1/auth/support-token`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to generate support token.");

      setSupportToken(data.data.supportToken);
      setSupportExpiresAt(new Date(data.data.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setSupportMessage("Temporary 2-hr support credential generated!");
    } catch (err: any) {
      setSupportMessage(err.message || "Failed to generate support token.");
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Revoke Support Tokens (F-020)
  const handleRevokeSupportTokens = async () => {
    try {
      setSupportMessage("");
      const res = await fetch(`${apiUrl}/api/v1/auth/revoke-support-tokens`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to revoke support tokens.");

      setSupportToken(null);
      setSupportExpiresAt(null);
      setSupportMessage("All support credentials revoked.");
    } catch (err: any) {
      setSupportMessage(err.message || "Failed to revoke support tokens.");
    }
  };

  // Fetch Website Data
  useEffect(() => {
    if (!websiteId) return;

    const fetchWebsite = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        let loadedSite: any = null;
        try {
          const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            loadedSite = data.website || data;
          }
        } catch (netErr) {
          console.warn("Backend fetch failed, checking localStorage fallback...", netErr);
        }

        // Local Storage Fallback if backend fetch was non-OK or unavailable
        if (!loadedSite) {
          const cachedStr = localStorage.getItem(`forgestudio_editor_${websiteId}`);
          if (cachedStr) {
            try {
              const editorData = JSON.parse(cachedStr);
              loadedSite = { id: websiteId, name: "Local Website", editorData };
            } catch (e) {
              console.error("Failed to parse cached editor data:", e);
            }
          }
        }

        if (loadedSite) {
          setWebsite(loadedSite);

          // Fetch component accesses
          try {
            const accessRes = await fetch(`${apiUrl}/api/v1/component-access/${websiteId}/all`, {
              credentials: "include"
            });
            const accessData = await accessRes.json();
            if (accessRes.ok && accessData.accesses) {
              setAllowedComponentIds(new Set(accessData.accesses.map((a: any) => a.componentId)));
            }
          } catch (e) {
            console.error("Failed to fetch accesses", e);
          }

          // Initialize multi-page website pages
          let initialPages: PageConfig[] = [];
          if (loadedSite?.editorData?.pages && Array.isArray(loadedSite.editorData.pages) && loadedSite.editorData.pages.length > 0) {
            initialPages = loadedSite.editorData.pages.map((p: any, idx: number) => ({
              id: p.id || `page_${idx + 1}`,
              name: p.name || p.title || (idx === 0 ? "Home" : `Page ${idx + 1}`),
              slug: p.slug || p.path || (idx === 0 ? "/" : `/${(p.name || p.title || `page-${idx + 1}`).toLowerCase().replace(/\s+/g, "-")}`),
              elements: Array.isArray(p.elements) ? p.elements : [],
              pageSettings: p.pageSettings || { title: p.name || p.title || "Page", path: p.slug || p.path || "/" },
              customCss: p.customCss || "",
              isHome: Boolean(p.isHome || p.slug === "/" || p.path === "/" || idx === 0),
            }));
          } else {
            const defaultPageTitle = loadedSite?.editorData?.pageSettings?.title || loadedSite?.name || "Home";
            const defaultPagePath = loadedSite?.editorData?.pageSettings?.path || "/";
            initialPages = [
              {
                id: "home",
                name: defaultPageTitle,
                slug: defaultPagePath,
                elements: loadedSite?.editorData?.elements || [],
                pageSettings: loadedSite?.editorData?.pageSettings || { title: defaultPageTitle, path: defaultPagePath },
                isHome: true,
              },
            ];
          }
          setPages(initialPages);

          const initialHome = initialPages.find((p) => p.isHome || p.slug === "/" || p.id === "home") || initialPages[0];
          setActivePageId(initialHome.id);
          setActivePreviewPageId(initialHome.id);

          if (initialHome.elements && Array.isArray(initialHome.elements)) {
            setElements(initialHome.elements);
          } else if (loadedSite?.editorData?.elements && Array.isArray(loadedSite.editorData.elements)) {
            setElements(loadedSite.editorData.elements);
          } else {
            setElements([]);
          }

          if (initialHome.pageSettings) {
            setPageSettings((prev) => ({ ...prev, ...initialHome.pageSettings }));
          } else if (loadedSite?.editorData?.pageSettings) {
            setPageSettings((prev) => ({ ...prev, ...loadedSite.editorData.pageSettings }));
          } else if (loadedSite?.name) {
            setPageSettings((prev) => ({ ...prev, title: loadedSite.name }));
          }

          if (loadedSite?.editorData?.breakpoints && Array.isArray(loadedSite.editorData.breakpoints)) {
            setBreakpoints(loadedSite.editorData.breakpoints);
          }

          if (loadedSite?.editorData?.globalSettings) {
            setGlobalSettings(loadedSite.editorData.globalSettings);
          }

          if (loadedSite?.editorData?.pageCss) {
            setPageCss(loadedSite.editorData.pageCss);
          }
        } else {
          // Default empty initialization if completely fresh project
          const defaultHome: PageConfig = {
            id: "home",
            name: "Home",
            slug: "/",
            elements: [],
            pageSettings: { title: "Home", path: "/" },
            isHome: true,
          };
          setPages([defaultHome]);
          setActivePageId("home");
          setElements([]);
        }
      } catch (err) {
        console.error("Error loading website:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebsite();
  }, [websiteId, apiUrl]);

  // F-321 Autosave Integration
  const {
    status: autosaveStatus,
    lastSavedAt: autosaveLastSavedAt,
    errorMessage: autosaveError,
    updateBaseline: updateAutosaveBaseline,
  } = useAutosave({
    websiteId,
    elements,
    pageSettings,
    pages,
    apiUrl,
    isLoadingWebsite: loading,
  });

  // F-322 / F-334 Save & Update Template Integration
  const {
    isOpen: isSaveTemplateOpen,
    isUpdateMode: isSaveTemplateUpdateMode,
    name: saveTemplateName,
    setName: setSaveTemplateName,
    description: saveTemplateDescription,
    setDescription: setSaveTemplateDescription,
    type: saveTemplateType,
    setType: setSaveTemplateType,
    category: saveTemplateCategory,
    setCategory: setSaveTemplateCategory,
    isSaving: isSavingTemplate,
    error: saveTemplateError,
    validationError: saveTemplateValidationError,
    successMessage: saveTemplateSuccessMessage,
    openDialog: openSaveTemplateDialog,
    closeDialog: closeSaveTemplateDialog,
    handleSave: handleSaveTemplateSubmit,
  } = useSaveTemplate({ apiUrl });

  // F-335 & F-336 Website Kit Export & Import State & Logic
  const [isImportWebsiteKitOpen, setIsImportWebsiteKitOpen] = useState(false);

  const handleExportWebsiteKit = () => {
    try {
      exportWebsiteKitAsJson({
        website,
        elements,
        pageSettings,
        templates: libraryTemplates,
      });
      setSaveMessage("Website Kit exported successfully!");
      setTimeout(() => setSaveMessage(""), 3500);
    } catch (err: any) {
      setErrorMessage("Failed to export Website Kit.");
      setTimeout(() => setErrorMessage(""), 3500);
    }
  };

  const handleConfirmImportWebsiteKit = (kitData: {
    website: { name: string; description?: string; settings?: Record<string, any> };
    pages: Array<{
      id: string;
      title: string;
      path: string;
      elements: any[];
      pageSettings: Record<string, any>;
    }>;
    templates: any[];
  }) => {
    if (kitData.pages && kitData.pages.length > 0) {
      const importedPages: PageConfig[] = kitData.pages.map((p, idx) => ({
        id: p.id || `page_${idx + 1}`,
        name: p.title || `Page ${idx + 1}`,
        slug: p.path || (idx === 0 ? "/" : `/${p.title?.toLowerCase().replace(/\s+/g, "-")}`),
        elements: p.elements || [],
        pageSettings: p.pageSettings || {},
        isHome: idx === 0,
      }));
      setPages(importedPages);
      const mainPage = importedPages[0];
      setActivePageId(mainPage.id);
      setActivePreviewPageId(mainPage.id);
      setElements(JSON.parse(JSON.stringify(mainPage.elements || [])));
      if (mainPage.pageSettings) {
        setPageSettings((prev) => ({ ...prev, ...mainPage.pageSettings }));
      }
    }
    if (kitData.website?.name) {
      setWebsite((prev: any) => (prev ? { ...prev, name: kitData.website.name } : { name: kitData.website.name }));
    }
    setSaveMessage("Website Kit imported successfully!");
    setTimeout(() => setSaveMessage(""), 3500);
  };

  // F-332 Template Replacement State & Logic
  const { templates: libraryTemplates } = useTemplateLibrary({ apiUrl });
  const [isReplaceTemplateOpen, setIsReplaceTemplateOpen] = useState(false);

  const handleOpenReplaceTemplate = () => {
    if (!selectedId) {
      setSaveMessage("Please select an element or section to replace.");
      setTimeout(() => setSaveMessage(""), 3500);
      return;
    }
    setIsReplaceTemplateOpen(true);
  };

  const handleConfirmReplaceTemplate = (template: Template) => {
    if (!selectedId) return;

    const templateElements = template.templateData?.elements;
    if (!templateElements || !Array.isArray(templateElements) || templateElements.length === 0) {
      setSaveMessage("Selected template contains no elements.");
      setTimeout(() => setSaveMessage(""), 3500);
      return;
    }

    const cloneAndReassign = (list: EditorElement[]): EditorElement[] => {
      const cloned: EditorElement[] = JSON.parse(JSON.stringify(list));
      const reassignIds = (node: EditorElement): EditorElement => {
        const newNode: EditorElement = {
          ...node,
          id: generateId(),
        };
        if (newNode.children && Array.isArray(newNode.children)) {
          newNode.children = newNode.children.map(reassignIds);
        }
        return newNode;
      };
      return cloned.map(reassignIds);
    };

    const freshElements = cloneAndReassign(templateElements);

    const replaceTreeElement = (
      list: EditorElement[],
      targetId: string,
      replacements: EditorElement[]
    ): EditorElement[] => {
      const result: EditorElement[] = [];
      for (const item of list) {
        if (item.id === targetId) {
          result.push(...replacements);
        } else {
          const newItem = { ...item };
          if (newItem.children && Array.isArray(newItem.children)) {
            newItem.children = replaceTreeElement(newItem.children, targetId, replacements);
          }
          result.push(newItem);
        }
      }
      return result;
    };

    const updatedElements = replaceTreeElement(elements, selectedId, freshElements);

    setElements(updatedElements);

    if (freshElements.length > 0) {
      setSelectedId(freshElements[0].id);
      setSelectedIds([freshElements[0].id]);
    }

    setSaveMessage(`Replaced element with template "${template.name}" successfully!`);
    setTimeout(() => setSaveMessage(""), 3500);
  };


  // F-323 Template Library Insertion Logic
  const handleInsertTemplate = (template: Template) => {
    const templateElements = template.templateData?.elements;
    if (!templateElements || !Array.isArray(templateElements) || templateElements.length === 0) {
      setSaveMessage("Template contains no elements.");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    // Deep clone template elements & recursively generate new unique IDs
    const cloneAndReassign = (list: EditorElement[]): EditorElement[] => {
      const cloned: EditorElement[] = JSON.parse(JSON.stringify(list));
      const reassignIds = (node: EditorElement): EditorElement => {
        const newNode: EditorElement = {
          ...node,
          id: generateId(),
        };
        if (newNode.children && Array.isArray(newNode.children)) {
          newNode.children = newNode.children.map(reassignIds);
        }
        return newNode;
      };
      return cloned.map(reassignIds);
    };

    const freshElements = cloneAndReassign(templateElements);
    let updatedElements = [...elements];
    let lastInsertedId: string | null = null;

    freshElements.forEach((el) => {
      updatedElements = insertTreeElement(updatedElements, selectedId, el);
      lastInsertedId = el.id;
    });

    setElements(updatedElements);

    if (lastInsertedId) {
      setSelectedId(lastInsertedId);
      setSelectedIds([lastInsertedId]);
    }

    setSaveMessage(`Inserted template "${template.name}" successfully!`);
    setTimeout(() => setSaveMessage(""), 3500);
  };

  // Atomic Editor Global Element Insertion
  const handleInsertGlobalElement = (globalElementId: string) => {
    const globalElements = GlobalElementService.getGlobalElements();
    const target = globalElements.find((ge) => ge.id === globalElementId);
    if (!target) return;

    const newEl: EditorElement = {
      id: generateId(),
      type: (target.elementType || "button") as ElementType,
      content: target.content || "",
      styles: target.styles ? { ...target.styles } : {},
      classes: target.classes ? [...target.classes] : [],
    };

    const effectiveTargetId = selectedId;
    setElements((prev) => insertTreeElement(prev, effectiveTargetId, newEl));
    setSelectedId(newEl.id);
    setSelectedIds([newEl.id]);
    setSaveMessage(`Inserted Global Element "${target.name}"!`);
    setTimeout(() => setSaveMessage(""), 3000);
  };

  // Atomic Editor Reusable Component Insertion
  const handleInsertReusableComponent = (componentId: string) => {
    const components = ReusableComponentService.getComponents();
    const target = components.find((c) => c.id === componentId);
    if (!target || !target.rootElement) return;

    const mapNodeToElement = (node: any): EditorElement => {
      return {
        id: generateId(),
        type: (node.type || "container") as ElementType,
        content: node.content || "",
        styles: node.styles ? { ...node.styles } : {},
        classes: node.classes ? [...node.classes] : [],
        children: node.children && Array.isArray(node.children) ? node.children.map(mapNodeToElement) : [],
      };
    };

    const rootEditorEl = mapNodeToElement(target.rootElement);
    const effectiveTargetId = selectedId;
    setElements((prev) => insertTreeElement(prev, effectiveTargetId, rootEditorEl));
    setSelectedId(rootEditorEl.id);
    setSelectedIds([rootEditorEl.id]);
    setSaveMessage(`Inserted Component "${target.name}"!`);
    setTimeout(() => setSaveMessage(""), 3000);
  };



  // Save Website Data
  const handleSave = async () => {
    if (!websiteId) return;

    try {
      setSaving(true);
      setSaveMessage("");
      setErrorMessage("");

      const payload = {
        editorData: {
          version: 1,
          elements,
          pages,
          breakpoints,
          globalSettings,
          popups,
          pageCss,
          pageSettings,
        },
      };

      // 1. Always save locally immediately
      try {
        localStorage.setItem(`forgestudio_editor_${websiteId}`, JSON.stringify(payload.editorData));
      } catch (lsErr) {
        console.warn("Failed to write to localStorage:", lsErr);
      }

      // 2. Attempt backend API save
      try {
        const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.warn("Backend save returned non-OK status, saved locally.");
        }
      } catch (netErr) {
        console.warn("Backend save request failed, saved locally:", netErr);
      }

      // Update F-321 Autosave baseline on successful save
      updateAutosaveBaseline(elements, pageSettings, pages);

      // Create F-320 Revision History snapshot
      try {
        revisionHistoryService.saveRevision(websiteId, elements, pageSettings, "Saved website design");
      } catch (revErr) {
        console.error("Failed to save revision snapshot:", revErr);
      }

      setSaveMessage("Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: any) {
      setSaveMessage("Saved locally!");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Element Actions
  const handleAddElement = (type: ElementType, targetId: string | null = null) => {
    if (disabledWidgets.includes(type)) return;
    const effectiveTargetId = targetId || selectedId;
    const newEl = createDefaultElement(type);
    setElements((prev) => insertTreeElement(prev, effectiveTargetId, newEl));
    setSelectedId(newEl.id);
    setSelectedIds([newEl.id]);
  };

  const handleDropElement = (
    e: React.DragEvent,
    targetId: string | null = null,
    position: "before" | "after" | "inside" | null = null
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const dataString = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
    setDropTargetId(null);
    setDropPosition(null);
    setDraggingId(null);

    if (!dataString) return;

    try {
      const data = JSON.parse(dataString);
      if (data.type === "new" && data.widgetType) {
        if (disabledWidgets.includes(data.widgetType as ElementType)) return;
        const newEl = createDefaultElement(data.widgetType as ElementType);
        setElements((prev) => insertTreeElementAtPosition(prev, targetId, position || "after", newEl));
        setSelectedId(newEl.id);
        setSelectedIds([newEl.id]);
      } else if (data.type === "move" && data.id) {
        if (targetId && data.id === targetId) return;
        setElements((prev) => moveTreeElement(prev, data.id, targetId, position || "after"));
        setSelectedId(data.id);
        setSelectedIds([data.id]);
      }
    } catch (err) {
      console.error("Drag and drop parse error:", err);
    }
  };

  const handleDragOverElement = (
    e: React.DragEvent,
    elId: string,
    isContainer: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    let pos: "before" | "after" | "inside" = "after";
    if (isContainer && offsetY > height * 0.25 && offsetY < height * 0.75) {
      pos = "inside";
    } else if (offsetY < height * 0.5) {
      pos = "before";
    } else {
      pos = "after";
    }

    setDropTargetId(elId);
    setDropPosition(pos);
  };

  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setElements((prev) => deleteTreeElement(prev, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleDuplicateElement = (idToDuplicate?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetId = idToDuplicate || selectedId;
    if (!targetId) return;

    const { updatedList, newId } = duplicateTreeElement(elements, targetId);
    setElements(updatedList);
    if (newId) {
      setSelectedId(newId);
    }
  };

  const handleCopyElement = (idToCopy?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIds.length > 1 && (!idToCopy || selectedIds.includes(idToCopy))) {
      const targets = selectedIds
        .map((id) => findTreeElement(elements, id))
        .filter((item): item is EditorElement => item !== null);
      if (targets.length > 0) {
        const clonedList: EditorElement[] = JSON.parse(JSON.stringify(targets));
        setCopiedElements(clonedList);
        setCopiedElement(clonedList[clonedList.length - 1]);
      }
      return;
    }

    const targetId = idToCopy || selectedId;
    if (!targetId) return;
    const targetEl = findTreeElement(elements, targetId);
    if (targetEl) {
      const cloned: EditorElement = JSON.parse(JSON.stringify(targetEl));
      setCopiedElement(cloned);
      setCopiedElements([cloned]);
    }
    void copiedElements;
  };

  const handleCopyStyle = (idToCopy?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetId = idToCopy || selectedId;
    if (!targetId) return;
    const targetEl = findTreeElement(elements, targetId);
    if (targetEl) {
      setCopiedStyles({
        styles: JSON.parse(JSON.stringify(targetEl.styles || {})),
        responsiveStyles: JSON.parse(JSON.stringify(targetEl.responsiveStyles || {})),
        hoverStyles: targetEl.hoverStyles ? JSON.parse(JSON.stringify(targetEl.hoverStyles)) : undefined,
        responsiveHoverStyles: targetEl.responsiveHoverStyles ? JSON.parse(JSON.stringify(targetEl.responsiveHoverStyles)) : undefined,
      });
    }
  };

  const handlePasteStyle = (idToPaste?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetId = idToPaste || selectedId;
    if (!targetId || !copiedStyles) return;
    setElements((prev) =>
      updateTreeElement(prev, targetId, (el) => ({
        ...el,
        styles: {
          ...el.styles,
          ...JSON.parse(JSON.stringify(copiedStyles.styles || {})),
        },
        responsiveStyles: {
          ...el.responsiveStyles,
          ...JSON.parse(JSON.stringify(copiedStyles.responsiveStyles || {})),
        },
        hoverStyles: copiedStyles.hoverStyles
          ? { ...el.hoverStyles, ...JSON.parse(JSON.stringify(copiedStyles.hoverStyles)) }
          : el.hoverStyles,
        responsiveHoverStyles: copiedStyles.responsiveHoverStyles
          ? { ...el.responsiveHoverStyles, ...JSON.parse(JSON.stringify(copiedStyles.responsiveHoverStyles)) }
          : el.responsiveHoverStyles,
      }))
    );
  };

  const handlePasteElement = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!copiedElement) return;

    const clonedItem: EditorElement = JSON.parse(JSON.stringify(copiedElement));
    const reassignIds = (node: EditorElement) => {
      node.id = generateId();
      if (node.children) {
        node.children.forEach(reassignIds);
      }
    };
    reassignIds(clonedItem);

    setElements((prev) => insertTreeElement(prev, selectedId, clonedItem));
    setSelectedId(clonedItem.id);
  };

  const updateElementContent = (id: string, newContent: string) => {
    setElements((prev) =>
      updateTreeElement(prev, id, (el) => ({ ...el, content: newContent }))
    );
  };

  // Keyboard Shortcuts Listener (F-025: Save, Delete, Preview, Undo, Redo, Copy, Paste, Duplicate, Section Move, F-027: Finder, F-031: Shortcuts Help)
  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [finderQuery, setFinderQuery] = useState("");
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsFinderOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      if (e.key === "Escape") {
        if (isShortcutsHelpOpen) {
          e.preventDefault();
          setIsShortcutsHelpOpen(false);
        } else if (isFinderOpen) {
          e.preventDefault();
          setIsFinderOpen(false);
        } else if (isFullScreenCanvas) {
          e.preventDefault();
          setIsFullScreenCanvas(false);
        }
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsPreview((prev) => !prev);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          handleDeleteElement(selectedId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedId || selectedIds.length > 0) {
          e.preventDefault();
          handleCopyElement();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (copiedElement) {
          e.preventDefault();
          handlePasteElement();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedId) {
          e.preventDefault();
          handleDuplicateElement(selectedId);
        }
      } else if (e.altKey && e.key === "ArrowUp") {
        if (selectedId) {
          e.preventDefault();
          handleReorderElement(selectedId, "up");
        }
      } else if (e.altKey && e.key === "ArrowDown") {
        if (selectedId) {
          e.preventDefault();
          handleReorderElement(selectedId, "down");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedIds, copiedElement, elements, historyIndex, history, isFullScreenCanvas, isPreview, saving]);

  useEffect(() => {
    if (selectedElement && selectedElement.componentId) {
      syncComponentInstances(selectedElement.componentId, selectedElement);
    }
  }, [selectedElement?.content, selectedElement?.src, selectedElement?.styles, selectedElement?.layout, selectedElement?.responsiveStyles, selectedElement?.responsiveLayout]);

  const updateSelectedProp = (key: keyof EditorElement, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => ({ ...el, [key]: value }))
    );
  };

  const updateSelectedStyle = (key: keyof ElementStyles, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        if (activeElementState === "hover") {
          if (activeDevice === "desktop") {
            const newHoverStyles = { ...(el.hoverStyles || {}), [key]: value };
            let newResponsiveHover = el.responsiveHoverStyles;
            if (newResponsiveHover?.desktop) {
              newResponsiveHover = {
                ...newResponsiveHover,
                desktop: { ...newResponsiveHover.desktop, [key]: value },
              };
            }
            return { ...el, hoverStyles: newHoverStyles, responsiveHoverStyles: newResponsiveHover };
          } else {
            const currentDeviceObj = el.responsiveHoverStyles?.[activeDevice] || {};
            const updatedDeviceObj = { ...currentDeviceObj, [key]: value };
            return {
              ...el,
              responsiveHoverStyles: {
                ...el.responsiveHoverStyles,
                [activeDevice]: updatedDeviceObj,
              },
            };
          }
        } else {
          if (activeDevice === "desktop") {
            const newStyles = { ...el.styles, [key]: value };
            let newResponsive = el.responsiveStyles;
            if (newResponsive?.desktop) {
              newResponsive = {
                ...newResponsive,
                desktop: { ...newResponsive.desktop, [key]: value },
              };
            }
            return { ...el, styles: newStyles, responsiveStyles: newResponsive };
          } else {
            const currentDeviceObj = el.responsiveStyles?.[activeDevice] || {};
            const updatedDeviceObj = { ...currentDeviceObj, [key]: value };
            return {
              ...el,
              responsiveStyles: {
                ...el.responsiveStyles,
                [activeDevice]: updatedDeviceObj,
              },
            };
          }
        }
      })
    );
  };

  const resetSelectedStyle = (key: keyof ElementStyles) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        if (activeElementState === "hover") {
          if (activeDevice === "desktop") {
            const newHoverStyles = { ...(el.hoverStyles || {}) };
            delete newHoverStyles[key];
            let newResponsiveHover = el.responsiveHoverStyles;
            if (newResponsiveHover?.desktop) {
              const newDesktopResp = { ...newResponsiveHover.desktop };
              delete newDesktopResp[key];
              newResponsiveHover = { ...newResponsiveHover, desktop: newDesktopResp };
            }
            return {
              ...el,
              hoverStyles: Object.keys(newHoverStyles).length > 0 ? newHoverStyles : undefined,
              responsiveHoverStyles: newResponsiveHover,
            };
          } else {
            if (!el.responsiveHoverStyles?.[activeDevice]) return el;
            const currentDeviceObj = { ...el.responsiveHoverStyles[activeDevice] };
            delete currentDeviceObj[key];
            const newResponsiveHover = {
              ...el.responsiveHoverStyles,
              [activeDevice]: currentDeviceObj,
            };
            if (Object.keys(currentDeviceObj).length === 0) {
              delete newResponsiveHover[activeDevice];
            }
            return { ...el, responsiveHoverStyles: newResponsiveHover };
          }
        } else {
          if (activeDevice === "desktop") {
            const newStyles = { ...el.styles };
            delete newStyles[key];
            let newResponsive = el.responsiveStyles;
            if (newResponsive?.desktop) {
              const newDesktopResp = { ...newResponsive.desktop };
              delete newDesktopResp[key];
              newResponsive = { ...newResponsive, desktop: newDesktopResp };
            }
            return { ...el, styles: newStyles, responsiveStyles: newResponsive };
          } else {
            if (!el.responsiveStyles?.[activeDevice]) return el;
            const currentDeviceObj = { ...el.responsiveStyles[activeDevice] };
            delete currentDeviceObj[key];
            const newResponsive = {
              ...el.responsiveStyles,
              [activeDevice]: currentDeviceObj,
            };
            if (Object.keys(currentDeviceObj).length === 0) {
              delete newResponsive[activeDevice];
            }
            return { ...el, responsiveStyles: newResponsive };
          }
        }
      })
    );
  };

  const toggleContainerCollapse = (id: string) => {
    setCollapsedContainers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleReorderElement = (id: string, direction: "up" | "down") => {
    setElements((prev) => reorderTreeElement(prev, id, direction));
  };

  const flattenAndSearchElements = (
    nodes: EditorElement[],
    query: string,
    parentPath: string[] = []
  ): { element: EditorElement; path: string }[] => {
    let results: { element: EditorElement; path: string }[] = [];
    const q = query.toLowerCase().trim();

    for (const node of nodes) {
      const currentPath = [...parentPath, node.type];
      const pathStr = currentPath.join(" › ");
      const matchesType = node.type.toLowerCase().includes(q);
      const matchesContent = node.content?.toLowerCase().includes(q) ?? false;
      const matchesAlt = node.alt?.toLowerCase().includes(q) ?? false;
      const matchesId = node.id.toLowerCase().includes(q);

      if (matchesType || matchesContent || matchesAlt || matchesId) {
        results.push({ element: node, path: pathStr });
      }

      if (node.children && node.children.length > 0) {
        results = results.concat(flattenAndSearchElements(node.children, q, currentPath));
      }
    }

    return results;
  };

  const renderNavigatorTreeItem = (el: EditorElement, depth: number = 0, isLast: boolean = true): React.ReactNode => {
    const isSelected = selectedIds.includes(el.id) || selectedId === el.id;
    const isContainer = el.type === "container";
    const isCollapsed = isContainer && !!collapsedContainers[el.id];

    const getElementIcon = (type: ElementType) => {
      switch (type) {
        case "container":
          return "📦";
        case "heading":
          return "🔤";
        case "text":
          return "📝";
        case "image":
          return "🖼️";
        case "button":
          return "🔘";
        case "posts":
          return "📰";
        case "wc-product-title":
      return <WcProductTitleWidgetRenderer el={el} getMergedStyles={getMergedStyles} activeDevice={activeDevice} />;
    case "wc-product-price":
      return <WcProductPriceWidgetRenderer el={el} getMergedStyles={getMergedStyles} activeDevice={activeDevice} />;
    case "wc-product-images":
      return <WcProductImagesWidgetRenderer el={el} getMergedStyles={getMergedStyles} activeDevice={activeDevice} />;
    case "wc-add-to-cart":
      return <WcAddToCartWidgetRenderer el={el} getMergedStyles={getMergedStyles} activeDevice={activeDevice} />;
    case "wc-product-rating":
      return <WcProductRatingWidgetRenderer el={el} getMergedStyles={getMergedStyles} activeDevice={activeDevice} />;
    case "share-buttons":
          return "🔗";
        case "portfolio":
          return "💼";
        case "slides":
          return "🎠";
        default:
          return "📄";
      }
    };

    const getElementLabel = (item: EditorElement) => {
      if (item.type === "heading") return item.content ? `"${item.content.slice(0, 15)}"` : "Heading";
      if (item.type === "text") return item.content ? `"${item.content.slice(0, 15)}"` : "Text";
      if (item.type === "button") return item.content ? `"${item.content.slice(0, 15)}"` : "Button";
      if (item.type === "image") return item.alt ? `Image (${item.alt})` : "Image";
      if (item.type === "container") return "Container";
      if (item.type === "posts") return item.posts ? `Posts (${item.posts.length})` : "Posts Widget";
      if (item.type === "share-buttons") return item.shareNetworks ? `Share (${item.shareNetworks.length})` : "Share Buttons";
      if (item.type === "portfolio") return item.portfolioItems ? `Portfolio (${item.portfolioItems.length})` : "Portfolio Widget";
      if (item.type === "slides") return item.slidesItems ? `Slides (${item.slidesItems.length})` : "Slides Widget";
      return item.type;
    };

    return (
      <div key={el.id} className="select-none">
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleSelectElement(el.id, e);
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            setHoveredId(el.id);
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            if (hoveredId === el.id) setHoveredId(null);
          }}
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
          className={`group flex items-center justify-between rounded-lg py-1.5 pr-2 text-xs transition cursor-pointer mb-0.5 ${
            isSelected
              ? "bg-blue-600 font-bold text-white shadow-sm"
              : hoveredId === el.id
              ? "bg-blue-50 text-blue-700 font-semibold"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {/* Visual Tree Branch Connectors (F-021) */}
            {depth > 0 && (
              <span className="font-mono text-slate-400 text-[10px] shrink-0 select-none">
                {isLast ? "└──" : "├──"}
              </span>
            )}

            {isContainer ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleContainerCollapse(el.id);
                }}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] transition ${
                  isSelected ? "text-white hover:bg-blue-700" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                }`}
              >
                {isCollapsed ? "▶" : "▼"}
              </button>
            ) : (
              <span className="w-2 shrink-0" />
            )}

            <span className="shrink-0 text-[11px]">{getElementIcon(el.type)}</span>
            <span className="truncate text-[11px] font-medium capitalize">{getElementLabel(el)}</span>
          </div>

          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
            <button
              type="button"
              title="Copy"
              onClick={(e) => handleCopyElement(el.id, e)}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-black/10 ${
                isSelected ? "text-white" : "text-slate-500"
              }`}
            >
              📋
            </button>
            <button
              type="button"
              title="Duplicate"
              onClick={(e) => handleDuplicateElement(el.id, e)}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-black/10 ${
                isSelected ? "text-white" : "text-slate-500"
              }`}
            >
              ⧉
            </button>
            <button
              type="button"
              title="Move Up"
              onClick={(e) => {
                e.stopPropagation();
                handleReorderElement(el.id, "up");
              }}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-black/10 ${
                isSelected ? "text-white" : "text-slate-500"
              }`}
            >
              ▲
            </button>
            <button
              type="button"
              title="Move Down"
              onClick={(e) => {
                e.stopPropagation();
                handleReorderElement(el.id, "down");
              }}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-black/10 ${
                isSelected ? "text-white" : "text-slate-500"
              }`}
            >
              ▼
            </button>
            <button
              type="button"
              title="Delete"
              onClick={(e) => handleDeleteElement(el.id, e)}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-red-500 hover:text-white ${
                isSelected ? "text-red-200" : "text-red-500"
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Render Nested Children if container is expanded */}
        {isContainer && !isCollapsed && el.children && el.children.length > 0 && (
          <div className="space-y-0.5">
            {el.children.map((child, idx) =>
              renderNavigatorTreeItem(
                child,
                depth + 1,
                idx === (el.children?.length ?? 0) - 1
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const updateSelectedLayout = (key: keyof ContainerLayout, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        if (activeDevice === "desktop") {
          const newLayout = { ...(el.layout || {}), [key]: value };
          let newResponsiveLayout = el.responsiveLayout;
          if (newResponsiveLayout?.desktop) {
            newResponsiveLayout = {
              ...newResponsiveLayout,
              desktop: { ...newResponsiveLayout.desktop, [key]: value },
            };
          }
          return { ...el, layout: newLayout, responsiveLayout: newResponsiveLayout };
        } else {
          const currentDeviceObj = el.responsiveLayout?.[activeDevice] || {};
          const updatedDeviceObj = { ...currentDeviceObj, [key]: value };
          return {
            ...el,
            responsiveLayout: {
              ...el.responsiveLayout,
              [activeDevice]: updatedDeviceObj,
            },
          };
        }
      })
    );
  };





  const ScrubbableNumberInput = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    placeholder = "0",
    className = "w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500",
  }: {
    value: string | number;
    onChange: (val: string) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    className?: string;
  }) => {
    const [isScrubbing, setIsScrubbing] = useState(false);
    const startXRef = useRef(0);
    const startValRef = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const initialVal = typeof value === "number" ? value : parseFloat(String(value)) || 0;
      startXRef.current = e.clientX;
      startValRef.current = initialVal;
      setIsScrubbing(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;
        let multiplier = step;
        if (moveEvent.shiftKey) multiplier = step * 10;
        if (moveEvent.altKey || moveEvent.ctrlKey) multiplier = step * 0.1;

        let newVal = startValRef.current + deltaX * multiplier;
        if (min !== undefined) newVal = Math.max(min, newVal);
        if (max !== undefined) newVal = Math.min(max, newVal);

        const roundedVal = step < 1 ? Math.round(newVal * 10) / 10 : Math.round(newVal);
        onChange(String(roundedVal));
      };

      const handleMouseUp = () => {
        setIsScrubbing(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    return (
      <div className="relative flex items-center w-full group">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${className} ${isScrubbing ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50" : ""}`}
        />
        <div
          onMouseDown={handleMouseDown}
          title="Drag horizontally to scrub value (Shift for 10x, Alt for 0.1x)"
          className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-ew-resize px-0.5 text-[9px] font-bold text-slate-400 hover:text-blue-600 transition select-none"
        >
          ↔
        </div>
      </div>
    );
  };

  const render4SideSpacingControl = (
    title: string,
    type: "margin" | "padding",
    isLinked: boolean,
    setIsLinked: (val: boolean) => void
  ) => {
    const topKey = (type === "margin" ? "marginTop" : "paddingTop") as keyof ElementStyles;
    const rightKey = (type === "margin" ? "marginRight" : "paddingRight") as keyof ElementStyles;
    const bottomKey = (type === "margin" ? "marginBottom" : "paddingBottom") as keyof ElementStyles;
    const leftKey = (type === "margin" ? "marginLeft" : "paddingLeft") as keyof ElementStyles;

    const handleSideChange = (sideKey: keyof ElementStyles, numVal: string, unitVal: string) => {
      const formattedVal = numVal.trim() === "" ? "" : `${numVal}${unitVal}`;
      if (isLinked) {
        updateSelectedStyle(topKey, formattedVal);
        updateSelectedStyle(rightKey, formattedVal);
        updateSelectedStyle(bottomKey, formattedVal);
        updateSelectedStyle(leftKey, formattedVal);
      } else {
        updateSelectedStyle(sideKey, formattedVal);
      }
    };

    const handleUnitChange = (newUnit: string) => {
      const applyUnit = (sideKey: keyof ElementStyles) => {
        if (!selectedElement) return;
        const cur = getControlStyleValue(selectedElement, activeDevice, activeElementState, sideKey);
        const parsed = parseSpacingUnit(String(cur || ""));
        if (parsed.num) {
          updateSelectedStyle(sideKey, `${parsed.num}${newUnit}`);
        }
      };
      applyUnit(topKey);
      applyUnit(rightKey);
      applyUnit(bottomKey);
      applyUnit(leftKey);
    };

    const handleResetAll = () => {
      resetSelectedStyle(topKey);
      resetSelectedStyle(rightKey);
      resetSelectedStyle(bottomKey);
      resetSelectedStyle(leftKey);
    };

    return (
      <SpacingControl
        title={title}
        type={type}
        isLinked={isLinked}
        setIsLinked={setIsLinked}
        selectedElement={selectedElement}
        activeDevice={activeDevice}
        activeElementState={activeElementState}
        handleSideChange={handleSideChange}
        handleUnitChange={handleUnitChange}
        handleResetAll={handleResetAll}
      />
    );
  };

  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  useEffect(() => {
    if (selectedElement && (selectedElement.type === "image" || selectedElement.src)) {
      const srcToUse = selectedElement.src;
      if (srcToUse) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            canvas.width = 40;
            canvas.height = 40;
            ctx.drawImage(img, 0, 0, 40, 40);
            const imgData = ctx.getImageData(0, 0, 40, 40).data;
            const hexColors = new Set<string>();
            for (let i = 0; i < imgData.length; i += 16) {
              const r = imgData[i];
              const g = imgData[i + 1];
              const b = imgData[i + 2];
              const a = imgData[i + 3];
              if (a > 128) {
                const hex = "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
                hexColors.add(hex);
              }
              if (hexColors.size >= 5) break;
            }
            setExtractedColors(Array.from(hexColors));
          } catch {
            setExtractedColors([]);
          }
        };
        img.onerror = () => setExtractedColors([]);
        img.src = resolveImageUrl(srcToUse, apiUrl);
      } else {
        setExtractedColors([]);
      }
    } else {
      setExtractedColors([]);
    }
  }, [selectedElement?.id, selectedElement?.src]);

  // Image File Upload Logic
  const handleImageFileSelect = async (file: File) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a valid image file (JPG, PNG, WEBP, GIF, SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      let finalUrl = "";
      try {
        const formData = new FormData();
        formData.append("image", file);

        let uploadRes = await fetch(`${apiUrl}/api/v1/uploads/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadRes.ok && uploadRes.status === 404) {
          uploadRes = await fetch(`${apiUrl}/api/uploads/image`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
        }

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalUrl = uploadData.url || uploadData?.data?.url || "";
        }
      } catch {
        // Fallback to local Data URL
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image file."));
          reader.readAsDataURL(file);
        });
      }

      if (finalUrl) {
        updateSelectedProp("src", finalUrl);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err?.message || "Failed to process image file.");
    } finally {
      setIsUploading(false);
    }
  };

  // YouTube & Vimeo Embed Helpers (F-208 Video Widget)
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.trim().match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getVimeoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
    const match = url.trim().match(regExp);
    return match ? match[1] : null;
  };

  // Video File Upload Logic (F-208 Video Widget)
  const handleVideoFileSelect = async (file: File) => {
    if (!file) return;

    const validTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!validTypes.includes(file.type) && !file.type.startsWith("video/")) {
      setUploadError("Please select a valid video file (MP4, WEBM, OGG, MOV).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Video file size must be less than 50 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      let finalUrl = "";
      try {
        const formData = new FormData();
        formData.append("video", file);

        let uploadRes = await fetch(`${apiUrl}/api/v1/uploads/video`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadRes.ok && uploadRes.status === 404) {
          uploadRes = await fetch(`${apiUrl}/api/uploads/video`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
        }

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalUrl = uploadData.url || uploadData?.data?.url || "";
        }
      } catch {
        // Fallback to FileReader / Data URL
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read video file."));
          reader.readAsDataURL(file);
        });
      }

      if (finalUrl) {
        updateSelectedProp("src", finalUrl);
      }
    } catch (err: any) {
      console.error("Video upload error:", err);
      setUploadError(err?.message || "Failed to process video file.");
    } finally {
      setIsUploading(false);
    }
  };

  // Video Poster Image Upload Logic (F-208 Video Widget)
  const handleVideoPosterSelect = async (file: File) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a valid image file for video poster.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      let finalUrl = "";
      try {
        const formData = new FormData();
        formData.append("image", file);

        let uploadRes = await fetch(`${apiUrl}/api/v1/uploads/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalUrl = uploadData.url || uploadData?.data?.url || "";
        }
      } catch {
        // Fallback
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read poster image."));
          reader.readAsDataURL(file);
        });
      }

      if (finalUrl) {
        updateSelectedProp("videoPoster", finalUrl);
      }
    } catch (err: any) {
      console.error("Poster upload error:", err);
      setUploadError(err?.message || "Failed to process poster image.");
    } finally {
      setIsUploading(false);
    }
  };

  // File & Asset Import Logic (F-014)
  const handleImportAsset = async (file: File) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid file type. Supported: JPG, PNG, WEBP, GIF, SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Imported asset size must be less than 5 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      let finalUrl = "";
      try {
        const formData = new FormData();
        formData.append("image", file);

        let uploadRes = await fetch(`${apiUrl}/api/v1/uploads/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadRes.ok && uploadRes.status === 404) {
          uploadRes = await fetch(`${apiUrl}/api/uploads/image`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
        }

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalUrl = uploadData.url || uploadData?.data?.url || "";
        }
      } catch {
        // Fallback to local Data URL
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read imported file."));
          reader.readAsDataURL(file);
        });
      }

      if (selectedId) {
        const selected = findTreeElement(elements, selectedId);
        if (selected && selected.type === "image") {
          updateSelectedProp("src", finalUrl);
          return;
        }
      }

      const newImgEl: EditorElement = {
        id: generateId(),
        type: "image",
        content: file.name || "Imported Asset",
        src: finalUrl,
        alt: file.name || "Imported Asset",
        styles: {
          width: "100%",
          borderRadius: "8px",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
      setElements((prev) => [...prev, newImgEl]);
      setSelectedId(newImgEl.id);
      setSelectedIds([newImgEl.id]);
    } catch (err: any) {
      console.error("Asset import error:", err);
      setUploadError(err.message || "Failed to import asset.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImportAsset(e.dataTransfer.files[0]);
    }
  };

  const compileBackgroundAndBorderStyles = (mergedStyles: ElementStyles): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (mergedStyles.backgroundColor) {
      styles.backgroundColor = mergedStyles.backgroundColor;
    }
    if (mergedStyles.backgroundImage) {
      const bgImg = mergedStyles.backgroundImage.startsWith("url(")
        ? mergedStyles.backgroundImage
        : `url('${resolveImageUrl(mergedStyles.backgroundImage, apiUrl)}')`;
      styles.backgroundImage = bgImg;
    }
    if (mergedStyles.backgroundPosition) {
      styles.backgroundPosition = mergedStyles.backgroundPosition;
    }
    if (mergedStyles.backgroundSize) {
      styles.backgroundSize = mergedStyles.backgroundSize;
    }
    if (mergedStyles.backgroundRepeat) {
      styles.backgroundRepeat = mergedStyles.backgroundRepeat;
    }

    if (mergedStyles.borderStyle && mergedStyles.borderStyle !== "none") {
      styles.borderStyle = mergedStyles.borderStyle;
      styles.borderWidth = mergedStyles.borderWidth || "1px";
      styles.borderColor = mergedStyles.borderColor || "#cbd5e1";
    }

    if (
      mergedStyles.borderTopLeftRadius ||
      mergedStyles.borderTopRightRadius ||
      mergedStyles.borderBottomRightRadius ||
      mergedStyles.borderBottomLeftRadius
    ) {
      styles.borderTopLeftRadius = mergedStyles.borderTopLeftRadius || mergedStyles.borderRadius || "0px";
      styles.borderTopRightRadius = mergedStyles.borderTopRightRadius || mergedStyles.borderRadius || "0px";
      styles.borderBottomRightRadius = mergedStyles.borderBottomRightRadius || mergedStyles.borderRadius || "0px";
      styles.borderBottomLeftRadius = mergedStyles.borderBottomLeftRadius || mergedStyles.borderRadius || "0px";
    } else if (mergedStyles.borderRadius) {
      styles.borderRadius = mergedStyles.borderRadius;
    }

    if (mergedStyles.boxShadow) {
      styles.boxShadow = mergedStyles.boxShadow;
    }

    return styles;
  };

  const compilePositioningStyles = (mergedStyles: ElementStyles): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (mergedStyles.position && mergedStyles.position !== "static") {
      styles.position = mergedStyles.position;
    }

    if (mergedStyles.top !== undefined && mergedStyles.top !== "") {
      styles.top = mergedStyles.top;
    }
    if (mergedStyles.right !== undefined && mergedStyles.right !== "") {
      styles.right = mergedStyles.right;
    }
    if (mergedStyles.bottom !== undefined && mergedStyles.bottom !== "") {
      styles.bottom = mergedStyles.bottom;
    }
    if (mergedStyles.left !== undefined && mergedStyles.left !== "") {
      styles.left = mergedStyles.left;
    }

    if (mergedStyles.zIndex !== undefined && mergedStyles.zIndex !== null && mergedStyles.zIndex !== "") {
      styles.zIndex = Number(mergedStyles.zIndex);
    }

    if (
      mergedStyles.transformRotate ||
      mergedStyles.transformScale ||
      mergedStyles.transformTranslateX ||
      mergedStyles.transformTranslateY
    ) {
      const transforms = [];
      if (mergedStyles.transformRotate) transforms.push(`rotate(${mergedStyles.transformRotate})`);
      if (mergedStyles.transformScale) transforms.push(`scale(${mergedStyles.transformScale})`);
      if (mergedStyles.transformTranslateX || mergedStyles.transformTranslateY) {
        const tx = mergedStyles.transformTranslateX || "0px";
        const ty = mergedStyles.transformTranslateY || "0px";
        transforms.push(`translate(${tx}, ${ty})`);
      }
      styles.transform = transforms.join(" ");
    }

    if (mergedStyles.opacity !== undefined && mergedStyles.opacity !== null && mergedStyles.opacity !== "") {
      styles.opacity = Number(mergedStyles.opacity);
    }

    if (mergedStyles.overflowX) styles.overflowX = mergedStyles.overflowX as any;
    if (mergedStyles.overflowY) styles.overflowY = mergedStyles.overflowY as any;

    return styles;
  };

  const renderPositioningControls = () => {
    if (!selectedElement) return null;

    const currentPos = getControlStyleValue(selectedElement, activeDevice, activeElementState, "position") || "static";

    const rawTop = String(getControlStyleValue(selectedElement, activeDevice, activeElementState, "top") || "");
    const rawRight = String(getControlStyleValue(selectedElement, activeDevice, activeElementState, "right") || "");
    const rawBottom = String(getControlStyleValue(selectedElement, activeDevice, activeElementState, "bottom") || "");
    const rawLeft = String(getControlStyleValue(selectedElement, activeDevice, activeElementState, "left") || "");

    const currentZIndex = getControlStyleValue(selectedElement, activeDevice, activeElementState, "zIndex");
    const zIndexStr = currentZIndex !== undefined && currentZIndex !== null ? String(currentZIndex) : "";

    const parsedTop = parseSpacingUnit(rawTop);
    const parsedRight = parseSpacingUnit(rawRight);
    const parsedBottom = parseSpacingUnit(rawBottom);
    const parsedLeft = parseSpacingUnit(rawLeft);

    const activeOffsetUnit = parsedTop.unit || parsedRight.unit || parsedBottom.unit || parsedLeft.unit || "px";

    const isPosOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "position") : hasStyleOverride(selectedElement, activeDevice, "position");
    const isOffsetsOverridden = activeElementState === "hover"
      ? hasHoverStyleOverride(selectedElement, activeDevice, "top") ||
        hasHoverStyleOverride(selectedElement, activeDevice, "right") ||
        hasHoverStyleOverride(selectedElement, activeDevice, "bottom") ||
        hasHoverStyleOverride(selectedElement, activeDevice, "left")
      : hasStyleOverride(selectedElement, activeDevice, "top") ||
        hasStyleOverride(selectedElement, activeDevice, "right") ||
        hasStyleOverride(selectedElement, activeDevice, "bottom") ||
        hasStyleOverride(selectedElement, activeDevice, "left");
    const isZIndexOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "zIndex") : hasStyleOverride(selectedElement, activeDevice, "zIndex");

    const handleOffsetChange = (key: keyof ElementStyles, numVal: string, unitVal: string) => {
      const formattedVal = numVal.trim() === "" ? "" : `${numVal}${unitVal}`;
      updateSelectedStyle(key, formattedVal);
    };

    const handleUnitChange = (newUnit: string) => {
      const convertUnit = (parsed: { num: string; unit: string }, sideKey: keyof ElementStyles) => {
        if (parsed.num) {
          updateSelectedStyle(sideKey, `${parsed.num}${newUnit}`);
        }
      };
      convertUnit(parsedTop, "top");
      convertUnit(parsedRight, "right");
      convertUnit(parsedBottom, "bottom");
      convertUnit(parsedLeft, "left");
    };

    return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Positioning & Layering
        </h3>

        {/* 1. Position Type Dropdown */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Position Type
              {isPosOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(selectedElement?.styles?.position || isPosOverridden) && (
              <button
                type="button"
                onClick={() => resetSelectedStyle("position")}
                title="Reset Position Type to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <select
            value={currentPos}
            onChange={(e) => updateSelectedStyle("position", e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="static">Default (Static)</option>
            <option value="relative">Relative</option>
            <option value="absolute">Absolute</option>
            <option value="fixed">Fixed</option>
            <option value="sticky">Sticky</option>
          </select>
        </div>

        {/* 2. Position Offsets (Top, Right, Bottom, Left) */}
        {currentPos !== "static" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Position Offsets
                {isOffsetsOverridden && (
                  <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                    {activeDevice}
                  </span>
                )}
              </label>

              <div className="flex items-center gap-1.5">
                <select
                  value={activeOffsetUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="px">px</option>
                  <option value="%">%</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                </select>

                {(selectedElement?.styles?.top || selectedElement?.styles?.right || selectedElement?.styles?.bottom || selectedElement?.styles?.left || isOffsetsOverridden) && (
                  <button
                    type="button"
                    onClick={() => {
                      resetSelectedStyle("top");
                      resetSelectedStyle("right");
                      resetSelectedStyle("bottom");
                      resetSelectedStyle("left");
                    }}
                    title="Reset Offsets to Default"
                    className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                  >
                    ↺ Reset
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                  Top
                </span>
                <ScrubbableNumberInput
                  value={parsedTop.num}
                  onChange={(val) => handleOffsetChange("top", val, activeOffsetUnit)}
                  placeholder="auto"
                  className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                  Right
                </span>
                <ScrubbableNumberInput
                  value={parsedRight.num}
                  onChange={(val) => handleOffsetChange("right", val, activeOffsetUnit)}
                  placeholder="auto"
                  className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                  Bottom
                </span>
                <ScrubbableNumberInput
                  value={parsedBottom.num}
                  onChange={(val) => handleOffsetChange("bottom", val, activeOffsetUnit)}
                  placeholder="auto"
                  className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                  Left
                </span>
                <ScrubbableNumberInput
                  value={parsedLeft.num}
                  onChange={(val) => handleOffsetChange("left", val, activeOffsetUnit)}
                  placeholder="auto"
                  className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Z-Index Control */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Z-Index
              {isZIndexOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(selectedElement?.styles?.zIndex !== undefined || isZIndexOverridden) && (
              <button
                type="button"
                onClick={() => resetSelectedStyle("zIndex")}
                title="Reset Z-Index to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <ScrubbableNumberInput
            value={zIndexStr}
            onChange={(val) =>
              updateSelectedStyle(
                "zIndex",
                val !== "" ? Number(val) : undefined
              )
            }
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          />
        </div>
      </div>
    );
  };

  const handleBgImageFileSelect = async (file: File) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      let uploadRes = await fetch(`${apiUrl}/api/v1/uploads/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok && uploadRes.status === 404) {
        uploadRes = await fetch(`${apiUrl}/api/uploads/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      }

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData?.message || uploadData?.error?.message || "Failed to upload background image.");
      }

      const returnedUrl = uploadData.url || uploadData?.data?.url;
      if (returnedUrl) {
        updateSelectedStyle("backgroundImage", returnedUrl);
      } else {
        throw new Error("No image URL returned from server.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err instanceof Error ? err.message : "Error uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  const renderBackgroundAndBorderControls = () => {
    if (!selectedElement) return null;

    const currentBgColor = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundColor") || "";
    const currentBgImage = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundImage") || "";
    const currentBgPos = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundPosition") || "center";
    const currentBgSize = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundSize") || "cover";
    const currentBgRepeat = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundRepeat") || "no-repeat";

    const currentBorderStyle = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderStyle") || "none";
    const currentBorderWidth = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderWidth") || "1px";
    const currentBorderColor = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderColor") || "#cbd5e1";

    const currentTLRadius = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderTopLeftRadius") || getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "";
    const currentTRRadius = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderTopRightRadius") || getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "";
    const currentBRRadius = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderBottomRightRadius") || getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "";
    const currentBLRadius = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderBottomLeftRadius") || getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "";

    const currentBoxShadow = getControlStyleValue(selectedElement, activeDevice, activeElementState, "boxShadow") || "";

    const shadowMatch = currentBoxShadow.match(/(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)\s+(.*)/);
    const shadowX = shadowMatch ? shadowMatch[1].replace("px", "") : "0";
    const shadowY = shadowMatch ? shadowMatch[2].replace("px", "") : "0";
    const shadowBlur = shadowMatch ? shadowMatch[3].replace("px", "") : "0";
    const shadowSpread = shadowMatch ? shadowMatch[4].replace("px", "") : "0";
    const shadowColor = shadowMatch ? shadowMatch[5] : "rgba(0,0,0,0.25)";

    const parsedTL = parseSpacingUnit(currentTLRadius, "px");
    const parsedTR = parseSpacingUnit(currentTRRadius, "px");
    const parsedBR = parseSpacingUnit(currentBRRadius, "px");
    const parsedBL = parseSpacingUnit(currentBLRadius, "px");
    const activeRadiusUnit = parsedTL.unit || "px";

    const isBgColorOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "backgroundColor") : hasStyleOverride(selectedElement, activeDevice, "backgroundColor");
    const isBgImageOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "backgroundImage") : hasStyleOverride(selectedElement, activeDevice, "backgroundImage");
    const isBorderOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "borderStyle") : hasStyleOverride(selectedElement, activeDevice, "borderStyle");
    const isRadiusOverridden = activeElementState === "hover" ? (hasHoverStyleOverride(selectedElement, activeDevice, "borderTopLeftRadius") || hasHoverStyleOverride(selectedElement, activeDevice, "borderRadius")) : (hasStyleOverride(selectedElement, activeDevice, "borderTopLeftRadius") || hasStyleOverride(selectedElement, activeDevice, "borderRadius"));
    const isShadowOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "boxShadow") : hasStyleOverride(selectedElement, activeDevice, "boxShadow");

    const updateCornerRadius = (cornerKey: keyof ElementStyles, valStr: string) => {
      if (isBorderRadiusLinked) {
        updateSelectedStyle("borderTopLeftRadius", valStr);
        updateSelectedStyle("borderTopRightRadius", valStr);
        updateSelectedStyle("borderBottomRightRadius", valStr);
        updateSelectedStyle("borderBottomLeftRadius", valStr);
        updateSelectedStyle("borderRadius", valStr);
      } else {
        updateSelectedStyle(cornerKey, valStr);
      }
    };

    return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Background & Border
        </h3>

        {/* 1. Background Color */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Background Color
              {isBgColorOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(isControlStyleConfigured(selectedElement, activeDevice, activeElementState, "backgroundColor") || isBgColorOverridden) && (
              <button
                type="button"
                onClick={() => resetSelectedStyle("backgroundColor")}
                title="Reset Background Color to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentBgColor.startsWith("#") ? currentBgColor : "#ffffff"}
              onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
            />
            <input
              type="text"
              value={currentBgColor}
              onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
              placeholder="transparent / #ffffff / rgba(...)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => handleSampleColor((hex) => updateSelectedStyle("backgroundColor", hex))}
              title="Sample Color from Screen / Image"
              className="h-8 px-2 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1 shrink-0"
            >
              <span>🧪</span>
              <span className="text-[10px]">Sample</span>
            </button>
          </div>
        </div>

        {/* 2. Background Image & Settings */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Background Image
              {isBgImageOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {currentBgImage && (
              <button
                type="button"
                onClick={() => {
                  updateSelectedStyle("backgroundImage", "");
                  if (activeDevice !== "desktop") resetSelectedStyle("backgroundImage");
                }}
                className="text-[10px] font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleBgImageFileSelect(e.target.files[0]);
              }
            }}
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => bgFileInputRef.current?.click()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload Image"}
            </button>
            <input
              type="text"
              value={currentBgImage}
              onChange={(e) => updateSelectedStyle("backgroundImage", e.target.value)}
              placeholder="Or enter Image URL"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {currentBgImage && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              {/* Background Position */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Position
                </label>
                <select
                  value={currentBgPos}
                  onChange={(e) => updateSelectedStyle("backgroundPosition", e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>

              {/* Background Size */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Size
                </label>
                <select
                  value={currentBgSize}
                  onChange={(e) => updateSelectedStyle("backgroundSize", e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              {/* Background Repeat */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Repeat
                </label>
                <select
                  value={currentBgRepeat}
                  onChange={(e) => updateSelectedStyle("backgroundRepeat", e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="no-repeat">No Repeat</option>
                  <option value="repeat">Repeat</option>
                  <option value="repeat-x">Repeat X</option>
                  <option value="repeat-y">Repeat Y</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 3. Border Controls */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Border Style
              {isBorderOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(selectedElement?.styles?.borderStyle || selectedElement?.styles?.borderColor || selectedElement?.styles?.borderWidth || isBorderOverridden) && (
              <button
                type="button"
                onClick={() => {
                  resetSelectedStyle("borderStyle");
                  resetSelectedStyle("borderWidth");
                  resetSelectedStyle("borderColor");
                }}
                title="Reset Border to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <select
            value={currentBorderStyle}
            onChange={(e) => updateSelectedStyle("borderStyle", e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 mb-2"
          >
            <option value="none">None</option>
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>

          {currentBorderStyle !== "none" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={currentBorderWidth.replace("px", "")}
                  onChange={(e) =>
                    updateSelectedStyle(
                      "borderWidth",
                      e.target.value ? `${e.target.value}px` : "1px"
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={currentBorderColor.startsWith("#") ? currentBorderColor : "#cbd5e1"}
                    onChange={(e) => updateSelectedStyle("borderColor", e.target.value)}
                    className="h-7 w-8 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={currentBorderColor}
                    onChange={(e) => updateSelectedStyle("borderColor", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSampleColor((hex) => updateSelectedStyle("borderColor", hex))}
                    title="Sample Color from Screen / Image"
                    className="h-7 px-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-0.5 shrink-0"
                  >
                    <span>🧪</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Border Radius (4 Corners) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Border Radius
              </label>
              {isRadiusOverridden && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBorderRadiusLinked(!isBorderRadiusLinked)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold transition ${
                  isBorderRadiusLinked
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
                title={isBorderRadiusLinked ? "Unlink Corners" : "Link Corners"}
              >
                <span>{isBorderRadiusLinked ? "🔗" : "🔓"}</span>
                <span className="text-[10px]">
                  {isBorderRadiusLinked ? "Linked" : "Unlinked"}
                </span>
              </button>

              {activeDevice !== "desktop" && isRadiusOverridden && (
                <button
                  type="button"
                  onClick={() => {
                    resetSelectedStyle("borderTopLeftRadius");
                    resetSelectedStyle("borderTopRightRadius");
                    resetSelectedStyle("borderBottomRightRadius");
                    resetSelectedStyle("borderBottomLeftRadius");
                    resetSelectedStyle("borderRadius");
                  }}
                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                TL
              </span>
              <input
                type="number"
                value={parsedTL.num}
                onChange={(e) =>
                  updateCornerRadius(
                    "borderTopLeftRadius",
                    e.target.value ? `${e.target.value}${activeRadiusUnit}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                TR
              </span>
              <input
                type="number"
                value={parsedTR.num}
                onChange={(e) =>
                  updateCornerRadius(
                    "borderTopRightRadius",
                    e.target.value ? `${e.target.value}${activeRadiusUnit}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                BR
              </span>
              <input
                type="number"
                value={parsedBR.num}
                onChange={(e) =>
                  updateCornerRadius(
                    "borderBottomRightRadius",
                    e.target.value ? `${e.target.value}${activeRadiusUnit}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                BL
              </span>
              <input
                type="number"
                value={parsedBL.num}
                onChange={(e) =>
                  updateCornerRadius(
                    "borderBottomLeftRadius",
                    e.target.value ? `${e.target.value}${activeRadiusUnit}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 5. Box Shadow */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Box Shadow
              {isShadowOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </span>
            {currentBoxShadow && (
              <button
                type="button"
                onClick={() => {
                  updateSelectedStyle("boxShadow", "");
                  if (activeDevice !== "desktop") resetSelectedStyle("boxShadow");
                }}
                className="text-[10px] font-semibold text-red-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            <div>
              <span className="text-slate-400">X (px)</span>
              <input
                type="number"
                value={shadowX}
                onChange={(e) =>
                  updateSelectedStyle(
                    "boxShadow",
                    `${e.target.value}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400">Y (px)</span>
              <input
                type="number"
                value={shadowY}
                onChange={(e) =>
                  updateSelectedStyle(
                    "boxShadow",
                    `${shadowX}px ${e.target.value}px ${shadowBlur}px ${shadowSpread}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400">Blur</span>
              <input
                type="number"
                value={shadowBlur}
                onChange={(e) =>
                  updateSelectedStyle(
                    "boxShadow",
                    `${shadowX}px ${shadowY}px ${e.target.value}px ${shadowSpread}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400">Spread</span>
              <input
                type="number"
                value={shadowSpread}
                onChange={(e) =>
                  updateSelectedStyle(
                    "boxShadow",
                    `${shadowX}px ${shadowY}px ${shadowBlur}px ${e.target.value}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-medium text-slate-500">Color</span>
            <input
              type="color"
              value={shadowColor.startsWith("#") ? shadowColor : "#000000"}
              onChange={(e) =>
                updateSelectedStyle(
                  "boxShadow",
                  `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${e.target.value}`
                )
              }
              className="h-6 w-8 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
            />
            <input
              type="text"
              value={shadowColor}
              onChange={(e) =>
                updateSelectedStyle(
                  "boxShadow",
                  `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${e.target.value}`
                )
              }
              placeholder="rgba(0,0,0,0.25)"
              className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-mono"
            />
          </div>
        </div>
      </div>
    );
  };



  // Recursive Element Tree Renderer
  const renderElementTree = (el: EditorElement): React.ReactNode => {
    const isSelected = (selectedIds.includes(el.id) || selectedId === el.id) && !isPreview;
    const isEditingHoverState = isSelected && activeElementState === "hover";
    const mergedStyles = getMergedStyles(el, activeDevice, isEditingHoverState ? "hover" : "normal");

    const customAttrs = Array.isArray(el.customAttributes) ? el.customAttributes : [];
    const customAttrProps = customAttrs.reduce((acc, curr) => {
      if (curr.name && curr.name.trim()) acc[curr.name.trim()] = curr.value || "";
      return acc;
    }, {} as any);

    if (el.type === "container") {
      const mergedLayout = getMergedLayout(el, activeDevice);
      const isHovered = hoveredId === el.id && !isSelected && !isPreview;
      const path = isSelected ? getElementBreadcrumbPath(elements, el.id) : null;

      const isDropTarget = dropTargetId === el.id && !isPreview;

      return (
        <div
          key={el.id}
          id={el.customId || undefined}
          {...customAttrProps}
          data-el-id={el.id}
          draggable={!isPreview}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("application/json", JSON.stringify({ type: "move", id: el.id }));
            e.dataTransfer.effectAllowed = "move";
            setDraggingId(el.id);
          }}
          onDragEnd={(e) => {
            e.stopPropagation();
            setDraggingId(null);
            setDropTargetId(null);
            setDropPosition(null);
          }}
          {...customAttrProps}
          onClick={(e) => {
            e.stopPropagation();
            if (!isPreview) handleSelectElement(el.id, e);
          }}
          className={`relative transition-all duration-150 ${el.id} ${el.customClass || ""} ${
            isPreview ? "" : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
          } ${isSelected ? "border-2 border-blue-500 shadow-sm" : isPreview ? "" : "border border-dashed border-slate-300"}`}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isPreview) {
              handleSelectElement(el.id, e);
              setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
            }
          }}
          style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: mergedLayout.direction || "column",
            justifyContent: mergedLayout.justifyContent || "flex-start",
            alignItems: mergedLayout.alignItems || "stretch",
            gap: `${mergedLayout.gap ?? 10}px`,
            width: mergedStyles.width || "100%",
            height: mergedStyles.height || "auto",
            paddingTop: mergedStyles.paddingTop ?? (mergedStyles.padding || "16px"),
            paddingRight: mergedStyles.paddingRight ?? (mergedStyles.padding || "16px"),
            paddingBottom: mergedStyles.paddingBottom ?? (mergedStyles.padding || "16px"),
            paddingLeft: mergedStyles.paddingLeft ?? (mergedStyles.padding || "16px"),
            marginTop: mergedStyles.marginTop ?? "8px",
            marginRight: mergedStyles.marginRight ?? "0px",
            marginBottom: mergedStyles.marginBottom ?? "8px",
            marginLeft: mergedStyles.marginLeft ?? "0px",
            ...compileBackgroundAndBorderStyles(mergedStyles),
            ...compilePositioningStyles(mergedStyles),
          }}
        >
          {/* F-217: Background Video Layer */}
          {(el.containerBgType === "video" || el.containerVideoUrl) && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <video
                src={el.containerVideoUrl || "https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4"}
                autoPlay={el.containerVideoAutoplay ?? true}
                loop={el.containerVideoLoop ?? true}
                muted={el.containerVideoMuted ?? true}
                playsInline
                className="w-full h-full object-cover"
                style={{
                  objectFit: el.containerVideoFit || "cover",
                  objectPosition: el.containerVideoPosition || "center",
                }}
              />
              {el.containerVideoOverlay && (
                <div className="absolute inset-0" style={{ backgroundColor: el.containerVideoOverlay }} />
              )}
            </div>
          )}

          {/* F-218: Background Slideshow Layer */}
          {(el.containerBgType === "slideshow" || (el.containerSlideshowImages && el.containerSlideshowImages.length > 0)) && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              {el.containerSlideshowImages?.map((img, idx) => (
                <img
                  key={img.id || idx}
                  src={img.url}
                  alt="Background Slide"
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                  style={{ opacity: 1 }}
                />
              )) || (
                <img
                  src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80"
                  alt="Background Slide"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {el.containerSlideshowOverlay && (
                <div className="absolute inset-0 z-1" style={{ backgroundColor: el.containerSlideshowOverlay }} />
              )}
            </div>
          )}

          {!isSelected && !isPreview && (
            <span className="absolute top-1 left-2 text-[9px] font-bold text-slate-300 uppercase pointer-events-none select-none z-10">
              Container
            </span>
          )}

          {isSelected && (
            <div className="absolute -top-3.5 right-3 z-30 flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
              {path && path.length > 1 ? (
                <span className="flex items-center gap-1">
                  {path.map((item, idx) => (
                    <span key={item.id} className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(item.id);
                        }}
                        className={`capitalize hover:underline ${
                          item.id === el.id ? "font-bold text-white" : "text-blue-200"
                        }`}
                      >
                        {item.type}
                      </button>
                      {idx < path.length - 1 && <span>›</span>}
                    </span>
                  ))}
                </span>
              ) : (
                <span>Container</span>
              )}
              <span>•</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReorderElement(el.id, "up");
                }}
                className="hover:underline"
                title="Move Section Up"
              >
                ▲
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReorderElement(el.id, "down");
                }}
                className="hover:underline"
                title="Move Section Down"
              >
                ▼
              </button>
              <span>•</span>
              <button
                onClick={(e) => handleCopyElement(el.id, e)}
                className="hover:underline"
              >
                Copy
              </button>
              <span>•</span>
              <button
                onClick={(e) => handleCopyStyle(el.id, e)}
                className="hover:underline"
                title="Copy Element Style"
              >
                Copy Style
              </button>
              {copiedStyles && (
                <>
                  <span>•</span>
                  <button
                    onClick={(e) => handlePasteStyle(el.id, e)}
                    className="hover:underline text-emerald-200 hover:text-white"
                    title="Paste Copied Style"
                  >
                    Paste Style
                  </button>
                </>
              )}
              <span>•</span>
              <button
                onClick={(e) => handleDuplicateElement(el.id, e)}
                className="hover:underline"
              >
                Duplicate
              </button>
              <span>•</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveAsComponent(el.id);
                }}
                className={`hover:underline ${
                  el.isComponent ? "text-purple-200 font-bold" : "text-blue-100"
                }`}
                title={el.isComponent ? `Component: ${el.componentName}` : "Save as Reusable Component"}
              >
                {el.isComponent ? "Component 🧩" : "Save Comp"}
              </button>
              <span>•</span>
              <button
                onClick={(e) => handleDeleteElement(el.id, e)}
                className="hover:underline text-red-200 hover:text-white"
              >
                Delete
              </button>
            </div>
          )}

          {(!el.children || el.children.length === 0) && !isPreview ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
              <span className="text-xs font-bold text-slate-500">Empty Container</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Click an element on the left panel to add inside
              </span>
            </div>
          ) : (
            el.children?.map((child) => renderElementTree(child))
          )}
        </div>
      );
    }

    const path = isSelected ? getElementBreadcrumbPath(elements, el.id) : null;

    const isHovered = hoveredId === el.id && !isSelected && !isPreview;
    const isDropTarget = dropTargetId === el.id && !isPreview;

    return (
      <div
        key={el.id}
        id={el.customId || undefined}
        {...customAttrProps}
        data-el-id={el.id}
        draggable={!isPreview}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("application/json", JSON.stringify({ type: "move", id: el.id }));
          e.dataTransfer.effectAllowed = "move";
          setDraggingId(el.id);
        }}
        onDragEnd={(e) => {
          e.stopPropagation();
          setDraggingId(null);
          setDropTargetId(null);
          setDropPosition(null);
        }}
        {...customAttrProps}
        onClick={(e) => {
          e.stopPropagation();
          if (!isPreview) handleSelectElement(el.id, e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isPreview) {
            handleSelectElement(el.id, e);
            setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
          }
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          if (!isPreview) setHoveredId(el.id);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          if (!isPreview && hoveredId === el.id) setHoveredId(null);
        }}
        className={`relative transition duration-150 ${el.id} ${el.customClass || ""} ${
          draggingId === el.id ? "opacity-50 scale-95" : ""
        } ${
          isPreview
            ? ""
            : "cursor-grab active:cursor-grabbing hover:outline hover:outline-1 hover:outline-blue-400/60"
        } ${
          isSelected
            ? "border-2 border-blue-500 p-2.5"
            : isHovered
            ? "border border-blue-400 outline outline-2 outline-blue-400/80 p-2.5 shadow-sm"
            : "p-2.5 border border-transparent"
        } ${
          isDropTarget && dropPosition === "before"
            ? "border-t-4 border-t-blue-500"
            : isDropTarget && dropPosition === "after"
            ? "border-b-4 border-b-blue-500"
            : ""
        }`}
        style={{
          boxSizing: "border-box",
          width: mergedStyles.width,
          height: mergedStyles.height,
          marginTop: mergedStyles.marginTop,
          marginRight: mergedStyles.marginRight,
          marginBottom: mergedStyles.marginBottom,
          marginLeft: mergedStyles.marginLeft,
          paddingTop: mergedStyles.paddingTop,
          paddingRight: mergedStyles.paddingRight,
          paddingBottom: mergedStyles.paddingBottom,
          paddingLeft: mergedStyles.paddingLeft,
          padding: mergedStyles.padding,
          backgroundColor: el.containerBg ? el.containerBg : el.type === "button" ? "transparent" : undefined,
          ...compileBackgroundAndBorderStyles(mergedStyles),
          ...compilePositioningStyles(mergedStyles),
          ...(el.type === "button" && el.containerBg ? { backgroundColor: el.containerBg } : {}),
        }}
      >
        {isHovered && !isSelected && !isPreview && (
          <span className="absolute -top-3 left-3 z-30 rounded-full bg-blue-500/90 text-white px-2 py-0.5 text-[9px] font-bold shadow-sm pointer-events-none uppercase tracking-wider">
            {el.type}
          </span>
        )}

        {isSelected && (
          <div className="absolute -top-3.5 right-3 z-30 flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
            {path && path.length > 1 ? (
              <span className="flex items-center gap-1">
                {path.map((item, idx) => (
                  <span key={item.id} className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                      }}
                      className={`capitalize hover:underline ${
                        item.id === el.id ? "font-bold text-white" : "text-blue-200"
                      }`}
                    >
                      {item.type}
                    </button>
                    {idx < path.length - 1 && <span>›</span>}
                  </span>
                ))}
              </span>
            ) : (
              <span className="capitalize">{el.type}</span>
            )}
            <span>•</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReorderElement(el.id, "up");
              }}
              className="hover:underline"
              title="Move Element Up"
            >
              ▲
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReorderElement(el.id, "down");
              }}
              className="hover:underline"
              title="Move Element Down"
            >
              ▼
            </button>
            <span>•</span>
            <button
              onClick={(e) => handleCopyElement(el.id, e)}
              className="hover:underline"
            >
              Copy
            </button>
            <span>•</span>
            <button
              onClick={(e) => handleCopyStyle(el.id, e)}
              className="hover:underline"
              title="Copy Element Style"
            >
              Copy Style
            </button>
            {copiedStyles && (
              <>
                <span>•</span>
                <button
                  onClick={(e) => handlePasteStyle(el.id, e)}
                  className="hover:underline text-emerald-200 hover:text-white"
                  title="Paste Copied Style"
                >
                  Paste Style
                </button>
              </>
            )}
            <span>•</span>
            <button
              onClick={(e) => handleDuplicateElement(el.id, e)}
              className="hover:underline"
            >
              Duplicate
            </button>
            <span>•</span>
            <button
              onClick={(e) => handleDeleteElement(el.id, e)}
              className="hover:underline text-red-200 hover:text-white"
            >
              Delete
            </button>
          </div>
        )}

        {/* Element Renderers */}
        {el.type === "heading" && (() => {
          const Tag = (el.headingLevel || "h2") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
          return (
            <Tag
              id={`heading-${el.id}`}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onFocus={() => handleSelectElement(el.id)}
              onBlur={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
              className="focus:ring-2 focus:ring-blue-400/60 focus:bg-blue-50/20 rounded-sm cursor-text transition-all"
              style={{
                margin: 0,
                padding: 0,
                boxSizing: "border-box",
                outline: "none",
                color: mergedStyles.color || "#0f172a",
                fontSize: mergedStyles.fontSize || (el.headingLevel === "h1" ? "36px" : el.headingLevel === "h3" ? "24px" : el.headingLevel === "h4" ? "20px" : el.headingLevel === "h5" ? "16px" : el.headingLevel === "h6" ? "14px" : "32px"),
                fontWeight: mergedStyles.fontWeight || "700",
                textAlign: mergedStyles.textAlign || "left",
                lineHeight: mergedStyles.lineHeight || "1.2",
                fontFamily: mergedStyles.fontFamily,
                fontStyle: mergedStyles.fontStyle,
                textTransform: mergedStyles.textTransform,
                textDecoration: mergedStyles.textDecoration,
                letterSpacing: mergedStyles.letterSpacing,
                textShadow: mergedStyles.textShadow,
              }}
            >
              {el.content}
            </Tag>
          );
        })()}

        {el.type === "text" && (
          <p
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onFocus={() => handleSelectElement(el.id)}
            onBlur={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
            className="focus:ring-2 focus:ring-blue-400/60 focus:bg-blue-50/20 rounded-sm cursor-text transition-all"
            style={{
              margin: 0,
              padding: 0,
              boxSizing: "border-box",
              outline: "none",
              color: mergedStyles.color || "#475569",
              fontSize: mergedStyles.fontSize || "16px",
              fontWeight: mergedStyles.fontWeight || "400",
              textAlign: mergedStyles.textAlign || "left",
              lineHeight: mergedStyles.lineHeight || "1.6",
              fontFamily: mergedStyles.fontFamily,
              fontStyle: mergedStyles.fontStyle,
              textTransform: mergedStyles.textTransform,
              textDecoration: mergedStyles.textDecoration,
              letterSpacing: mergedStyles.letterSpacing,
              textShadow: mergedStyles.textShadow,
            }}
          >
            {el.content}
          </p>
        )}

        {el.type === "video" && (
          <div
            style={{
              textAlign: mergedStyles.textAlign || "left",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {(() => {
              const srcUrl = el.src?.trim() || "";
              if (!srcUrl) {
                return (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-10 px-6 text-center transition hover:border-blue-400">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xl font-bold">
                      🎬
                    </div>
                    <h4 className="mt-3 text-xs font-bold text-slate-700">
                      No video selected
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-400 mb-4 max-w-xs">
                      Enter a YouTube, Vimeo, or HTML5 video link, or upload a video file
                    </p>
                    {!isPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectElement(el.id);
                          triggerImagePicker((url) => {
                            setElements((prev) =>
                              updateTreeElement(prev, el.id, (item) => ({ ...item, src: url }))
                            );
                          });
                        }}
                        className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🎬</span> Select Video
                      </button>
                    )}
                  </div>
                );
              }

              const ytId = getYouTubeId(srcUrl);
              const vimeoId = getVimeoId(srcUrl);
              const isControls = el.videoControls !== false;
              const isAutoplay = Boolean(el.videoAutoplay);
              const isLoop = Boolean(el.videoLoop);
              const isMuted = Boolean(el.videoMuted);

              const alignMarginLeft =
                mergedStyles.textAlign === "center"
                  ? "auto"
                  : mergedStyles.textAlign === "right"
                  ? "auto"
                  : "0";
              const alignMarginRight =
                mergedStyles.textAlign === "center"
                  ? "auto"
                  : mergedStyles.textAlign === "left"
                  ? "auto"
                  : "0";

              const containerStyle: React.CSSProperties = {
                width: mergedStyles.width || "100%",
                maxWidth: "100%",
                height: mergedStyles.height && mergedStyles.height !== "auto" ? mergedStyles.height : undefined,
                borderRadius: mergedStyles.borderRadius || "8px",
                overflow: "hidden",
                boxSizing: "border-box",
                marginLeft: alignMarginLeft,
                marginRight: alignMarginRight,
                ...compileBackgroundAndBorderStyles(mergedStyles),
              };

              if (ytId) {
                const embedParams = new URLSearchParams({
                  autoplay: isAutoplay ? "1" : "0",
                  controls: isControls ? "1" : "0",
                  loop: isLoop ? "1" : "0",
                  mute: isMuted ? "1" : "0",
                  playlist: isLoop ? ytId : "",
                }).toString();

                return (
                  <div style={containerStyle} className="inline-block shadow-sm">
                    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-[inherit]">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?${embedParams}`}
                        title="YouTube video player"
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              }

              if (vimeoId) {
                const embedParams = new URLSearchParams({
                  autoplay: isAutoplay ? "1" : "0",
                  controls: isControls ? "1" : "0",
                  loop: isLoop ? "1" : "0",
                  muted: isMuted ? "1" : "0",
                }).toString();

                return (
                  <div style={containerStyle} className="inline-block shadow-sm">
                    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-[inherit]">
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}?${embedParams}`}
                        title="Vimeo video player"
                        className="absolute inset-0 w-full h-full border-0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              }

              // Direct Video / HTML5 Video file fallback
              return (
                <div style={containerStyle} className="inline-block shadow-sm">
                  <video
                    src={resolveImageUrl(srcUrl, apiUrl)}
                    poster={el.videoPoster ? resolveImageUrl(el.videoPoster, apiUrl) : undefined}
                    controls={isControls}
                    autoPlay={isAutoplay}
                    loop={isLoop}
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover rounded-[inherit]"
                    style={{
                      maxHeight: mergedStyles.height && mergedStyles.height !== "auto" ? mergedStyles.height : "500px",
                    }}
                  >
                    Your browser does not support HTML5 video playback.
                  </video>
                </div>
              );
            })()}
          </div>
        )}

        {el.type === "video-playlist" && (
          <div
            style={{
              textAlign: mergedStyles.textAlign || "left",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {(() => {
              const items = el.playlistItems || [];
              if (items.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-10 px-6 text-center transition hover:border-blue-400">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xl font-bold">
                      📺
                    </div>
                    <h4 className="mt-3 text-xs font-bold text-slate-700">
                      No video playlist items
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-400 mb-4 max-w-xs">
                      Add videos to this playlist from the properties sidebar
                    </p>
                    {!isPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectElement(el.id);
                        }}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                      >
                        Manage Playlist
                      </button>
                    )}
                  </div>
                );
              }

              // Determine active item
              const activeIndex = Math.max(
                0,
                items.findIndex((item) => item.id === el.playlistActiveId)
              );
              const activeItem = items[activeIndex] || items[0];
              const isRightPosition = (el.playlistPosition || "right") === "right";
              const playerWidthPercentage = el.playlistPlayerWidth || "65%";

              // Navigation Handlers
              const handlePrev = (e: React.MouseEvent) => {
                e.stopPropagation();
                const prevIndex = (activeIndex - 1 + items.length) % items.length;
                const prevItem = items[prevIndex];
                if (prevItem) {
                  setElements((prev) =>
                    updateTreeElement(prev, el.id, (item) => ({ ...item, playlistActiveId: prevItem.id }))
                  );
                }
              };

              const handleNext = (e: React.MouseEvent) => {
                e.stopPropagation();
                const nextIndex = (activeIndex + 1) % items.length;
                const nextItem = items[nextIndex];
                if (nextItem) {
                  setElements((prev) =>
                    updateTreeElement(prev, el.id, (item) => ({ ...item, playlistActiveId: nextItem.id }))
                  );
                }
              };

              const handleSelectItem = (itemId: string, e: React.MouseEvent) => {
                e.stopPropagation();
                setElements((prev) =>
                  updateTreeElement(prev, el.id, (item) => ({ ...item, playlistActiveId: itemId }))
                );
              };

              // Helper for embedding active video
              const renderActivePlayer = () => {
                const srcUrl = (activeItem?.url || activeItem?.videoUrl || "").trim();
                const posterUrl = activeItem?.thumbnailUrl || activeItem?.thumbnail;
                const ytId = getYouTubeId(srcUrl);
                const vimeoId = getVimeoId(srcUrl);

                if (!srcUrl) {
                  return (
                    <div className="flex h-full min-h-[240px] flex-col items-center justify-center bg-slate-900 text-slate-400 p-6 text-center">
                      <span className="text-2xl mb-2">🎬</span>
                      <p className="text-xs font-medium">No video URL provided for this item</p>
                    </div>
                  );
                }

                if (ytId) {
                  return (
                    <div className="relative w-full aspect-video bg-black overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=1`}
                        title={activeItem.title}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }

                if (vimeoId) {
                  return (
                    <div className="relative w-full aspect-video bg-black overflow-hidden">
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&controls=1`}
                        title={activeItem.title}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }

                return (
                  <div className="relative w-full aspect-video bg-black overflow-hidden">
                    <video
                      src={resolveImageUrl(srcUrl, apiUrl)}
                      poster={posterUrl ? resolveImageUrl(posterUrl, apiUrl) : undefined}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    >
                      Your browser does not support HTML5 video playback.
                    </video>
                  </div>
                );
              };

              return (
                <div
                  style={{
                    width: mergedStyles.width || "100%",
                    borderRadius: mergedStyles.borderRadius || "12px",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    ...compileBackgroundAndBorderStyles(mergedStyles),
                  }}
                  className="border border-slate-200 bg-white shadow-md"
                >
                  {/* Playlist Layout Container */}
                  <div
                    className={
                      isRightPosition
                        ? "flex flex-col md:flex-row items-stretch overflow-hidden"
                        : "flex flex-col overflow-hidden"
                    }
                  >
                    {/* Player Section */}
                    <div
                      style={{
                        width: isRightPosition ? playerWidthPercentage : "100%",
                      }}
                      className="flex-1 shrink-0 bg-slate-950 flex flex-col justify-between"
                    >
                      {/* Player Top Header Bar */}
                      <div className="flex items-center justify-between bg-slate-900/90 px-4 py-2.5 text-white border-b border-slate-800 shrink-0">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                            {activeIndex + 1}
                          </span>
                          <h4 className="truncate text-xs font-semibold text-slate-100">
                            {activeItem.title || "Untitled Video"}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={handlePrev}
                            title="Previous Video"
                            className="rounded px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
                          >
                            <span>◀</span>
                            <span className="hidden sm:inline">Prev</span>
                          </button>
                          <span className="text-[10px] text-slate-500 px-1">
                            {activeIndex + 1}/{items.length}
                          </span>
                          <button
                            type="button"
                            onClick={handleNext}
                            title="Next Video"
                            className="rounded px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
                          >
                            <span className="hidden sm:inline">Next</span>
                            <span>▶</span>
                          </button>
                        </div>
                      </div>

                      {/* Video Embed Player */}
                      {renderActivePlayer()}
                    </div>

                    {/* Playlist Sidebar / Bottom List */}
                    <div
                      style={{
                        width: isRightPosition ? `calc(100% - ${playerWidthPercentage})` : "100%",
                      }}
                      className={
                        isRightPosition
                          ? "flex flex-col border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 max-h-[460px]"
                          : "flex flex-col border-t border-slate-200 bg-slate-50 max-h-[320px]"
                      }
                    >
                      {/* Sidebar Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📺</span>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Playlist ({items.length})
                          </h4>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Now Playing: #{activeIndex + 1}
                        </span>
                      </div>

                      {/* Playlist Items List */}
                      <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 p-1 space-y-1">
                        {items.map((item, idx) => {
                          const isActive = item.id === (el.playlistActiveId || items[0]?.id);
                          return (
                            <button
                              key={item.id || idx}
                              type="button"
                              onClick={(e) => handleSelectItem(item.id, e)}
                              className={`w-full text-left p-2.5 rounded-lg transition flex items-center gap-3 group ${
                                isActive
                                  ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-600"
                                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                              }`}
                            >
                              {/* Item Index / Active Icon */}
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                                }`}
                              >
                                {isActive ? "▶" : String(idx + 1).padStart(2, "0")}
                              </div>

                              {/* Thumbnail preview if available */}
                              {item.thumbnailUrl && (
                                <img
                                  src={resolveImageUrl(item.thumbnailUrl, apiUrl)}
                                  alt={item.title}
                                  className="h-9 w-14 object-cover rounded border border-black/10 shrink-0"
                                />
                              )}

                              {/* Title & Duration */}
                              <div className="flex-1 min-w-0">
                                <h5
                                  className={`truncate text-xs font-semibold ${
                                    isActive ? "text-white" : "text-slate-800 group-hover:text-blue-600"
                                  }`}
                                >
                                  {item.title || `Video ${idx + 1}`}
                                </h5>
                                {item.duration && (
                                  <span
                                    className={`text-[10px] font-mono ${
                                      isActive ? "text-blue-100" : "text-slate-400"
                                    }`}
                                  >
                                    ⏱️ {item.duration}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {el.type === "image" && (() => {
          const getMaskClipPath = (shape?: string) => {
            switch (shape) {
              case "circle": return "circle(50% at 50% 50%)";
              case "rounded": return "inset(0 round 20%)";
              case "blob": return "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)";
              case "hexagon": return "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
              case "star": return "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
              case "diamond": return "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
              case "squircle": return "inset(0 round 35%)";
              case "heart": return "polygon(50% 15%, 65% 0%, 85% 0%, 100% 15%, 100% 35%, 50% 90%, 0% 35%, 0% 15%, 15% 0%, 35% 0%)";
              default: return undefined;
            }
          };

          return (
            <div
              style={{
                textAlign: mergedStyles.textAlign || "left",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {el.src ? (
                <img
                  src={resolveImageUrl(el.src, apiUrl)}
                  alt={el.alt || "Uploaded Image"}
                  className="inline-block max-w-full"
                  style={{
                    display: "block",
                    width: mergedStyles.width || "100%",
                    height: mergedStyles.height || "auto",
                    objectFit: (mergedStyles.objectFit as any) || "cover",
                    objectPosition: mergedStyles.objectPosition || "center",
                    opacity: mergedStyles.opacity !== undefined ? Number(mergedStyles.opacity) : 1,
                    borderRadius: mergedStyles.borderRadius || "8px",
                    boxSizing: "border-box",
                    clipPath: getMaskClipPath(el.imageMaskShape),
                    marginLeft:
                      mergedStyles.textAlign === "center"
                        ? "auto"
                        : mergedStyles.textAlign === "right"
                        ? "auto"
                        : "0",
                    marginRight:
                      mergedStyles.textAlign === "center"
                        ? "auto"
                        : mergedStyles.textAlign === "left"
                        ? "auto"
                        : "0",
                    ...compileBackgroundAndBorderStyles(mergedStyles),
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-8 px-6 text-center transition hover:border-blue-400">
                  <EmptyPictureIcon />
                  <h4 className="mt-3 text-xs font-bold text-slate-700">
                    No image selected
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400 mb-3">
                    Select or upload an image for this widget
                  </p>
                  {!isPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectElement(el.id);
                        triggerImagePicker((url) => {
                          setElements((prev) =>
                            updateTreeElement(prev, el.id, (item) => ({ ...item, src: url }))
                          );
                        });
                      }}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📁</span> Select Image
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {el.type === "button" && (
          <div style={{ textAlign: mergedStyles.textAlign || "left", width: "100%", boxSizing: "border-box" }}>
            <a
              href={el.href || "#"}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onFocus={() => handleSelectElement(el.id)}
              onBlur={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
              className="inline-block rounded-lg px-5 py-2 text-sm font-semibold shadow transition-all duration-200"
              style={{
                backgroundColor: el.buttonBg || "#2563eb",
                color: el.buttonColor || "#ffffff",
                fontSize: mergedStyles.fontSize,
                fontFamily: mergedStyles.fontFamily,
                fontWeight: mergedStyles.fontWeight,
                borderRadius: mergedStyles.borderRadius || "8px",
                boxShadow: mergedStyles.boxShadow,
              }}
              {...customAttrProps}
            >
              {el.content || el.buttonText || "Button"}
            </a>
          </div>
        )}

        {el.type === "posts" && (() => {
          const postsList = el.posts && el.posts.length > 0 ? el.posts : [];
          const columns = el.postsColumns || 3;
          const gap = el.postsGap ?? 20;
          const imageHeight = el.postsImageHeight || "180px";
          const align = el.postsAlignment || "left";
          const showImage = el.postsShowImage !== false;
          const showDate = el.postsShowDate !== false;
          const showExcerpt = el.postsShowExcerpt !== false;
          const showReadMore = el.postsShowReadMore !== false;

          let gridColsStyle: React.CSSProperties = {};
          if (activeDevice === "mobile") {
            gridColsStyle = { gridTemplateColumns: "repeat(1, minmax(0, 1fr))" };
          } else if (activeDevice === "tablet") {
            gridColsStyle = { gridTemplateColumns: `repeat(${Math.min(columns, 2)}, minmax(0, 1fr))` };
          } else {
            gridColsStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
          }

          return (
            <div style={{ width: "100%", boxSizing: "border-box" }}>
              {postsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-600">No Posts Configured</p>
                  <p className="text-[10px] text-slate-400 mt-1">Use the right properties panel to add blog posts.</p>
                </div>
              ) : (
                <div
                  className="grid"
                  style={{ gap: `${gap}px`, ...gridColsStyle }}
                >
                  {postsList.map((post) => (
                    <article
                      key={post.id}
                      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md hover:-translate-y-0.5"
                      style={{ textAlign: align }}
                    >
                      {showImage && post.image && (
                        <div className="relative overflow-hidden bg-slate-100" style={{ height: imageHeight }}>
                          <img
                            src={resolveImageUrl(post.image, apiUrl)}
                            alt={post.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-5">
                        {showDate && (post.date || post.author) && (
                          <div className="mb-2 flex items-center text-[11px] font-medium text-slate-400 gap-2">
                            {post.date && <span>{post.date}</span>}
                            {post.date && post.author && <span>•</span>}
                            {post.author && <span>By {post.author}</span>}
                          </div>
                        )}
                        <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition mb-2">
                          {post.title}
                        </h3>
                        {showExcerpt && post.excerpt && (
                          <p className="text-xs text-slate-600 leading-relaxed flex-1 mb-4">
                            {post.excerpt}
                          </p>
                        )}
                        {showReadMore && (
                          <div className="mt-auto">
                            <a
                              href={post.readMoreUrl || "#"}
                              onClick={(e) => {
                                if (!isPreview) e.preventDefault();
                              }}
                              className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition gap-1"
                            >
                              <span>{post.readMoreText || "Read More →"}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {el.type === "share-buttons" && (
          <ShareButtonsWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "portfolio" && (() => {
          const items = el.portfolioItems && el.portfolioItems.length > 0 ? el.portfolioItems : [];
          const columns = el.portfolioColumns || 3;
          const gap = el.portfolioGap ?? 24;
          const imageHeight = el.portfolioImageHeight || "240px";
          const align = el.portfolioAlignment || "left";
          const showCategory = el.portfolioShowCategory !== false;
          const showDescription = el.portfolioShowDescription !== false;
          const showLink = el.portfolioShowLink !== false;

          let colClass = "grid-cols-3";
          if (columns === 1) colClass = "grid-cols-1";
          else if (columns === 2) colClass = "grid-cols-1 md:grid-cols-2";
          else if (columns === 3) colClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
          else if (columns === 4) colClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

          if (activeDevice === "mobile") colClass = "grid-cols-1";
          else if (activeDevice === "tablet" && columns > 2) colClass = "grid-cols-2";

          const textAlignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
          const flexJustifyClass = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";

          return (
            <div style={{ width: "100%", boxSizing: "border-box" }}>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-600">No Portfolio Items Created</p>
                  <p className="text-xs text-slate-400 mt-1">Use the right properties panel to add projects & works.</p>
                </div>
              ) : (
                <div
                  className={`grid ${colClass}`}
                  style={{ gap: `${gap}px` }}
                >
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300"
                    >
                      {/* Image Thumbnail with Overlay */}
                      <div
                        className="relative overflow-hidden bg-slate-100"
                        style={{ height: imageHeight }}
                      >
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80"}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {showCategory && item.category && (
                          <div className="absolute top-3 left-3">
                            <span className="inline-block rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                              {item.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content Card */}
                      <div className={`flex flex-col flex-1 p-5 ${textAlignClass}`}>
                        <h4
                          className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition"
                          style={{ fontFamily: mergedStyles.fontFamily }}
                        >
                          {item.title}
                        </h4>

                        {showDescription && item.description && (
                          <p
                            className="mt-2 text-xs text-slate-600 leading-relaxed flex-1 line-clamp-3"
                            style={{ fontFamily: mergedStyles.fontFamily }}
                          >
                            {item.description}
                          </p>
                        )}

                        {showLink && (
                          <div className={`mt-4 flex items-center ${flexJustifyClass}`}>
                            <a
                              href={item.url || "#"}
                              onClick={(e) => {
                                if (!isPreview) e.preventDefault();
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                            >
                              <span>View Project</span>
                              <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {el.type === "slides" && (
          <SlidesWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "form" && (
          <FormWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "login" && (
          <LoginWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "nav-menu" && (
          <NavMenuWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "animated-headline" && (
          <AnimatedHeadlineWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "price-table" && (
          <PriceTableWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "price-list" && (
          <PriceListWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "gallery" && (
          <GalleryWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "flip-box" && (
          <FlipBoxWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "call-to-action" && (
          <CtaWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "media-carousel" && (
          <MediaCarouselWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "testimonial-carousel" && (
          <TestimonialCarouselWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "nested-carousel" && (
          <NestedCarouselWidgetRenderer
            el={el}
            isPreview={isPreview}
            mergedStyles={mergedStyles}
            renderElementTree={renderElementTree}
          />
        )}

        {el.type === "loop-carousel" && (
          <LoopCarouselWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "image-carousel" && (
          <ImageCarouselWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "table-of-contents" && (
          <TocWidgetRenderer el={el} elements={elements} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "countdown" && (
          <CountdownWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {(el.type === "facebook-page" || el.type === "facebook-button" || el.type === "facebook-embed" || el.type === "facebook-comments") && (
          <FacebookPageWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "blockquote" && (
          <BlockquoteWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "template" && (
          <TemplateWidgetRenderer
            el={el}
            components={components}
            onUnpackTemplate={handleUnpackTemplate}
            onSelectTemplate={handleSelectTemplate}
            isPreview={isPreview}
            mergedStyles={mergedStyles}
          />
        )}

        {el.type === "reviews" && (
          <ReviewsWidgetRenderer
            el={el}
            isPreview={isPreview}
            mergedStyles={mergedStyles}
            onUpdateElement={(updatedEl) => {
              const updateRecursive = (list: EditorElement[]): EditorElement[] => {
                return list.map((item) => {
                  if (item.id === updatedEl.id) return updatedEl;
                  if (item.children) return { ...item, children: updateRecursive(item.children) };
                  return item;
                });
              };
              setElements((prev) => updateRecursive(prev));
            }}
          />
        )}

        {el.type === "paypal-button" && (
          <PayPalButtonWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "stripe-button" && (
          <StripeButtonWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "lottie" && (
          <LottieWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "code-highlight" && (
          <CodeHighlightWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}


        {el.type === "basic-media-carousel" && (
          <BasicMediaCarouselWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "basic-gallery" && (
          <BasicGalleryWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "audio-playlist" && (
          <AudioPlaylistWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "dynamic-lightbox" && (
          <DynamicLightboxWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "custom-svg" && (
          <CustomSvgWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "icon-library" && (
          <IconLibraryWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "mega-menu" && (
          <MegaMenuWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "off-canvas" && (
          <OffCanvasWidgetRenderer
            el={el}
            isPreview={isPreview}
            mergedStyles={mergedStyles}
            renderChildren={(childElements) =>
              (childElements || []).map((child) => renderElementTree(child))
            }
          />
        )}

        {el.type === "wc-product-title" && (
          <WcProductTitleWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "wc-product-price" && (
          <WcProductPriceWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "wc-product-images" && (
          <WcProductImagesWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "wc-add-to-cart" && (
          <WcAddToCartWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "wc-product-rating" && (
          <WcProductRatingWidgetRenderer el={el} isPreview={isPreview} mergedStyles={mergedStyles} />
        )}

        {el.type === "html" && (
          <div dangerouslySetInnerHTML={{ __html: el.content || "<p class='p-4 border border-dashed rounded text-xs text-slate-400 text-center font-mono'>Custom HTML Block (F-110)</p>" }} className="w-full h-full" />
        )}

        {el.type === "shortcode" && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs font-mono text-amber-800 text-center break-all transition">
            {el.content ? `[ ${el.content} ]` : "Enter Shortcode here (F-111)"}
            <div className="opacity-60 text-[9px] mt-1 uppercase font-bold tracking-wider">Renders Dynamically on Publish</div>
          </div>
        )}
      </div>
    );
  };

  // Render Loader
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold">Loading Website Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans">
      {/* ========================================== */}
      {/* Top Header Bar */}
      {/* ========================================== */}
      {!isFullScreenCanvas && (
        <header className={`flex h-12 shrink-0 items-center justify-between px-5 shadow-md transition ${
          userPreferences.themeMode === "light"
            ? "bg-white border-b border-slate-200 text-slate-800"
            : "bg-[#0b1329] text-white"
        }`}>
          {/* Left: Quit Editor & Site Info */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleQuitEditor}
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Quit visual editor and return to dashboard"
            >
              <span>←</span>
              <span>{t("quitEditor", "Quit Editor")}</span>
            </button>

            <span className="text-xs font-bold text-white tracking-wide border-l border-slate-700 pl-3">
              {website?.name || "ForgeStudio Project"}
            </span>

            <button
              type="button"
              onClick={() => setIsFinderOpen(true)}
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer ml-1"
              title="Search pages, templates, settings and features (Ctrl+K)"
            >
              <span>🔍</span>
              <span>Search</span>
              <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">Ctrl+K</kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsShortcutsHelpOpen(true)}
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="View Keyboard Shortcuts Cheat Sheet (?)"
            >
              <span>⌨️</span>
              <span>Shortcuts</span>
            </button>

            {/* Developer Mode Code Export Button */}
            <button
              type="button"
              onClick={() => setDevModalMode("export-code")}
              className="text-xs font-bold text-blue-300 bg-blue-900/40 hover:bg-blue-800/60 px-3 py-1.5 rounded-lg border border-blue-700/60 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Export Component Code (.js, .ts, .jsx, .tsx)"
            >
              <span>{"</>"}</span>
              <span>Dev Mode</span>
            </button>
          </div>

          {/* Middle: Responsive Device Selector */}
          <div className="flex items-center gap-1 bg-[#16203a] p-1 rounded-lg border border-slate-700">
                {(["desktop", "tablet", "mobile"] as DeviceMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setActiveDevice(mode)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition flex items-center gap-1 ${
                      activeDevice === mode
                        ? "bg-blue-600 text-white shadow-sm font-bold"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <span>
                      {mode === "desktop" && "💻"}
                      {mode === "tablet" && "📱"}
                      {mode === "mobile" && "📲"}
                    </span>
                    <span>{mode}</span>
                  </button>
                ))}
              </div>

{/* Right: Actions */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {/* History Controls */}
                <div className="flex items-center gap-0.5 bg-[#16203a] p-1 rounded-lg border border-slate-700/80 shrink-0">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="px-2 py-1 text-xs font-bold rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    title="Undo (Ctrl+Z)"
                  >
                    ↩
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="px-2 py-1 text-xs font-bold rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    title="Redo (Ctrl+Y)"
                  >
                    ↪
                  </button>
                  <button
                    onClick={() => setIsRevisionHistoryOpen(true)}
                    className="px-2 py-1 text-xs font-semibold rounded text-slate-300 hover:text-white hover:bg-slate-800 transition border-l border-slate-700/80 pl-1.5 cursor-pointer flex items-center gap-1"
                    title="Revision History"
                  >
                    <span>🕓</span>
                    <span className="hidden md:inline">History</span>
                  </button>
                </div>

                {/* Selected Element Controls (Only active when element selected) */}
                {selectedId && (
                  <div className="flex items-center gap-1 bg-[#16203a] p-1 rounded-lg border border-blue-500/30 shrink-0">
                    <button
                      onClick={() => handleReorderElement(selectedId, "up")}
                      className="px-1.5 py-0.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleReorderElement(selectedId, "down")}
                      className="px-1.5 py-0.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                      title="Move Down"
                    >
                      ▼
                    </button>
                    <button
                      onClick={(e) => handleCopyElement(selectedId, e)}
                      className="px-2 py-0.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                      title="Copy (Ctrl+C)"
                    >
                      Copy
                    </button>
                    <button
                      onClick={(e) => handleDuplicateElement(selectedId, e)}
                      className="px-2 py-0.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                      title="Duplicate (Ctrl+D)"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleSaveAsComponent(selectedId)}
                      className="px-2 py-0.5 text-xs font-semibold text-purple-300 bg-purple-900/40 hover:bg-purple-800 rounded cursor-pointer border border-purple-500/40"
                      title="Save as Reusable Component"
                    >
                      🧩 Comp
                    </button>
                    <button
                      onClick={handleOpenReplaceTemplate}
                      className="px-2 py-0.5 text-xs font-semibold text-amber-300 bg-amber-900/40 hover:bg-amber-800 rounded cursor-pointer border border-amber-500/40"
                      title="Replace with Template"
                    >
                      🔄 Replace
                    </button>
                  </div>
                )}

                {/* Status Messages */}
                {saveMessage && <span className="text-xs font-medium text-emerald-400 shrink-0">✓ {saveMessage}</span>}
                {errorMessage && <span className="text-xs font-medium text-red-400 shrink-0">{errorMessage}</span>}

                {/* Kit & Tools Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportWebsiteKit}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
                    title="Export Website Kit JSON"
                  >
                    📦 Kit
                  </button>

                  <button
                    onClick={() => setIsFullScreenCanvas(!isFullScreenCanvas)}
                    className="px-2 py-1 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
                    title="Toggle Full Screen Canvas"
                  >
                    ⛶
                  </button>
                </div>

                {/* Primary Preview & Save */}
                <div className="flex items-center gap-1.5 ml-1 shrink-0">
                  <button
                    onClick={() => setIsPreview(!isPreview)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      isPreview
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/60"
                        : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {isPreview ? "Exit" : "👁️ Preview"}
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving..." : "💾 Save"}
                  </button>
                </div>
              </div>
        </header>
      )}

{/* ========================================== */}
      {/* Main Workspace Body                         */}
      {/* ========================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ========================================== */}
        {/* Left Sidebar: ELEMENTS                     */}
        {/* ========================================== */}
        {!isPreview && !isFullScreenCanvas && (
          <aside className="w-64 md:w-72 shrink-0 border-r border-slate-200 bg-white p-3.5 overflow-y-auto shadow-sm flex flex-col">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2 mb-3">
              <button
                type="button"
                onClick={() => setLeftSidebarTab("elements")}
                className={`flex-1 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition ${
                  leftSidebarTab === "elements"
                    ? "bg-slate-100 text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t("elements", "Elements")}
              </button>
              <button
                type="button"
                onClick={() => setLeftSidebarTab("navigator")}
                className={`flex-1 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition ${
                  leftSidebarTab === "navigator"
                    ? "bg-slate-100 text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t("navigator", "Navigator")}
              </button>
              <button
                type="button"
                onClick={() => setLeftSidebarTab("templates")}
                className={`flex-1 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition ${
                  leftSidebarTab === "templates"
                    ? "bg-purple-100 text-purple-700 font-bold"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t("templates", "Templates")}
              </button>
              <button
                type="button"
                onClick={() => setLeftSidebarTab("atomic" as any)}
                className={`flex-1 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition ${
                  leftSidebarTab === ("atomic" as any)
                    ? "bg-purple-100 text-purple-700 font-bold"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                ⚛️ Atomic
              </button>
            </div>

            {leftSidebarTab === "elements" ? (
              <div className="space-y-3">
                {/* Main Widget Library Search Input */}
                {!disabledWidgets.includes("search-bar") && (
                  <div className="relative">
                    <input
                      type="text"
                      value={widgetLibrarySearch}
                      onChange={(e) => setWidgetLibrarySearch(e.target.value)}
                      placeholder="Search active widgets..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-7 text-xs font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-xs"
                    />
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                    {widgetLibrarySearch && (
                      <button
                        type="button"
                        onClick={() => setWidgetLibrarySearch("")}
                        className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* Import Asset Button (F-014) */}
                {!disabledWidgets.includes("import-asset") && (
                  <>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImportAsset(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
onClick={() => importFileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-2.5 text-xs font-bold text-blue-700 hover:border-blue-500 hover:bg-blue-100/60 transition disabled:opacity-50 shadow-xs"
                    >
                      <span>📁</span>
                      <span>{isUploading ? "Importing Asset..." : "Import Asset / File"}</span>
                    </button>
                  </>
                )}

                {/* Pinned Favorite Widgets (F-012) */}
                {!disabledWidgets.includes("favorite-widgets") && favoriteWidgets.filter((type) => !disabledWidgets.includes(type)).length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center justify-between">
                      <span>⭐ Favorite Widgets</span>
                      <span className="text-[9px] text-amber-600/70 font-normal">Quick Access</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {favoriteWidgets
                        .filter((type) => !disabledWidgets.includes(type))
                        .map((type) => {
                          return (
                            <div
                              key={`fav_${type}`}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: type }));
                                e.dataTransfer.effectAllowed = "copy";
                              }}
                              onClick={() => handleAddElement(type)}
                              className="relative flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-white p-2.5 shadow-xs hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                            >
                              <button
                                type="button"
                                onClick={(e) => toggleFavoriteWidget(type, e)}
                                className="absolute top-1 right-1 text-amber-500 text-[10px] hover:scale-125 transition"
                                title="Remove from favorites"
                              >
                                ★
                              </button>
                              {type === "container" && <ContainerBoxIcon />}
                              {type === "heading" && <HeadingBoxIcon />}
                              {type === "text" && <TextBoxIcon />}
                              {type === "image" && <ImageBoxIcon />}
                              {type === "button" && <ButtonBoxIcon />}
                              {type === "posts" && <PostsBoxIcon />}
                              {type === "share-buttons" && <ShareButtonsBoxIcon />}
                              {type === "portfolio" && <PortfolioBoxIcon />}
                              {type === "slides" && <SlidesBoxIcon />}
                              {type === "form" && <FormBoxIcon />}
                              {type === "login" && <LoginBoxIcon />}
                              {type === "nav-menu" && <NavMenuBoxIcon />}
                              {type === "animated-headline" && <AnimatedHeadlineBoxIcon />}
                              {type === "price-table" && <PriceTableBoxIcon />}
                              {type === "price-list" && <PriceListBoxIcon />}
                              {type === "gallery" && <GalleryBoxIcon />}
                              {type === "flip-box" && <FlipBoxIcon />}
                              {type === "call-to-action" && <CtaBoxIcon />}
                              {type === "media-carousel" && <MediaCarouselBoxIcon />}
                              {type === "testimonial-carousel" && <TestimonialBoxIcon />}
                              {type === "nested-carousel" && <NestedCarouselBoxIcon />}
                              {type === "loop-carousel" && <LoopCarouselBoxIcon />}
                              {type === "facebook-page" && <FacebookPageBoxIcon />}
                              {type === "blockquote" && <BlockquoteBoxIcon />}
                              {type === "template" && <TemplateBoxIcon />}
                              {type === "reviews" && <ReviewsBoxIcon />}
                              {type === "facebook-button" && <FacebookButtonBoxIcon />}
                              {type === "facebook-embed" && <FacebookEmbedBoxIcon />}
                              {type === "facebook-comments" && <FacebookCommentsBoxIcon />}
                              {type === "paypal-button" && <PayPalButtonBoxIcon />}
                              {type === "stripe-button" && <StripeButtonBoxIcon />}
                              {type === "lottie" && <LottieBoxIcon />}
                              {type === "code-highlight" && <CodeHighlightBoxIcon />}
                              {type === "video-playlist" && <VideoPlaylistBoxIcon />}
                              {type === "mega-menu" && <MegaMenuBoxIcon />}
                              {type === "off-canvas" && <OffCanvasBoxIcon />}
                              {type === "image-carousel" && <ImageCarouselBoxIcon />}
                              <span className="mt-1 text-[11px] font-semibold text-slate-700 capitalize group-hover:text-amber-700">
                                {type === "facebook-page"
                                  ? "Facebook Page"
                                  : type === "facebook-button"
                                  ? "FB Button"
                                  : type === "facebook-embed"
                                  ? "FB Embed"
                                  : type === "facebook-comments"
                                  ? "FB Comments"
                                  : type === "paypal-button"
                                  ? "PayPal"
                                  : type === "stripe-button"
                                  ? "Stripe"
                                  : type === "lottie"
                                  ? "Lottie"
                                  : type === "code-highlight"
                                  ? "Code Highlight"
                                  : type === "video-playlist"
                                  ? "Video Playlist"
                                  : type === "mega-menu"
                                  ? "Mega Menu"
                                  : type === "off-canvas"
                                  ? "Off Canvas"
                                  : type === "image-carousel"
                                  ? "Image Carousel"
                                  : type === "blockquote"
                                  ? "Blockquote"
                                  : type === "template"
                                  ? "Template"
                                  : type === "reviews"
                                  ? "Reviews"
                                  : type === "share-buttons"
                                  ? "Share"
                                  : type}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Container */}
                  {isWidgetLibraryVisible("container", "Container") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "container" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("container")}
                      className="relative col-span-2 flex items-center justify-center gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 shadow-xs hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("container", e)}
                        className={`absolute top-2 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("container") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("container") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("container") ? "★" : "☆"}
                      </button>
                      <ContainerBoxIcon />
                      <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800">
                        + Add Container
                      </span>
                    </div>
                  )}

                  {/* Heading */}
                  {isWidgetLibraryVisible("heading", "Heading") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "heading" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("heading")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("heading", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("heading") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("heading") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("heading") ? "★" : "☆"}
                      </button>
                      <HeadingBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Heading
                      </span>
                    </div>
                  )}

                  {/* Text */}
                  {isWidgetLibraryVisible("text", "Text") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "text" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("text")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("text", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("text") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("text") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("text") ? "★" : "☆"}
                      </button>
                      <TextBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Text
                      </span>
                    </div>
                  )}

                  {/* Image */}
                  {isWidgetLibraryVisible("image", "Image") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "image" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("image")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("image", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("image") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("image") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("image") ? "★" : "☆"}
                      </button>
                      <ImageBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Image
                      </span>
                    </div>
                  )}

                  {/* Button */}
                  {isWidgetLibraryVisible("button", "Button") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "button" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("button")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("button", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("button") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("button") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("button") ? "★" : "☆"}
                      </button>
                      <ButtonBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Button
                      </span>
                    </div>
                  )}

                  {/* Posts Widget (F-174) */}
                  {isWidgetLibraryVisible("posts", "Posts") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "posts" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("posts")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-purple-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("posts", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("posts") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("posts") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("posts") ? "★" : "☆"}
                      </button>
                      <PostsBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-purple-600">
                        Posts
                      </span>
                    </div>
                  )}

                  {/* Share Buttons Widget (F-175) */}
                  {isWidgetLibraryVisible("share-buttons", "Share Buttons") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "share-buttons" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("share-buttons")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("share-buttons", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("share-buttons") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("share-buttons") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("share-buttons") ? "★" : "☆"}
                      </button>
                      <ShareButtonsBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Share Buttons
                      </span>
                    </div>
                  )}

                  {/* Portfolio Widget (F-176) */}
                  {isWidgetLibraryVisible("portfolio", "Portfolio") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "portfolio" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("portfolio")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-indigo-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("portfolio", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("portfolio") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("portfolio") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("portfolio") ? "★" : "☆"}
                      </button>
                      <PortfolioBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                        Portfolio
                      </span>
                    </div>
                  )}

                  {/* Slides Widget (F-177) */}
                  {isWidgetLibraryVisible("slides", "Slides") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "slides" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("slides")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-pink-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("slides", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("slides") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("slides") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("slides") ? "★" : "☆"}
                      </button>
                      <SlidesBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-pink-600">
                        Slides
                      </span>
                    </div>
                  )}

                  {/* Form Widget (F-178) */}
                  {isWidgetLibraryVisible("form", "Form") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "form" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("form")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("form", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("form") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("form") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("form") ? "★" : "☆"}
                      </button>
                      <FormBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-emerald-600">
                        Form
                      </span>
                    </div>
                  )}

                  {/* Login Widget (F-179) */}
                  {isWidgetLibraryVisible("login", "Login") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "login" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("login")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("login", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("login") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("login") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("login") ? "★" : "☆"}
                      </button>
                      <LoginBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Login
                      </span>
                    </div>
                  )}

                  {/* Nav Menu Widget (F-180) */}
                  {isWidgetLibraryVisible("nav-menu", "Nav Menu") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "nav-menu" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("nav-menu")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("nav-menu", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("nav-menu") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("nav-menu") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("nav-menu") ? "★" : "☆"}
                      </button>
                      <NavMenuBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-amber-600">
                        Nav Menu
                      </span>
                    </div>
                  )}

                  {/* Animated Headline Widget (F-181) */}
                  {isWidgetLibraryVisible("animated-headline", "Animated Headline") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "animated-headline" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("animated-headline")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-violet-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("animated-headline", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("animated-headline") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("animated-headline") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("animated-headline") ? "★" : "☆"}
                      </button>
                      <AnimatedHeadlineBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-violet-600">
                        Animated Text
                      </span>
                    </div>
                  )}

                  {/* Price Table Widget (F-182) */}
                  {isWidgetLibraryVisible("price-table", "Price Table") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "price-table" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("price-table")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("price-table", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("price-table") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("price-table") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("price-table") ? "★" : "☆"}
                      </button>
                      <PriceTableBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-emerald-600">
                        Price Table
                      </span>
                    </div>
                  )}

                  {/* Price List Widget (F-183) */}
                  {isWidgetLibraryVisible("price-list", "Price List") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "price-list" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("price-list")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-teal-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("price-list", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("price-list") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("price-list") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("price-list") ? "★" : "☆"}
                      </button>
                      <PriceListBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-teal-600">
                        Price List
                      </span>
                    </div>
                  )}

                  {/* Gallery Widget (F-184) */}
                  {isWidgetLibraryVisible("gallery", "Gallery") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "gallery" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("gallery")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-pink-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("gallery", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("gallery") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("gallery") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("gallery") ? "★" : "☆"}
                      </button>
                      <GalleryBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-pink-600">
                        Gallery
                      </span>
                    </div>
                  )}

                  {/* Flip Box Widget (F-185) */}
                  {isWidgetLibraryVisible("flip-box", "Flip Box") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "flip-box" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("flip-box")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("flip-box", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("flip-box") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("flip-box") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("flip-box") ? "★" : "☆"}
                      </button>
                      <FlipBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-amber-600">
                        Flip Box
                      </span>
                    </div>
                  )}

                  {/* Call to Action Widget (F-186) */}
                  {isWidgetLibraryVisible("call-to-action", "Call to Action") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "call-to-action" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("call-to-action")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-rose-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("call-to-action", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("call-to-action") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("call-to-action") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("call-to-action") ? "★" : "☆"}
                      </button>
                      <CtaBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-rose-600">
                        Call to Action
                      </span>
                    </div>
                  )}

                  {/* Media Carousel Widget (F-187) */}
                  {isWidgetLibraryVisible("media-carousel", "Media Carousel") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "media-carousel" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("media-carousel")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-cyan-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("media-carousel", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("media-carousel") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("media-carousel") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("media-carousel") ? "★" : "☆"}
                      </button>
                      <MediaCarouselBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-cyan-600">
                        Media Carousel
                      </span>
                    </div>
                  )}

                  {/* Testimonial Carousel Widget (F-188) */}
                  {isWidgetLibraryVisible("testimonial-carousel", "Testimonials") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "testimonial-carousel" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("testimonial-carousel")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("testimonial-carousel", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("testimonial-carousel") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("testimonial-carousel") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("testimonial-carousel") ? "★" : "☆"}
                      </button>
                      <TestimonialBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-emerald-600">
                        Testimonials
                      </span>
                    </div>
                  )}

                  {/* Nested Carousel Widget (F-189) */}
                  {isWidgetLibraryVisible("nested-carousel", "Nested Carousel") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "nested-carousel" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("nested-carousel")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-indigo-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("nested-carousel", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("nested-carousel") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("nested-carousel") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("nested-carousel") ? "★" : "☆"}
                      </button>
                      <NestedCarouselBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                        Nested Carousel
                      </span>
                    </div>
                  )}

                  {/* Loop Carousel Widget (F-190) */}
                  {isWidgetLibraryVisible("loop-carousel", "Loop Carousel") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "loop-carousel" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("loop-carousel")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-purple-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("loop-carousel", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("loop-carousel") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("loop-carousel") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("loop-carousel") ? "★" : "☆"}
                      </button>
                      <LoopCarouselBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-purple-600">
                        Loop Carousel
                      </span>
                    </div>
                  )}

                  {/* Table of Contents Widget (F-191) */}
                  {isWidgetLibraryVisible("table-of-contents", "Table of Contents") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "table-of-contents" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("table-of-contents")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-teal-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("table-of-contents", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("table-of-contents") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("table-of-contents") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("table-of-contents") ? "★" : "☆"}
                      </button>
                      <TocBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-teal-600">
                        Table of Contents
                      </span>
                    </div>
                  )}

                  {/* Countdown Widget (F-192) */}
                  {isWidgetLibraryVisible("countdown", "Countdown") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "countdown" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("countdown")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("countdown", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("countdown") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("countdown") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("countdown") ? "★" : "☆"}
                      </button>
                      <CountdownBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-amber-600">
                        Countdown
                      </span>
                    </div>
                  )}

                  {/* Facebook Page Widget (F-193) */}
                  {isWidgetLibraryVisible("facebook-page", "Facebook Page") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "facebook-page" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("facebook-page")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("facebook-page", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("facebook-page") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("facebook-page") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("facebook-page") ? "★" : "☆"}
                      </button>
                      <FacebookPageBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Facebook Page
                      </span>
                    </div>
                  )}

                  {/* Blockquote Widget (F-194) */}
                  {isWidgetLibraryVisible("blockquote", "Blockquote") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "blockquote" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("blockquote")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-indigo-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("blockquote", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("blockquote") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("blockquote") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("blockquote") ? "★" : "☆"}
                      </button>
                      <BlockquoteBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                        Blockquote
                      </span>
                    </div>
                  )}

                  {/* Template Widget (F-195) */}
                  {isWidgetLibraryVisible("template", "Template") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "template" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("template")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-purple-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("template", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("template") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("template") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("template") ? "★" : "☆"}
                      </button>
                      <TemplateBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-purple-600">
                        Template
                      </span>
                    </div>
                  )}

                  {/* Reviews Widget (F-196) */}
                  {isWidgetLibraryVisible("reviews", "Reviews") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "reviews" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("reviews")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("reviews", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("reviews") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("reviews") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("reviews") ? "★" : "☆"}
                      </button>
                      <ReviewsBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-amber-600">
                        Reviews
                      </span>
                    </div>
                  )}



                  {/* PayPal Button Widget (F-200) */}
                  {isWidgetLibraryVisible("paypal-button", "PayPal Button") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "paypal-button" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("paypal-button")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("paypal-button", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("paypal-button") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("paypal-button") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("paypal-button") ? "★" : "☆"}
                      </button>
                      <PayPalButtonBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-amber-600">
                        PayPal
                      </span>
                    </div>
                  )}

                  {/* Stripe Button Widget (F-201) */}
                  {isWidgetLibraryVisible("stripe-button", "Stripe Button") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "stripe-button" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("stripe-button")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-indigo-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("stripe-button", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("stripe-button") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("stripe-button") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("stripe-button") ? "★" : "☆"}
                      </button>
                      <StripeButtonBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                        Stripe
                      </span>
                    </div>
                  )}

                  {/* Lottie Widget (F-202) */}
                  {isWidgetLibraryVisible("lottie", "Lottie Animation") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "lottie" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("lottie")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-teal-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("lottie", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("lottie") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("lottie") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("lottie") ? "★" : "☆"}
                      </button>
                      <LottieBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-teal-600">
                        Lottie
                      </span>
                    </div>
                  )}

                  {/* Code Highlight Widget (F-203) */}
                  {isWidgetLibraryVisible("code-highlight", "Code Highlight") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "code-highlight" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("code-highlight")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-purple-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("code-highlight", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("code-highlight") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("code-highlight") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("code-highlight") ? "★" : "☆"}
                      </button>
                      <CodeHighlightBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-purple-600">
                        Code Highlight
                      </span>
                    </div>
                  )}

                  {/* Video Playlist Widget (F-204) */}
                  {isWidgetLibraryVisible("video-playlist", "Video Playlist") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "video-playlist" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("video-playlist")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-red-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("video-playlist", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("video-playlist") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("video-playlist") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("video-playlist") ? "★" : "☆"}
                      </button>
                      <VideoPlaylistBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-red-600">
                        Video Playlist
                      </span>
                    </div>
                  )}

                  {/* Mega Menu Widget (F-205) */}
                  {isWidgetLibraryVisible("mega-menu", "Mega Menu") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "mega-menu" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("mega-menu")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("mega-menu", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("mega-menu") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("mega-menu") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("mega-menu") ? "★" : "☆"}
                      </button>
                      <MegaMenuBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Mega Menu
                      </span>
                    </div>
                  )}

                  {/* Off Canvas Widget (F-206) */}
                  {isWidgetLibraryVisible("off-canvas", "Off Canvas") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "off-canvas" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("off-canvas")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("off-canvas", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("off-canvas") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("off-canvas") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("off-canvas") ? "★" : "☆"}
                      </button>
                      <OffCanvasBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-amber-600">
                        Off Canvas
                      </span>
                    </div>
                  )}

                  {/* Image Carousel Widget (F-210) */}
                  {isWidgetLibraryVisible("image-carousel", "Image Carousel") && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "image-carousel" }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => handleAddElement("image-carousel")}
                      className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteWidget("image-carousel", e)}
                        className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                          favoriteWidgets.includes("image-carousel") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteWidgets.includes("image-carousel") ? "Remove favorite" : "Mark as favorite"}
                      >
                        {favoriteWidgets.includes("image-carousel") ? "★" : "☆"}
                      </button>
                      <ImageCarouselBoxIcon />
                      <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Image Carousel
                      </span>
                    </div>
                  )}

                  {/* Dynamically Render All Additional Registered Widgets (F-212 to F-222 & future widgets) */}
                  {ALL_WIDGET_REGISTRY.filter((w) => ![
                    "container", "heading", "text", "image", "button", "posts", "share-buttons", "portfolio", "slides", "form",
                    "login", "nav-menu", "animated-headline", "price-table", "price-list", "gallery", "flip-box", "call-to-action",
                    "media-carousel", "testimonial-carousel", "nested-carousel", "loop-carousel", "table-of-contents", "countdown",
                    "facebook-page", "blockquote", "template", "reviews", "facebook-button", "facebook-embed", "facebook-comments",
                    "paypal-button", "stripe-button", "lottie", "code-highlight", "video-playlist", "mega-menu", "off-canvas", "image-carousel"
                  ].includes(w.type)).map((widget) => {
                    if (!isWidgetLibraryVisible(widget.type, widget.name)) return null;
                    const isFav = favoriteWidgets.includes(widget.type);
                    return (
                      <div
                        key={widget.type}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: widget.type }));
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => handleAddElement(widget.type)}
                        className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 group cursor-grab transition"
                      >
                        <button
                          type="button"
                          onClick={(e) => toggleFavoriteWidget(widget.type, e)}
                          className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                            isFav ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                          }`}
                          title={isFav ? "Remove favorite" : "Mark as favorite"}
                        >
                          {isFav ? "★" : "☆"}
                        </button>
                        <span className="text-2xl">{widget.icon || "📦"}</span>
                        <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600 text-center line-clamp-1">
                          {widget.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Reusable Components Section (F-005) */}
                {!disabledWidgets.includes("reusable-components") && (
                  <div className="col-span-2 pt-3 border-t border-slate-200 mt-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-2 flex items-center gap-1">
                      <span>🧩</span> Reusable Components
                    </h4>
                    {Object.keys(components).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/30 p-2.5 text-center text-[10px] text-purple-600/70">
                        Select any element & click "Save as Comp" to create reusable components.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {Object.entries(components).map(([compId, comp]) => (
                          <button
                            key={compId}
                            type="button"
                            onClick={() => handleAddInstanceFromComponent(compId)}
                            className="w-full flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/50 px-2.5 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-100 hover:border-purple-300"
                          >
                            <span className="truncate">{comp.name}</span>
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-200/60 px-1.5 py-0.5 rounded">
                              + Add Instance
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : leftSidebarTab === "navigator" ? (
              <div className="space-y-3">
                {/* Structure Search Input (F-030) */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={structureSearchQuery}
                    onChange={(e) => setStructureSearchQuery(e.target.value)}
                    placeholder="Search structure layers..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition shadow-sm"
                  />
                  {structureSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStructureSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 text-xs"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {structureSearchQuery.trim() !== "" ? (
                  /* Filtered Search Results */
                  <div className="space-y-1">
                    {flattenAndSearchElements(elements, structureSearchQuery).length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 italic">
                        No structure elements matching "{structureSearchQuery}"
                      </div>
                    ) : (
                      flattenAndSearchElements(elements, structureSearchQuery).map(({ element, path }) => (
                        <div
                          key={element.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectElement(element.id, e);
                          }}
                          className={`flex items-center justify-between rounded-lg p-2 text-xs transition cursor-pointer border ${
                            selectedId === element.id || selectedIds.includes(element.id)
                              ? "bg-blue-600 font-bold text-white border-blue-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs">
                              {element.type === "container" && "📦"}
                              {element.type === "heading" && "🔤"}
                              {element.type === "text" && "📝"}
                              {element.type === "image" && "🖼️"}
                              {element.type === "button" && "🔘"}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-semibold capitalize">
                                {element.type === "heading" ? (element.content ? `"${element.content.slice(0, 15)}"` : "Heading") :
                                 element.type === "text" ? (element.content ? `"${element.content.slice(0, 15)}"` : "Text") :
                                 element.type === "button" ? (element.content ? `"${element.content.slice(0, 15)}"` : "Button") :
                                 element.type === "image" ? (element.alt ? `Image (${element.alt})` : "Image") :
                                 element.type === "container" ? "Container" : element.type}
                              </span>
                              <span className={`text-[9px] truncate ${selectedId === element.id || selectedIds.includes(element.id) ? "text-blue-200" : "text-slate-400"}`}>
                                {path}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Full Tree Hierarchy View */
                  <div className="space-y-1">
                    {elements.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No elements on canvas.
                      </div>
                    ) : (
                      elements.map((el, idx) =>
                        renderNavigatorTreeItem(el, 0, idx === elements.length - 1)
                      )
                    )}
                  </div>
                )}
              </div>
            ) : leftSidebarTab === ("atomic" as any) ? (
              <AtomicEditor
                onClose={() => setLeftSidebarTab("elements")}
                onInsertGlobalElement={handleInsertGlobalElement}
                onInsertComponent={handleInsertReusableComponent}
              />
            ) : (
              <TemplateLibrary
                apiUrl={apiUrl}
                onInsertTemplate={handleInsertTemplate}
                onOpenSaveTemplate={openSaveTemplateDialog}
              />
            )}

          </aside>
        )}

        {/* ========================================== */}
        {/* Center: White Canvas Container              */}
        {/* ========================================== */}
        <main
          onClick={() => handleSelectElement(null)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => handleDropElement(e, null, "after")}
          className="relative flex flex-1 justify-center items-start overflow-y-auto bg-[#f1f5f9] p-6 sm:p-10"
        >
          {/* Dynamic Hover Styles Block (F-036) */}
          <style dangerouslySetInnerHTML={{ __html: generateElementsHoverCSS(elements, activeDevice) }} />

          {/* Floating Exit Full Screen Overlay Button (F-015) */}
          {isFullScreenCanvas && (
            <div className="absolute top-4 right-6 z-50">
              <button
                type="button"
                onClick={() => setIsFullScreenCanvas(false)}
                className="flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white px-4 py-2 text-xs font-bold shadow-lg border border-slate-700 hover:bg-black hover:scale-105 transition"
                title="Exit Full Screen Mode (Esc)"
              >
                <span>✕</span>
                <span>Exit Full Screen (Esc)</span>
              </button>
            </div>
          )}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => handleDropElement(e, null, "after")}
            style={{
              backgroundColor: pageSettings.backgroundColor || "#ffffff",
              backgroundImage: userPreferences.gridOverlay
                ? "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)"
                : undefined,
              backgroundSize: userPreferences.gridOverlay ? "20px 20px" : undefined,
            }}
            className={`relative w-full transition-all duration-300 min-h-[750px] h-auto shrink-0 my-2 rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm pb-20 ${
              activeDevice === "mobile"
                ? "max-w-[380px]"
                : activeDevice === "tablet"
                ? "max-w-[768px]"
                : "max-w-[1024px]"
            }`}
          >
            {/* Dynamic Website Navigation Header in Preview Mode */}
            {isPreview ? (
              <div className="space-y-6">
                <header className="sticky top-0 z-30 w-full rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm transition-all overflow-hidden">
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                    {/* Website Brand / Logo */}
                    <div
                      className="flex items-center gap-2.5 cursor-pointer"
                      onClick={() => {
                        const homePage = pages.find((p) => p.isHome || p.slug === "/") || pages[0];
                        if (homePage) handlePreviewPageNavigate(homePage);
                      }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs shadow-md">
                        {(website?.name || pageSettings?.title || "W").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-extrabold tracking-tight text-slate-900 block leading-tight">
                          {globalSettings?.siteIdentity?.name || website?.name || "My Website"}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Website Preview
                        </span>
                      </div>
                    </div>

                    {/* Desktop Navigation Links */}
                    {pages.length > 0 && (
                      <nav className="hidden sm:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
                        {pages.map((p) => {
                          const isCurrent = (activePreviewPageId || pages[0]?.id) === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handlePreviewPageNavigate(p)}
                              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                isCurrent
                                  ? "bg-white text-blue-600 shadow-sm border border-slate-200/60 font-extrabold"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                              }`}
                            >
                              {p.name || p.pageSettings?.title || "Untitled"}
                            </button>
                          );
                        })}
                      </nav>
                    )}

                    {/* Mobile Hamburger Toggle Button */}
                    {pages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        aria-label="Toggle Navigation Menu"
                      >
                        <span className="text-sm">{mobileMenuOpen ? "✕" : "☰"}</span>
                      </button>
                    )}
                  </div>

                  {/* Mobile Dropdown Menu Drawer */}
                  {mobileMenuOpen && pages.length > 0 && (
                    <div className="sm:hidden border-t border-slate-200 bg-slate-50 p-2.5 space-y-1 animate-fadeIn">
                      {pages.map((p) => {
                        const isCurrent = (activePreviewPageId || pages[0]?.id) === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              handlePreviewPageNavigate(p);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center justify-between ${
                              isCurrent
                                ? "bg-blue-600 text-white font-extrabold shadow-sm"
                                : "text-slate-700 hover:bg-slate-200/70"
                            }`}
                          >
                            <span>{p.name || p.pageSettings?.title || "Untitled"}</span>
                            <span className="text-[10px] opacity-70 font-mono">{p.slug}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </header>

                {/* Currently Selected Preview Page Content */}
                {(() => {
                  const currentPreviewPage = pages.find((p) => p.id === activePreviewPageId) || pages[0];
                  const activeElements = currentPreviewPage?.elements || (currentPreviewPage?.id === activePageId ? elements : []);

                  if (pageSettings.isMaintenanceMode) {
                    return (
                      <div className="flex min-h-[450px] flex-col items-center justify-center rounded-2xl bg-amber-50/60 border border-amber-200/80 p-8 text-center shadow-inner my-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-md mb-4 animate-pulse">
                          <span className="text-3xl">🛠️</span>
                        </div>
                        <span className="inline-block rounded-full bg-amber-200/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2">
                          Temporary Maintenance State
                        </span>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                          Website Under Maintenance
                        </h2>
                        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-600">
                          This website is currently undergoing scheduled maintenance and upgrades. Please check back shortly!
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsPreview(false)}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-black transition"
                          >
                            Return to Editor
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (!activeElements || activeElements.length === 0) {
                    return (
                      <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center p-8 bg-slate-50/50">
                        <p className="text-sm font-bold text-slate-700">
                          Page "{currentPreviewPage?.name || "Untitled"}" is Empty
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Switch back to the editor to add elements to this page.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 py-2">
                      {activeElements.map((el) => renderElementTree(el))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
                {/* Blank Page Layout Bar (F-016) */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6 select-none opacity-60 hover:opacity-100 transition">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>📄</span>
                    <span>Blank Page Canvas Layout ({pages.find((p) => p.id === activePageId)?.name || "Home"})</span>
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    Page Editor (No Theme Chrome)
                  </span>
                </div>

                {elements.length === 0 ? (
                  <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center p-8">
                    <p className="text-sm font-bold text-slate-700">
                      Your Canvas is Empty
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Click any element from the left panel to start building.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {elements.map((el) => renderElementTree(el))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* ========================================== */}
        {/* Right Sidebar: SETTINGS & STYLING           */}
        {/* ========================================== */}
        {!isPreview && (
          <aside className="w-80 shrink-0 border-l border-slate-200 bg-white p-5 overflow-y-auto shadow-sm">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              SETTINGS & STYLING
            </h2>

            {selectedIds.length > 1 && (
              <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-2 text-center text-xs font-semibold text-blue-700">
                Multi-Select ({selectedIds.length} elements selected)
              </div>
            )}

            {selectedElementAny ? (
              <div className="space-y-5">
                {/* Element Type Header & Quick Actions */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    {selectedElementAny.type}
                  </span>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <button
                      onClick={(e) => handleCopyStyle(selectedElementAny.id, e)}
                      className="text-slate-600 hover:text-blue-600 hover:underline"
                      title="Copy Element Style"
                    >
                      Copy Style
                    </button>
                    {copiedStyles && (
                      <button
                        onClick={(e) => handlePasteStyle(selectedElementAny.id, e)}
                        className="text-emerald-600 hover:underline"
                        title="Paste Copied Style"
                      >
                        Paste Style
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDuplicateElement(selectedElementAny.id, e)}
                      className="text-blue-600 hover:underline"
                    >
                      Duplicate
                    </button>
                    <button
onClick={(e) => handleDeleteElement(selectedElementAny.id, e)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Element State Selector (F-036) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Element State
                    </span>
                    {activeElementState === "hover" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Editing :hover State
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/70 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveElementState("normal")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                        activeElementState === "normal"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveElementState("hover")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                        activeElementState === "hover"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Hover (:hover)
                    </button>
                  </div>
                </div>

                {/* Container Specific Flexbox Layout Controls */}
                {selectedElementAny.type === "container" && (
                  <div className="space-y-4">
                    {/* Direction */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Direction
                      </label>
                      <select
                        value={selectedElementAny.layout?.direction || "column"}
                        onChange={(e) => updateSelectedLayout("direction", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="column">Column (Vertical)</option>
                        <option value="row">Row (Horizontal)</option>
                      </select>
                    </div>

                    {/* Justify Content */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Justify Content
                      </label>
                      <select
                        value={selectedElementAny.layout?.justifyContent || "flex-start"}
                        onChange={(e) => updateSelectedLayout("justifyContent", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="flex-start">Start (flex-start)</option>
                        <option value="center">Center</option>
                        <option value="flex-end">End (flex-end)</option>
                        <option value="space-between">Space Between</option>
                        <option value="space-around">Space Around</option>
                        <option value="space-evenly">Space Evenly</option>
                      </select>
                    </div>

                    {/* Align Items */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Align Items
                      </label>
                      <select
                        value={selectedElementAny.layout?.alignItems || "stretch"}
                        onChange={(e) => updateSelectedLayout("alignItems", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="stretch">Stretch</option>
                        <option value="flex-start">Start (flex-start)</option>
                        <option value="center">Center</option>
                        <option value="flex-end">End (flex-end)</option>
                      </select>
                    </div>

                    {/* Gap (px) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Gap (px)
                      </label>
                      <ScrubbableNumberInput
                        value={selectedElementAny.layout?.gap ?? 10}
                        onChange={(val) => updateSelectedLayout("gap", Number(val))}
                        min={0}
                        step={1}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Universal Sizing, Background & Spacing Controls (For ALL Elements) */}
                <div className="space-y-4 pt-2">
                  {/* Width & Height */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Width
                      </label>
                      <select
                        value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "width") || "auto"}
                        onChange={(e) => updateSelectedStyle("width", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="100%">100%</option>
                        <option value="75%">75%</option>
                        <option value="50%">50%</option>
                        <option value="33%">33%</option>
                        <option value="25%">25%</option>
                        <option value="fit-content">Fit Content</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Height
                      </label>
                      <select
                        value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "height") || "auto"}
                        onChange={(e) => updateSelectedStyle("height", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="100px">100px</option>
                        <option value="200px">200px</option>
                        <option value="300px">300px</option>
                        <option value="400px">400px</option>
                        <option value="500px">500px</option>
                        <option value="100%">100%</option>
                      </select>
                    </div>
                  </div>

                  {/* Universal Alignment Control (For ALL Elements & Widgets including Mega Menu) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alignment
                    </label>
                    <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
                      {(["left", "center", "right", "justify"] as const).map((align) => {
                        const currentAlign =
                          getControlStyleValue(
                            selectedElementAny,
                            activeDevice,
                            activeElementState,
                            "textAlign"
                          ) || "left";
                        const isActive = currentAlign === align;
                        return (
                          <button
                            key={align}
                            type="button"
                            onClick={() => {
                              updateSelectedStyle("textAlign", align);
                              const flexJustify =
                                align === "left"
                                  ? "flex-start"
                                  : align === "right"
                                  ? "flex-end"
                                  : align === "center"
                                  ? "center"
                                  : "space-between";
                              updateSelectedStyle("justifyContent", flexJustify);
                              if (selectedElementAny.type === "container" || selectedElementAny.layout) {
                                updateSelectedLayout("justifyContent", flexJustify);
                              }
                            }}
                            className={`rounded py-1 text-xs font-bold capitalize transition ${
                              isActive
                                ? "bg-white text-blue-600 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {align}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Background Color
                      </label>
                      {isControlStyleConfigured(selectedElementAny, activeDevice, activeElementState, "backgroundColor") && (
                        <button
                          type="button"
                          onClick={() => resetSelectedStyle("backgroundColor")}
                          title="Reset Background Color to Default"
                          className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                        >
                          ↺ Reset
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "backgroundColor") || "#ffffff"}
                        onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "backgroundColor") || "#ffffff"}
                        onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSampleColor((hex) => updateSelectedStyle("backgroundColor", hex))}
                        title="Sample Color from Screen / Image"
                        className="h-8 px-2 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1 shrink-0"
                      >
                        <span>🧪</span>
                        <span className="text-[10px]">Sample</span>
                      </button>
                    </div>
                  </div>

                  {/* Background Image & Overlay Controls */}
                  <BackgroundImageInspector el={selectedElementAny} updateStyle={updateSelectedStyle} />

                  {/* Advanced Spacing Controls for ALL Elements */}
                  {render4SideSpacingControl("Margin", "margin", isMarginLinked, setIsMarginLinked)}
                  {render4SideSpacingControl("Padding", "padding", isPaddingLinked, setIsPaddingLinked)}
                </div>

                {/* Posts Specific Layout & Content Controls (F-174) */}
                {selectedElementAny.type === "posts" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                        <span>📰</span> Posts Layout Controls
                      </h3>
                    </div>

                    {/* Columns Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Grid Columns
                      </label>
                      <select
                        value={selectedElementAny.postsColumns || 3}
                        onChange={(e) => updateSelectedProp("postsColumns", parseInt(e.target.value, 10))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value={1}>1 Column (Stack)</option>
                        <option value={2}>2 Columns</option>
                        <option value={3}>3 Columns</option>
                        <option value={4}>4 Columns</option>
                      </select>
                    </div>

                    {/* Gap / Spacing */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Grid Gap (Spacing)
                      </label>
                      <select
                        value={selectedElementAny.postsGap ?? 20}
                        onChange={(e) => updateSelectedProp("postsGap", parseInt(e.target.value, 10))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value={12}>12px (Compact)</option>
                        <option value={16}>16px (Small)</option>
                        <option value={20}>20px (Medium)</option>
                        <option value={24}>24px (Large)</option>
                        <option value={32}>32px (Extra Large)</option>
                      </select>
                    </div>

                    {/* Featured Image Height */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Featured Image Height
                      </label>
                      <select
                        value={selectedElementAny.postsImageHeight || "180px"}
                        onChange={(e) => updateSelectedProp("postsImageHeight", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="140px">140px (Small)</option>
                        <option value="180px">180px (Standard)</option>
                        <option value="220px">220px (Tall)</option>
                        <option value="260px">260px (Extra Tall)</option>
                        <option value="auto">Auto (Natural Ratio)</option>
                      </select>
                    </div>

                    {/* Alignment */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Content Alignment
                      </label>
                      <select
                        value={selectedElementAny.postsAlignment || "left"}
                        onChange={(e) => updateSelectedProp("postsAlignment", e.target.value as any)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="left">Left Aligned</option>
                        <option value="center">Center Aligned</option>
                        <option value="right">Right Aligned</option>
                      </select>
                    </div>

                    {/* Visibility Toggles */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">
                        Display Elements
                      </span>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.postsShowImage !== false}
                          onChange={(e) => updateSelectedProp("postsShowImage", e.target.checked)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>Featured Image</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.postsShowDate !== false}
                          onChange={(e) => updateSelectedProp("postsShowDate", e.target.checked)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>Date & Author Metadata</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.postsShowExcerpt !== false}
                          onChange={(e) => updateSelectedProp("postsShowExcerpt", e.target.checked)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>Post Excerpt</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.postsShowReadMore !== false}
                          onChange={(e) => updateSelectedProp("postsShowReadMore", e.target.checked)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>Read More Link</span>
                      </label>
                    </div>

                    {/* Post Items Editor */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-700">
                          Post Items ({selectedElementAny.posts?.length || 0})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const currentPosts = selectedElementAny.posts || [];
                            const newPost: PostItem = {
                              id: "post_" + Math.random().toString(36).substring(2, 9),
                              title: "New Blog Article",
                              excerpt: "Short excerpt or summary of the blog post.",
                              date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                              author: "Author",
                              image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80",
                              readMoreText: "Read Article →",
                              readMoreUrl: "#",
                            };
                            updateSelectedProp("posts", [...currentPosts, newPost]);
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shadow-xs"
                        >
                          + Add Post
                        </button>
                      </div>

<div className="space-y-3">
                        {(selectedElementAny.posts || []).map((post, idx) => (
                          <div key={post.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="text-[11px] font-bold text-slate-800 truncate max-w-[170px]">
                                Post #{idx + 1}: {post.title || "Untitled"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedPosts = (selectedElementAny.posts || []).filter((p) => p.id !== post.id);
                                  updateSelectedProp("posts", updatedPosts);
                                }}
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline"
                              >
                                Remove
                              </button>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Title
                              </label>
                              <input
                                type="text"
                                value={post.title}
                                onChange={(e) => {
                                  const updatedPosts = (selectedElementAny.posts || []).map((p) =>
                                    p.id === post.id ? { ...p, title: e.target.value } : p
                                  );
                                  updateSelectedProp("posts", updatedPosts);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Excerpt
                              </label>
                              <textarea
                                rows={2}
                                value={post.excerpt}
                                onChange={(e) => {
                                  const updatedPosts = (selectedElementAny.posts || []).map((p) =>
                                    p.id === post.id ? { ...p, excerpt: e.target.value } : p
                                  );
                                  updateSelectedProp("posts", updatedPosts);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Date
                                </label>
                                <input
                                  type="text"
                                  value={post.date || ""}
                                  onChange={(e) => {
                                    const updatedPosts = (selectedElementAny.posts || []).map((p) =>
                                      p.id === post.id ? { ...p, date: e.target.value } : p
                                    );
                                    updateSelectedProp("posts", updatedPosts);
                                  }}
                                  placeholder="Sep 1, 2026"
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Author
                                </label>
                                <input
                                  type="text"
                                  value={post.author || ""}
                                  onChange={(e) => {
                                    const updatedPosts = (selectedElementAny.posts || []).map((p) =>
                                      p.id === post.id ? { ...p, author: e.target.value } : p
                                    );
                                    updateSelectedProp("posts", updatedPosts);
                                  }}
                                  placeholder="Jane Doe"
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Widget Specific Inspector */}
                {selectedElementAny.type === "image" && (
                  <ImageWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                    updateStyle={updateSelectedStyle}
                  />
                )}

                {/* Video Widget Specific Inspector */}
                {selectedElementAny.type === "video" && (
                  <VideoWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Gallery Widget Specific Inspector */}
                {(selectedElementAny.type === "gallery" || selectedElementAny.type === "basic-gallery") && (
                  <GalleryWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Slides Widget Specific Inspector */}
                {selectedElementAny.type === "slides" && (
                  <SlidesWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Share Buttons Specific Inspector */}
                {selectedElementAny.type === "share-buttons" && (
                  <ShareButtonsInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Form Builder Specific Inspector */}
                {selectedElementAny.type === "form" && (
                  <FormWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Reviews / Testimonials Specific Inspector */}
                {(selectedElementAny.type === "reviews" || selectedElementAny.type === "testimonial-carousel") && (
                  <ReviewsWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Video Playlist Specific Inspector */}
                {selectedElementAny.type === "video-playlist" && (
                  <VideoPlaylistInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Audio Playlist Specific Inspector */}
                {selectedElementAny.type === "audio-playlist" && (
                  <AudioPlaylistInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Navigation Menu Specific Inspector */}
                {selectedElementAny.type === "nav-menu" && (
                  <NavMenuWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Countdown Specific Inspector */}
                {selectedElementAny.type === "countdown" && (
                  <CountdownWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Lottie Specific Inspector */}
                {selectedElementAny.type === "lottie" && (
                  <LottieWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Code Highlight Specific Inspector */}
                {selectedElementAny.type === "code-highlight" && (
                  <CodeHighlightWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Button Inspector */}
                {selectedElementAny.type === "button" && (
                  <ButtonWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                    updateStyle={updateSelectedStyle}
                  />
                )}

                {/* Portfolio Inspector */}
                {selectedElementAny.type === "portfolio" && (
                  <PortfolioWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Login Inspector */}
                {selectedElementAny.type === "login" && (
                  <LoginWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Animated Text Inspector */}
                {selectedElementAny.type === "animated-headline" && (
                  <AnimatedTextWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Price Table Inspector */}
                {selectedElementAny.type === "price-table" && (
                  <PriceTableWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Price List Inspector */}
                {selectedElementAny.type === "price-list" && (
                  <PriceListWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Flip Box Inspector */}
                {selectedElementAny.type === "flip-box" && (
                  <FlipBoxWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Call to Action Inspector */}
                {selectedElementAny.type === "call-to-action" && (
                  <CTAWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Media & Loop Carousel Inspector */}
                {(selectedElementAny.type === "media-carousel" || selectedElementAny.type === "loop-carousel" || selectedElementAny.type === "basic-media-carousel" || selectedElementAny.type === "image-carousel") && (
                  <MediaCarouselWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Table of Contents Inspector */}
                {selectedElementAny.type === "table-of-contents" && (
                  <TOCWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Facebook Widgets Inspector */}
                {(selectedElementAny.type === "facebook-page" || selectedElementAny.type === "facebook-button" || selectedElementAny.type === "facebook-embed" || selectedElementAny.type === "facebook-comments") && (
                  <FacebookWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Blockquote Inspector */}
                {selectedElementAny.type === "blockquote" && (
                  <BlockquoteWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Payment Widgets Inspector (PayPal & Stripe) */}
                {(selectedElementAny.type === "paypal-button" || selectedElementAny.type === "stripe-button" || selectedElementAny.type === "paypal" || selectedElementAny.type === "stripe") && (
                  <PaymentWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* WooCommerce Widgets Inspector */}
                {(selectedElementAny.type === "wc-product-title" || selectedElementAny.type === "wc-product-price" || selectedElementAny.type === "wc-product-images" || selectedElementAny.type === "wc-add-to-cart" || selectedElementAny.type === "wc-product-rating") && (
                  <WooCommerceWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}


{selectedElementAny.type !== "container" && selectedElementAny.type !== "image" && selectedElementAny.type !== "video" && selectedElementAny.type !== "spacer" && selectedElementAny.type !== "divider" && selectedElementAny.type !== "icon" && selectedElementAny.type !== "counter" && selectedElementAny.type !== "gallery" && selectedElementAny.type !== "basic-gallery" && selectedElementAny.type !== "slides" && selectedElementAny.type !== "share-buttons" && selectedElementAny.type !== "form" && selectedElementAny.type !== "reviews" && selectedElementAny.type !== "testimonial-carousel" && selectedElementAny.type !== "video-playlist" && selectedElementAny.type !== "nav-menu" && selectedElementAny.type !== "countdown" && selectedElementAny.type !== "lottie" && selectedElementAny.type !== "code-highlight" && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                              {selectedElementAny.type === "html" ? "Raw HTML Editor (F-110)" : selectedElementAny.type === "shortcode" ? "Dynamic Shortcode (F-111)" : "Content"}
                            </label>
                            {selectedElementAny.type === "html" || selectedElementAny.type === "text" || selectedElementAny.type === "shortcode" ? (
                              <textarea
                                value={selectedElementAny.content || ""}
                                onChange={(e) => updateSelectedProp("content", e.target.value)}
                                rows={selectedElementAny.type === "html" ? 8 : selectedElementAny.type === "shortcode" ? 3 : 4}
                                className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${selectedElementAny.type === "html" || selectedElementAny.type === "shortcode" ? "font-mono bg-[#1E1E1E] text-slate-300 resize-y" : "bg-white text-slate-800"}`}
                                placeholder={selectedElementAny.type === "html" ? "<div class=\"custom\">\n  Your HTML\n</div>" : selectedElementAny.type === "shortcode" ? "wp_plugin_id='xyz'" : "Enter text..."}
                              />
                            ) : (
                              <input
                                type="text"
                                value={selectedElementAny.content || ""}
                                onChange={(e) => updateSelectedProp("content", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white"
                              />
                            )}
                          </div>
                        )}

                        {/* Smart Link & URL Controls */}
                        {(selectedElementAny.type === "button" || selectedElementAny.type === "image" || selectedElementAny.href !== undefined) && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase">
                              Link & Smart Actions
                            </label>
                            <input
                              type="text"
                              value={selectedElementAny.href || ""}
                              onChange={(e) => updateSelectedProp("href", e.target.value)}
                              placeholder="https://..., popup:open(id), scroll:to(id)"
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono"
                            />
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {popups.length > 0 && (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      updateSelectedProp("href", `popup:open(${e.target.value})`);
                                      e.target.value = "";
                                    }
                                  }}
                                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                                >
                                  <option value="">+ Open Popup...</option>
                                  {popups.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                type="button"
                                onClick={() => updateSelectedProp("href", "popup:close")}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Close Popup
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSelectedProp("href", "scroll:to(top)")}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Scroll to Top
                              </button>
                            </div>
                          </div>
                        )}

                        {renderAccordion(
                          "Typography & Colors",
                          "typography",
                          <div className="space-y-3">
                            {/* Font Family */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Font Family
                              </label>
                              <select
                                value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "fontFamily") || "inherit"}
                                onChange={(e) => updateSelectedStyle("fontFamily", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                              >
                                <option value="inherit">Default / Theme Font</option>
                                <option value="'Inter', sans-serif">Inter</option>
                                <option value="'Roboto', sans-serif">Roboto</option>
                                <option value="'Outfit', sans-serif">Outfit</option>
                                <option value="'Playfair Display', serif">Playfair Display</option>
                                <option value="'Open Sans', sans-serif">Open Sans</option>
                                <option value="'Montserrat', sans-serif">Montserrat</option>
                                <option value="system-ui, sans-serif">System UI</option>
                                <option value="monospace">Monospace</option>
                              </select>
                            </div>

                            {/* Font Size & Weight */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                {renderResponsiveLabel("Font Size")}
                                <input
                                  type="text"
                                  value={
                                    getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "fontSize") || "16px"
                                  }
                                  onChange={(e) =>
                                    updateSelectedStyle(
                                      "fontSize",
                                      e.target.value.endsWith("px") || e.target.value.endsWith("rem")
                                        ? e.target.value
                                        : `${e.target.value}px`
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                  placeholder="16px"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Font Weight
                                </label>
                                <select
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "fontWeight") || "normal"}
                                  onChange={(e) => updateSelectedStyle("fontWeight", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="inherit">Default</option>
                                  <option value="300">300 Light</option>
                                  <option value="400">400 Normal</option>
                                  <option value="500">500 Medium</option>
                                  <option value="600">600 Semi-Bold</option>
                                  <option value="700">700 Bold</option>
                                  <option value="800">800 Extra Bold</option>
                                </select>
                              </div>
                            </div>

                            {/* Font Style & Alignment */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Font Style
                                </label>
                                <select
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "fontStyle") || "normal"}
                                  onChange={(e) => updateSelectedStyle("fontStyle", e.target.value as any)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="italic">Italic</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Text Align
                                </label>
                                <div className="grid grid-cols-4 gap-0.5 rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                                  {(["left", "center", "right", "justify"] as const).map((align) => {
                                    const currentAlign = getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "textAlign") || "left";
                                    const isActive = currentAlign === align;
                                    return (
                                      <button
                                        key={align}
                                        type="button"
                                        onClick={() => updateSelectedStyle("textAlign", align)}
                                        className={`rounded py-1 text-[10px] font-bold uppercase transition ${
                                          isActive
                                            ? "bg-white text-blue-600 shadow-xs"
                                            : "text-slate-500 hover:text-slate-900"
                                        }`}
                                      >
                                        {align.slice(0, 1).toUpperCase()}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Line Height & Letter Spacing */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Line Height
                                </label>
                                <input
                                  type="text"
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "lineHeight") || ""}
                                  onChange={(e) => updateSelectedStyle("lineHeight", e.target.value)}
                                  placeholder="e.g. 1.5 or 24px"
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Letter Spacing
                                </label>
                                <input
                                  type="text"
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "letterSpacing") || ""}
                                  onChange={(e) => updateSelectedStyle("letterSpacing", e.target.value)}
                                  placeholder="e.g. 0.5px"
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>

                            {/* Text Transform & Decoration */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Text Transform
                                </label>
                                <select
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "textTransform") || "none"}
                                  onChange={(e) => updateSelectedStyle("textTransform", e.target.value as any)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="none">None</option>
                                  <option value="capitalize">Capitalize</option>
                                  <option value="uppercase">Uppercase</option>
                                  <option value="lowercase">Lowercase</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Decoration
                                </label>
                                <select
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "textDecoration") || "none"}
                                  onChange={(e) => updateSelectedStyle("textDecoration", e.target.value as any)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="none">None</option>
                                  <option value="underline">Underline</option>
                                  <option value="line-through">Line-Through</option>
                                </select>
                              </div>
                            </div>

                            {/* Text Color Picker */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Text Color
                                </label>
                                {isControlStyleConfigured(selectedElementAny, activeDevice, activeElementState, "color") && (
                                  <button
                                    type="button"
                                    onClick={() => resetSelectedStyle("color")}
                                    className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                                  >
                                    ↺ Reset
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "color") || "#0f172a"}
                                  onChange={(e) => updateSelectedStyle("color", e.target.value)}
                                  className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                                />
                                <input
                                  type="text"
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "color") || "#0f172a"}
                                  onChange={(e) => updateSelectedStyle("color", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {renderAccordion(
                          "Borders & Radius",
                          "borders",
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Border Style
                                </label>
                                <select
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "borderStyle") || "none"}
                                  onChange={(e) => updateSelectedStyle("borderStyle", e.target.value as any)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="none">None</option>
                                  <option value="solid">Solid</option>
                                  <option value="dashed">Dashed</option>
                                  <option value="dotted">Dotted</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Border Width
                                </label>
                                <input
                                  type="text"
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "borderWidth") || "1px"}
                                  onChange={(e) =>
                                    updateSelectedStyle(
                                      "borderWidth",
                                      e.target.value.endsWith("px") ? e.target.value : `${e.target.value}px`
                                    )
                                  }
                                  placeholder="1px"
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>

                            {/* Border Color */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Border Color
                                </label>
                                {isControlStyleConfigured(selectedElementAny, activeDevice, activeElementState, "borderColor") && (
                                  <button
                                    type="button"
                                    onClick={() => resetSelectedStyle("borderColor")}
                                    className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                                  >
                                    ↺ Reset
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "borderColor") || "#cbd5e1"}
                                  onChange={(e) => updateSelectedStyle("borderColor", e.target.value)}
                                  className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                                />
                                <input
                                  type="text"
                                  value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "borderColor") || "#cbd5e1"}
                                  onChange={(e) => updateSelectedStyle("borderColor", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>

                            {/* Border Radius */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Border Radius
                              </label>
                              <input
                                type="text"
                                value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "borderRadius") || ""}
                                onChange={(e) => updateSelectedStyle("borderRadius", e.target.value)}
                                placeholder="e.g. 8px or 50%"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        )}

                        {renderAccordion(
                          "Box Shadow & Effects",
                          "box-shadow",
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Box Shadow Presets
                              </label>
                              <select
                                value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "boxShadow") || "none"}
                                onChange={(e) => updateSelectedStyle("boxShadow", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                              >
                                <option value="none">None</option>
                                <option value="0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)">Subtle (SM)</option>
                                <option value="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)">Soft (MD)</option>
                                <option value="0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)">Medium (LG)</option>
                                <option value="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)">Large (XL)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Opacity
                              </label>
                              <input
                                type="text"
                                value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "opacity") ?? "1"}
                                onChange={(e) => updateSelectedStyle("opacity", e.target.value)}
                                placeholder="0.0 - 1.0"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      ) : activeSidebarTab === "advanced" && selectedElementAny ? (
                      <div className="space-y-4">
                        {/* Developer Options for Element (F-102, F-105 to F-109) */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700">Custom CSS ID (F-105)</label>
                            <input type="text" value={selectedElementAny.customId || ""} onChange={e => updateSelectedProp("customId", e.target.value)} placeholder="e.g. hero-section" className="w-full rounded border px-2 py-1.5 text-xs font-mono mt-1" />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700">Additional CSS Classes (F-106)</label>
                            <input type="text" value={selectedElementAny.customClass || ""} onChange={e => updateSelectedProp("customClass", e.target.value)} placeholder="e.g. shadow-lg hover:shadow-xl" className="w-full rounded border px-2 py-1.5 text-xs font-mono mt-1" />
                          </div>
                          <hr className="border-slate-200" />
                          <button onClick={() => setDevModalMode("element-css")} className="w-full rounded-lg bg-white border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-2">
                            <span className="text-blue-500">{"</>"}</span> Edit Element CSS (F-102)
                          </button>
                          <button onClick={() => setDevModalMode("css-selectors")} className="w-full rounded-lg bg-white border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-2">
                            <span className="text-pink-500">{""}</span> Edit Selectors & Pseudo (F-107)
                          </button>
                          <button onClick={() => setDevModalMode(selectedElementAny.type === "button" ? "custom-attributes" : "custom-attributes")} className="w-full rounded-lg bg-white border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-2">
                            <span className="text-emerald-500">{""}</span> Manage DOM Attributes (F-108 & F-109)
                          </button>
                        </div>
                {/* Slider Specific Controls */}
                {selectedElementAny.type === "slider" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
{/* Display Navigation Controls */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">
                        Navigation Controls
                      </span>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.slidesShowArrows !== false}
                          onChange={(e) => updateSelectedProp("slidesShowArrows", e.target.checked)}
                          className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                        />
                        <span>Prev / Next Arrow Buttons</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.slidesShowDots !== false}
                          onChange={(e) => updateSelectedProp("slidesShowDots", e.target.checked)}
                          className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                        />
                        <span>Bottom Dots Indicators</span>
                      </label>
                    </div>

                    {/* Slide Items Manager */}
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Slide Items ({selectedElementAny.slidesItems?.length || 0})</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newSlide: SlideItem = {
                              id: generateId(),
                              title: "New Highlight Slide",
                              description: "Add custom tagline, promotional announcement or banner copy.",
                              bgImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
                              bgColor: "#0f172a",
                              buttonText: "Learn More",
                              buttonUrl: "#",
                            };
                            const updated = [...(selectedElementAny.slidesItems || []), newSlide];
                            updateSelectedProp("slidesItems", updated);
                            updateSelectedProp("slidesActiveIndex", updated.length - 1);
                          }}
                          className="text-[11px] font-bold text-pink-600 hover:text-pink-800"
                        >
                          + Add Slide
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(selectedElementAny.slidesItems || []).map((slide, idx) => (
                          <div
                            key={slide.id}
                            className={`rounded-xl border p-3 shadow-xs space-y-2 transition ${
                              (selectedElementAny.slidesActiveIndex ?? 0) === idx
                                ? "border-pink-400 bg-pink-50/20 ring-1 ring-pink-400"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <button
                                type="button"
                                onClick={() => updateSelectedProp("slidesActiveIndex", idx)}
                                className="text-xs font-bold text-slate-800 hover:text-pink-600 text-left truncate max-w-[150px]"
                              >
                                Slide #{idx + 1}: {slide.title}
                              </button>
                              <div className="flex items-center gap-1.5">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const items = [...(selectedElementAny.slidesItems || [])];
                                      const temp = items[idx];
                                      items[idx] = items[idx - 1];
                                      items[idx - 1] = temp;
                                      updateSelectedProp("slidesItems", items);
                                      updateSelectedProp("slidesActiveIndex", idx - 1);
                                    }}
                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                                    title="Move Up"
                                  >
                                    ↑
                                  </button>
                                )}
                                {idx < (selectedElementAny.slidesItems?.length || 0) - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const items = [...(selectedElementAny.slidesItems || [])];
                                      const temp = items[idx];
                                      items[idx] = items[idx + 1];
                                      items[idx + 1] = temp;
                                      updateSelectedProp("slidesItems", items);
                                      updateSelectedProp("slidesActiveIndex", idx + 1);
                                    }}
                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                                    title="Move Down"
                                  >
                                    ↓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (selectedElementAny.slidesItems || []).filter((s) => s.id !== slide.id);
                                    updateSelectedProp("slidesItems", updated);
                                    updateSelectedProp("slidesActiveIndex", Math.max(0, idx - 1));
                                  }}
                                  className="text-[10px] font-bold text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Slide Title
                              </label>
                              <input
                                type="text"
                                value={slide.title}
                                onChange={(e) => {
                                  const updated = (selectedElementAny.slidesItems || []).map((s) =>
                                    s.id === slide.id ? { ...s, title: e.target.value } : s
                                  );
                                  updateSelectedProp("slidesItems", updated);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500 focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Description
                              </label>
                              <textarea
                                rows={2}
                                value={slide.description || ""}
                                onChange={(e) => {
                                  const updated = (selectedElementAny.slidesItems || []).map((s) =>
                                    s.id === slide.id ? { ...s, description: e.target.value } : s
                                  );
                                  updateSelectedProp("slidesItems", updated);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500 focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Background Image URL
                              </label>
                              <input
                                type="text"
                                value={slide.bgImage || ""}
                                onChange={(e) => {
                                  const updated = (selectedElementAny.slidesItems || []).map((s) =>
                                    s.id === slide.id ? { ...s, bgImage: e.target.value } : s
                                  );
                                  updateSelectedProp("slidesItems", updated);
                                }}
                                placeholder="https://images.unsplash.com/..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-800 outline-none focus:border-pink-500 focus:bg-white"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Background Color
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="color"
                                    value={slide.bgColor || "#0f172a"}
                                    onChange={(e) => {
                                      const updated = (selectedElementAny.slidesItems || []).map((s) =>
                                        s.id === slide.id ? { ...s, bgColor: e.target.value } : s
                                      );
                                      updateSelectedProp("slidesItems", updated);
                                    }}
                                    className="h-6 w-7 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
                                  />
                                  <input
                                    type="text"
                                    value={slide.bgColor || "#0f172a"}
                                    onChange={(e) => {
                                      const updated = (selectedElementAny.slidesItems || []).map((s) =>
                                        s.id === slide.id ? { ...s, bgColor: e.target.value } : s
                                      );
                                      updateSelectedProp("slidesItems", updated);
                                    }}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-mono text-slate-800 outline-none focus:border-pink-500 focus:bg-white"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Button Text
                                </label>
                                <input
                                  type="text"
                                  value={slide.buttonText || ""}
                                  onChange={(e) => {
                                    const updated = (selectedElementAny.slidesItems || []).map((s) =>
                                      s.id === slide.id ? { ...s, buttonText: e.target.value } : s
                                    );
                                    updateSelectedProp("slidesItems", updated);
                                  }}
                                  placeholder="Learn More"
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500 focus:bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Specific Properties (F-178) */}
                {selectedElementAny.type === "form" && (
                  <div className="space-y-4">
                    {/* Header Title & Subtitle */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Form Header
                      </span>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Header Title
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.formTitle !== undefined ? selectedElementAny.formTitle : "Get in Touch"}
                          onChange={(e) => updateSelectedProp("formTitle", e.target.value)}
                          placeholder="e.g. Get in Touch"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Header Subtitle
                        </label>
                        <textarea
                          rows={2}
                          value={selectedElementAny.formSubtitle !== undefined ? selectedElementAny.formSubtitle : "Fill out the form below and our team will get back to you within 24 hours."}
                          onChange={(e) => updateSelectedProp("formSubtitle", e.target.value)}
                          placeholder="Brief description..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Layout Columns */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Form Grid Layout
                      </label>
                      <select
                        value={selectedElementAny.formLayoutColumns || 2}
                        onChange={(e) => updateSelectedProp("formLayoutColumns", Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                      >
                        <option value={1}>1 Column (Stacked)</option>
                        <option value={2}>2 Columns (Grid)</option>
                      </select>
                    </div>

                    {/* Field Gap Spacing */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Field Spacing (Gap)
                        </label>
                        <span className="text-[11px] font-mono text-slate-500">
                          {selectedElementAny.formFieldGap ?? 16}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={32}
                        step={2}
                        value={selectedElementAny.formFieldGap ?? 16}
                        onChange={(e) => updateSelectedProp("formFieldGap", Number(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                    </div>

                    {/* Show Labels Toggle */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                        <span className="font-bold text-slate-700">Display Field Labels</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.formShowLabels !== false}
                          onChange={(e) => updateSelectedProp("formShowLabels", e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </label>
                    </div>

                    {/* Submit Button & Messages */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Submit Button Settings
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.formSubmitText || "Send Message"}
                          onChange={(e) => updateSelectedProp("formSubmitText", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Success Message
                        </label>
                        <textarea
                          rows={2}
                          value={selectedElementAny.formSubmitSuccessMsg || "Thank you! Your message has been sent successfully."}
                          onChange={(e) => updateSelectedProp("formSubmitSuccessMsg", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Background
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={selectedElementAny.formSubmitBtnBg || "#2563eb"}
                              onChange={(e) => updateSelectedProp("formSubmitBtnBg", e.target.value)}
                              className="h-6 w-7 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.formSubmitBtnBg || "#2563eb"}
                              onChange={(e) => updateSelectedProp("formSubmitBtnBg", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Text Color
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={selectedElementAny.formSubmitBtnColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("formSubmitBtnColor", e.target.value)}
                              className="h-6 w-7 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.formSubmitBtnColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("formSubmitBtnColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.formSubmitBtnFullWidth !== false}
                          onChange={(e) => updateSelectedProp("formSubmitBtnFullWidth", e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Full Width Button</span>
                      </label>
                    </div>

                    {/* Form Fields Manager */}
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Form Fields ({selectedElementAny.formFields?.length || 0})</span>
                        <div className="flex items-center gap-1">
                          <select
                            defaultValue="text"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 outline-none"
                            onChange={(e) => {
                              const newType = e.target.value as FormFieldType;
                              const defaultLabels: Record<FormFieldType, string> = {
                                text: "New Text Field",
                                email: "Email Address",
                                number: "Age / Quantity",
                                tel: "Phone Number",
                                textarea: "Additional Comments",
                                select: "Choose Option",
                                checkbox: "I agree to the terms",
                                radio: "Select Preference",
                              };
                              const newField: FormFieldItem = {
                                id: generateId(),
                                type: newType,
                                label: defaultLabels[newType] || "New Field",
                                placeholder: newType === "checkbox" ? "" : "Enter value...",
                                required: false,
                                width: newType === "textarea" ? "full" : "half",
                                options: newType === "select" || newType === "radio" ? ["Option 1", "Option 2", "Option 3"] : undefined,
                              };
                              updateSelectedProp("formFields", [...(selectedElementAny.formFields || []), newField]);
                              e.target.value = "text";
                            }}
                          >
                            <option value="text">+ Text Field</option>
                            <option value="email">+ Email</option>
                            <option value="number">+ Number</option>
                            <option value="tel">+ Telephone</option>
                            <option value="textarea">+ Textarea</option>
                            <option value="select">+ Dropdown Select</option>
                            <option value="checkbox">+ Checkbox</option>
                            <option value="radio">+ Radio Group</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(selectedElementAny.formFields || []).map((field, idx) => (
                          <div
                            key={field.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-bold text-slate-800 capitalize">
                                #{idx + 1}: {field.label} ({field.type})
                              </span>
                              <div className="flex items-center gap-1.5">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const items = [...(selectedElementAny.formFields || [])];
                                      const temp = items[idx];
                                      items[idx] = items[idx - 1];
                                      items[idx - 1] = temp;
                                      updateSelectedProp("formFields", items);
                                    }}
                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                                    title="Move Up"
                                  >
                                    ↑
                                  </button>
                                )}
                                {idx < (selectedElementAny.formFields?.length || 0) - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const items = [...(selectedElementAny.formFields || [])];
                                      const temp = items[idx];
                                      items[idx] = items[idx + 1];
                                      items[idx + 1] = temp;
                                      updateSelectedProp("formFields", items);
                                    }}
                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                                    title="Move Down"
                                  >
                                    ↓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (selectedElementAny.formFields || []).filter((f) => f.id !== field.id);
                                    updateSelectedProp("formFields", updated);
                                  }}
                                  className="text-[10px] font-bold text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Label
                                </label>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => {
                                    const updated = (selectedElementAny.formFields || []).map((f) =>
                                      f.id === field.id ? { ...f, label: e.target.value } : f
                                    );
                                    updateSelectedProp("formFields", updated);
                                  }}
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Field Type
                                </label>
                                <select
                                  value={field.type}
                                  onChange={(e) => {
                                    const newType = e.target.value as FormFieldType;
                                    const updated = (selectedElementAny.formFields || []).map((f) =>
                                      f.id === field.id
                                        ? {
                                            ...f,
                                            type: newType,
                                            options: newType === "select" || newType === "radio" ? (f.options || ["Option 1", "Option 2"]) : f.options,
                                          }
                                        : f
                                    );
                                    updateSelectedProp("formFields", updated);
                                  }}
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                                >
                                  <option value="text">Text</option>
                                  <option value="email">Email</option>
                                  <option value="number">Number</option>
                                  <option value="tel">Telephone</option>
                                  <option value="textarea">Textarea</option>
                                  <option value="select">Select Dropdown</option>
                                  <option value="checkbox">Checkbox</option>
                                  <option value="radio">Radio Group</option>
                                </select>
                              </div>
                            </div>

                            {field.type !== "checkbox" && (
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Placeholder Text
                                </label>
                                <input
                                  type="text"
                                  value={field.placeholder || ""}
                                  onChange={(e) => {
                                    const updated = (selectedElementAny.formFields || []).map((f) =>
                                      f.id === field.id ? { ...f, placeholder: e.target.value } : f
                                    );
                                    updateSelectedProp("formFields", updated);
                                  }}
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                                />
                              </div>
                            )}

                            {(field.type === "select" || field.type === "radio") && (
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Options (Comma Separated)
                                </label>
                                <input
                                  type="text"
                                  value={(field.options || []).join(", ")}
                                  onChange={(e) => {
                                    const opts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                                    const updated = (selectedElementAny.formFields || []).map((f) =>
                                      f.id === field.id ? { ...f, options: opts } : f
                                    );
                                    updateSelectedProp("formFields", updated);
                                  }}
                                  placeholder="Option 1, Option 2, Option 3"
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!field.required}
                                  onChange={(e) => {
                                    const updated = (selectedElementAny.formFields || []).map((f) =>
                                      f.id === field.id ? { ...f, required: e.target.checked } : f
                                    );
                                    updateSelectedProp("formFields", updated);
                                  }}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>Required Field</span>
                              </label>

                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-[10px] text-slate-500">Span:</span>
                                <select
                                  value={field.width || "half"}
                                  onChange={(e) => {
                                    const w = e.target.value as "full" | "half";
                                    const updated = (selectedElementAny.formFields || []).map((f) =>
                                      f.id === field.id ? { ...f, width: w } : f
                                    );
                                    updateSelectedProp("formFields", updated);
                                  }}
                                  className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[11px] font-medium text-slate-700 outline-none"
                                >
                                  <option value="half">50% (Half Width)</option>
                                  <option value="full">100% (Full Width)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Login Specific Properties (F-179) */}
                {selectedElementAny.type === "login" && (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Login Header
                      </span>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Title
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.loginTitle !== undefined ? selectedElementAny.loginTitle : "Welcome Back"}
                          onChange={(e) => updateSelectedProp("loginTitle", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Subtitle
                        </label>
                        <textarea
                          rows={2}
                          value={selectedElementAny.loginSubtitle !== undefined ? selectedElementAny.loginSubtitle : "Sign in to your account to access your workspace."}
                          onChange={(e) => updateSelectedProp("loginSubtitle", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Field Labels */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Field Labels & Placeholders
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Email Label
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.loginEmailLabel || "Email Address"}
                            onChange={(e) => updateSelectedProp("loginEmailLabel", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Email Placeholder
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.loginEmailPlaceholder || "name@example.com"}
                            onChange={(e) => updateSelectedProp("loginEmailPlaceholder", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Password Label
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.loginPasswordLabel || "Password"}
                            onChange={(e) => updateSelectedProp("loginPasswordLabel", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Password Placeholder
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.loginPasswordPlaceholder || "••••••••"}
                            onChange={(e) => updateSelectedProp("loginPasswordPlaceholder", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Features & Options */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Options & Links
                      </span>
                      <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                        <span className="font-bold">Remember Me Option</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.loginShowRememberMe !== false}
                          onChange={(e) => updateSelectedProp("loginShowRememberMe", e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                        <span className="font-bold">Forgot Password Link</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.loginShowForgotPassword !== false}
                          onChange={(e) => updateSelectedProp("loginShowForgotPassword", e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>

                      {selectedElementAny.loginShowForgotPassword !== false && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Link Text
                            </label>
                            <input
                              type="text"
                              value={selectedElementAny.loginForgotPasswordText || "Forgot password?"}
                              onChange={(e) => updateSelectedProp("loginForgotPasswordText", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Target URL
                            </label>
                            <input
                              type="text"
                              value={selectedElementAny.loginForgotPasswordUrl || "#"}
                              onChange={(e) => updateSelectedProp("loginForgotPasswordUrl", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer pt-1">
                        <span className="font-bold">Show Social Login Options</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.loginShowSocialButtons !== false}
                          onChange={(e) => updateSelectedProp("loginShowSocialButtons", e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>

                    {/* Button Styling */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Button & Theme
                      </span>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.loginButtonText || "Sign In"}
                          onChange={(e) => updateSelectedProp("loginButtonText", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Background
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={selectedElementAny.loginButtonBg || "#2563eb"}
                              onChange={(e) => updateSelectedProp("loginButtonBg", e.target.value)}
                              className="h-6 w-7 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.loginButtonBg || "#2563eb"}
                              onChange={(e) => updateSelectedProp("loginButtonBg", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Text Color
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={selectedElementAny.loginButtonColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("loginButtonColor", e.target.value)}
                              className="h-6 w-7 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.loginButtonColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("loginButtonColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nav Menu Specific Properties (F-180) */}
                {selectedElementAny.type === "nav-menu" && (
                  <div className="space-y-4">
                    {/* Layout & Alignment */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Menu Layout & Alignment
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Orientation
                          </label>
                          <select
                            value={selectedElementAny.navLayout || "horizontal"}
                            onChange={(e) => updateSelectedProp("navLayout", e.target.value as "horizontal" | "vertical")}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          >
                            <option value="horizontal">Horizontal Row</option>
                            <option value="vertical">Vertical Column</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Alignment
                          </label>
                          <select
                            value={selectedElementAny.navAlignment || "left"}
                            onChange={(e) => updateSelectedProp("navAlignment", e.target.value as "left" | "center" | "right" | "between")}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          >
                            <option value="left">Left Align</option>
                            <option value="center">Center Align</option>
                            <option value="right">Right Align</option>
                            <option value="between">Space Between</option>
                          </select>
                        </div>
                      </div>

                      {/* Gap Spacing Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-semibold text-slate-500">
                            Item Gap Spacing
                          </label>
                          <span className="text-[10px] font-mono text-slate-500">
                            {selectedElementAny.navGap ?? 24}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={8}
                          max={64}
                          step={4}
                          value={selectedElementAny.navGap ?? 24}
                          onChange={(e) => updateSelectedProp("navGap", Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    </div>

                    {/* Typography & Item Styling */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Typography & Colors
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Font Size
                          </label>
                          <select
                            value={selectedElementAny.navFontSize || "14px"}
                            onChange={(e) => updateSelectedProp("navFontSize", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          >
                            <option value="12px">12px (Small)</option>
                            <option value="14px">14px (Medium)</option>
                            <option value="16px">16px (Large)</option>
                            <option value="18px">18px (XL)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Font Weight
                          </label>
                          <select
                            value={selectedElementAny.navFontWeight || "600"}
                            onChange={(e) => updateSelectedProp("navFontWeight", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          >
                            <option value="400">Normal (400)</option>
                            <option value="500">Medium (500)</option>
                            <option value="600">SemiBold (600)</option>
                            <option value="700">Bold (700)</option>
                          </select>
                        </div>
                      </div>

                      {/* States Text Colors */}
                      <span className="block text-[10px] font-bold text-slate-600 mt-2">
                        Text Colors (Normal / Hover / Active)
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-0.5">Normal</label>
                          <input
                            type="color"
                            value={selectedElementAny.navItemColor || "#334155"}
                            onChange={(e) => updateSelectedProp("navItemColor", e.target.value)}
                            className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-0.5">Hover</label>
                          <input
                            type="color"
                            value={selectedElementAny.navItemHoverColor || "#2563eb"}
                            onChange={(e) => updateSelectedProp("navItemHoverColor", e.target.value)}
                            className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-0.5">Active</label>
                          <input
                            type="color"
                            value={selectedElementAny.navItemActiveColor || "#2563eb"}
                            onChange={(e) => updateSelectedProp("navItemActiveColor", e.target.value)}
                            className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Menu Items Manager */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Menu Items ({selectedElementAny.navMenuItems?.length || 5})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = selectedElementAny.navMenuItems || [];
                            const newItem: NavMenuItem = {
                              id: `nav_${Date.now()}`,
                              label: `New Link ${current.length + 1}`,
                              url: "#",
                            };
                            updateSelectedProp("navMenuItems", [...current, newItem]);
                          }}
                          className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-600 transition cursor-pointer"
                        >
                          + Add Item
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(selectedElementAny.navMenuItems || [
                          { id: "1", label: "Home", url: "/", isActive: true },
                          { id: "2", label: "About", url: "/about" },
                          {
                            id: "3",
                            label: "Services",
                            url: "/services",
                            submenu: [
                              { id: "s1", label: "Web Design", url: "/services/web-design" },
                              { id: "s2", label: "App Development", url: "/services/app-dev" },
                            ],
                          },
                          { id: "4", label: "Pricing", url: "/pricing" },
                          { id: "5", label: "Contact", url: "/contact" },
                        ]).map((item, index, arr) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs space-y-2"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-slate-700">
                                #{index + 1} {item.label}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => {
                                    const copy = [...arr];
                                    const temp = copy[index - 1];
                                    copy[index - 1] = copy[index];
                                    copy[index] = temp;
                                    updateSelectedProp("navMenuItems", copy);
                                  }}
                                  className="h-5 w-5 rounded border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={index === arr.length - 1}
                                  onClick={() => {
                                    const copy = [...arr];
                                    const temp = copy[index + 1];
                                    copy[index + 1] = copy[index];
                                    copy[index] = temp;
                                    updateSelectedProp("navMenuItems", copy);
                                  }}
                                  className="h-5 w-5 rounded border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = arr.filter((i) => i.id !== item.id);
                                    updateSelectedProp("navMenuItems", filtered);
                                  }}
                                  className="h-5 w-5 rounded border border-red-200 bg-red-50 text-[10px] font-bold text-red-600 hover:bg-red-100 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="block text-[9px] font-semibold text-slate-400">Label</label>
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(e) => {
                                    const updated = arr.map((i) =>
                                      i.id === item.id ? { ...i, label: e.target.value } : i
                                    );
                                    updateSelectedProp("navMenuItems", updated);
                                  }}
                                  className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-semibold text-slate-400">URL Target</label>
                                <input
                                  type="text"
                                  value={item.url}
                                  onChange={(e) => {
                                    const updated = arr.map((i) =>
                                      i.id === item.id ? { ...i, url: e.target.value } : i
                                    );
                                    updateSelectedProp("navMenuItems", updated);
                                  }}
                                  className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-800 outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!item.isActive}
                                  onChange={(e) => {
                                    const updated = arr.map((i) =>
                                      i.id === item.id ? { ...i, isActive: e.target.checked } : { ...i, isActive: false }
                                    );
                                    updateSelectedProp("navMenuItems", updated);
                                  }}
                                  className="rounded border-slate-300 text-amber-500 cursor-pointer"
                                />
                                <span>Active Link</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => {
                                  const sub = item.submenu || [];
                                  const newSub: NavSubmenuItem = {
                                    id: `sub_${Date.now()}`,
                                    label: `Submenu ${sub.length + 1}`,
                                    url: "#",
                                  };
                                  const updated = arr.map((i) =>
                                    i.id === item.id ? { ...i, submenu: [...sub, newSub] } : i
                                  );
                                  updateSelectedProp("navMenuItems", updated);
                                }}
                                className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                              >
                                + Add Submenu
                              </button>
                            </div>

                            {/* Submenu List */}
                            {item.submenu && item.submenu.length > 0 && (
                              <div className="mt-2 pl-3 border-l-2 border-amber-300 space-y-1.5">
                                <span className="block text-[9px] font-bold text-slate-500 uppercase">
                                  Submenu Items
                                </span>
                                {item.submenu.map((sub) => (
                                  <div key={sub.id} className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={sub.label}
                                      onChange={(e) => {
                                        const newSub = item.submenu!.map((s) =>
                                          s.id === sub.id ? { ...s, label: e.target.value } : s
                                        );
                                        const updated = arr.map((i) =>
                                          i.id === item.id ? { ...i, submenu: newSub } : i
                                        );
                                        updateSelectedProp("navMenuItems", updated);
                                      }}
                                      placeholder="Submenu Label"
                                      className="w-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-800 outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={sub.url}
                                      onChange={(e) => {
                                        const newSub = item.submenu!.map((s) =>
                                          s.id === sub.id ? { ...s, url: e.target.value } : s
                                        );
                                        const updated = arr.map((i) =>
                                          i.id === item.id ? { ...i, submenu: newSub } : i
                                        );
                                        updateSelectedProp("navMenuItems", updated);
                                      }}
                                      placeholder="URL"
                                      className="w-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-mono text-slate-800 outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSub = item.submenu!.filter((s) => s.id !== sub.id);
                                        const updated = arr.map((i) =>
                                          i.id === item.id ? { ...i, submenu: newSub } : i
                                        );
                                        updateSelectedProp("navMenuItems", updated);
                                      }}
                                      className="h-5 w-5 shrink-0 rounded border border-red-200 bg-red-50 text-[10px] text-red-600 hover:bg-red-100 cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated Headline Specific Properties (F-181) */}
                {selectedElementAny.type === "animated-headline" && (
                  <div className="space-y-4">
                    {/* HTML Tag & Text Parts */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Headline Text Content
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          HTML Tag
                        </label>
                        <select
                          value={selectedElementAny.headlineTag || "h2"}
                          onChange={(e) => updateSelectedProp("headlineTag", e.target.value as any)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-violet-500"
                        >
                          <option value="h1">H1 (Main Title)</option>
                          <option value="h2">H2 (Section Header)</option>
                          <option value="h3">H3 (Sub Header)</option>
                          <option value="h4">H4 (Small Header)</option>
                          <option value="p">P (Paragraph)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Prefix Text (Before Animation)
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.headlinePrefix ?? "Build Websites That Are"}
                          onChange={(e) => updateSelectedProp("headlinePrefix", e.target.value)}
                          placeholder="Prefix Text..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-violet-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Suffix Text (After Animation)
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.headlineSuffix ?? "With ForgeStudio"}
                          onChange={(e) => updateSelectedProp("headlineSuffix", e.target.value)}
                          placeholder="Suffix Text..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>

                    {/* Animated Phrases List */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Animated Phrases ({(selectedElementAny.headlineAnimatedTexts || []).length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = selectedElementAny.headlineAnimatedTexts || ["Stunning", "Blazing Fast", "Ultra Flexible", "Powerful"];
                            updateSelectedProp("headlineAnimatedTexts", [...current, `Phrase ${current.length + 1}`]);
                          }}
                          className="rounded bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-violet-700 transition cursor-pointer"
                        >
                          + Add Word
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(selectedElementAny.headlineAnimatedTexts || ["Stunning", "Blazing Fast", "Ultra Flexible", "Powerful"]).map((phrase, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={phrase}
                              onChange={(e) => {
                                const copy = [...(selectedElementAny.headlineAnimatedTexts || ["Stunning", "Blazing Fast", "Ultra Flexible", "Powerful"])];
                                copy[idx] = e.target.value;
                                updateSelectedProp("headlineAnimatedTexts", copy);
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-violet-700 outline-none focus:border-violet-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const copy = (selectedElementAny.headlineAnimatedTexts || ["Stunning", "Blazing Fast", "Ultra Flexible", "Powerful"]).filter((_, i) => i !== idx);
                                updateSelectedProp("headlineAnimatedTexts", copy);
                              }}
                              className="h-7 w-7 shrink-0 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Animation Style & Speed */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Animation Settings
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Animation Effect
                        </label>
                        <select
                          value={selectedElementAny.headlineAnimationType || "typing"}
                          onChange={(e) => updateSelectedProp("headlineAnimationType", e.target.value as AnimatedHeadlineStyle)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-violet-500"
                        >
                          <option value="typing">Typewriter Effect (| Cursor)</option>
                          <option value="fade">Smooth Fade In/Out</option>
                          <option value="slide-up">Slide Up & Fade</option>
                          <option value="zoom">Zoom Scale & Fade</option>
                          <option value="flip">3D Flip Rotation</option>
                          <option value="highlight">Brush Highlight Box</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-semibold text-slate-500">
                            Animation Interval Speed
                          </label>
                          <span className="text-[10px] font-mono text-slate-500">
                            {((selectedElementAny.headlineAnimationSpeed || 2500) / 1000).toFixed(1)}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1000}
                          max={5000}
                          step={250}
                          value={selectedElementAny.headlineAnimationSpeed || 2500}
                          onChange={(e) => updateSelectedProp("headlineAnimationSpeed", Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                        />
                      </div>
                    </div>

                    {/* Highlighted Phrase Colors */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Animated Text Styling
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Text Color
                          </label>
                          <input
                            type="color"
                            value={selectedElementAny.headlineHighlightColor || "#2563eb"}
                            onChange={(e) => updateSelectedProp("headlineHighlightColor", e.target.value)}
                            className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Background / Highlight
                          </label>
                          <input
                            type="color"
                            value={selectedElementAny.headlineHighlightBg || "#eff6ff"}
                            onChange={(e) => updateSelectedProp("headlineHighlightBg", e.target.value)}
                            className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Table Specific Properties (F-182) */}
                {selectedElementAny.type === "price-table" && (
                  <PriceTableWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Price List Specific Properties (F-183) */}
                {selectedElementAny.type === "price-list" && (
                  <div className="space-y-4">
                    {/* List Styling & Layout */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        List & Separator Layout
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Item Spacing
                          </label>
                          <input
                            type="number"
                            min={8}
                            max={60}
                            value={selectedElementAny.priceListGap ?? 20}
                            onChange={(e) => updateSelectedProp("priceListGap", Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Leader Line Style
                          </label>
                          <select
                            value={selectedElementAny.priceListSeparatorStyle || "dotted"}
                            onChange={(e) => updateSelectedProp("priceListSeparatorStyle", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-teal-500"
                          >
                            <option value="dotted">Dotted Leader (...) </option>
                            <option value="dashed">Dashed Line (---)</option>
                            <option value="solid">Solid Line (___)</option>
                            <option value="none">None</option>
                          </select>
                        </div>
                      </div>

                      {/* Image settings */}
                      <div className="pt-2 border-t border-slate-200/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                            Show Thumbnail Images
                          </label>
                          <input
                            type="checkbox"
                            checked={selectedElementAny.priceListShowImages !== false}
                            onChange={(e) => updateSelectedProp("priceListShowImages", e.target.checked)}
                            className="accent-teal-600 rounded cursor-pointer"
                          />
                        </div>

                        {selectedElementAny.priceListShowImages !== false && (
                          <div>
                            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-0.5">
                              <span>Image Size</span>
                              <span>{selectedElementAny.priceListImageSize || 48}px</span>
                            </div>
                            <input
                              type="range"
                              min={32}
                              max={96}
                              value={selectedElementAny.priceListImageSize || 48}
                              onChange={(e) => updateSelectedProp("priceListImageSize", Number(e.target.value))}
                              className="w-full accent-teal-600 cursor-pointer"
                            />
                          </div>
                        )}
                      </div>

                      {/* Color settings */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Title Color
                          </label>
                          <input
                            type="color"
                            value={selectedElementAny.priceListTitleColor || "#0f172a"}
                            onChange={(e) => updateSelectedProp("priceListTitleColor", e.target.value)}
                            className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Price Color
                          </label>
                          <input
                            type="color"
                            value={selectedElementAny.priceListPriceColor || "#2563eb"}
                            onChange={(e) => updateSelectedProp("priceListPriceColor", e.target.value)}
                            className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Price Pill Bg
                          </label>
                          <input
                            type="color"
                            value={selectedElementAny.priceListPriceBg || "#eff6ff"}
                            onChange={(e) => updateSelectedProp("priceListPriceBg", e.target.value)}
                            className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price List Items Manager */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Services / Products ({(selectedElementAny.priceListItems || []).length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const arr = selectedElementAny.priceListItems || [];
                            const newItem: PriceListItem = {
                              id: String(Date.now()),
                              name: `Service Item ${arr.length + 1}`,
                              price: "$25.00",
                              description: "Item description goes here.",
                              imageUrl: "",
                            };
                            updateSelectedProp("priceListItems", [...arr, newItem]);
                          }}
                          className="rounded bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-teal-700 transition cursor-pointer"
                        >
                          + Add Item
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(selectedElementAny.priceListItems || []).map((item, itemIdx) => (
                          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                            <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const copy = [...(selectedElementAny.priceListItems || [])];
                                  copy[itemIdx] = { ...copy[itemIdx], name: e.target.value };
                                  updateSelectedProp("priceListItems", copy);
                                }}
                                placeholder="Item Name..."
                                className="w-full font-bold text-xs text-slate-900 outline-none border-b border-transparent focus:border-teal-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = (selectedElementAny.priceListItems || []).filter((i) => i.id !== item.id);
                                  updateSelectedProp("priceListItems", filtered);
                                }}
                                className="h-5 w-5 shrink-0 rounded border border-red-200 bg-red-50 text-[10px] font-bold text-red-600 hover:bg-red-100 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Price */}
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400">Price Display</label>
                              <input
                                type="text"
                                value={item.price}
                                onChange={(e) => {
                                  const copy = [...(selectedElementAny.priceListItems || [])];
                                  copy[itemIdx] = { ...copy[itemIdx], price: e.target.value };
                                  updateSelectedProp("priceListItems", copy);
                                }}
                                placeholder="Price e.g. $49.00 or From $30"
                                className="w-full rounded border border-slate-200 px-2 py-0.5 text-xs font-semibold outline-none"
                              />
                            </div>

                            {/* Description */}
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400">Description</label>
                              <textarea
                                rows={2}
                                value={item.description || ""}
                                onChange={(e) => {
                                  const copy = [...(selectedElementAny.priceListItems || [])];
                                  copy[itemIdx] = { ...copy[itemIdx], description: e.target.value };
                                  updateSelectedProp("priceListItems", copy);
                                }}
                                placeholder="Short item description..."
                                className="w-full rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 outline-none"
                              />
                            </div>

                            {/* Thumbnail URL */}
                            {selectedElementAny.priceListShowImages !== false && (
                              <div>
                                <label className="block text-[9px] font-semibold text-slate-400">Image URL</label>
                                <input
                                  type="text"
                                  value={item.imageUrl || ""}
                                  onChange={(e) => {
                                    const copy = [...(selectedElementAny.priceListItems || [])];
                                    copy[itemIdx] = { ...copy[itemIdx], imageUrl: e.target.value };
                                    updateSelectedProp("priceListItems", copy);
                                  }}
                                  placeholder="https://images.unsplash.com/..."
                                  className="w-full rounded border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 font-mono outline-none"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gallery Specific Properties (F-184) */}
                {selectedElementAny.type === "gallery" && (
                  <div className="space-y-4">
                    {/* Grid Layout & Aspect Ratio */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Grid & Image Layout
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Columns
                          </label>
                          <select
                            value={selectedElementAny.galleryColumns || 3}
                            onChange={(e) => updateSelectedProp("galleryColumns", Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
                          >
                            <option value={1}>1 Column</option>
                            <option value={2}>2 Columns</option>
                            <option value={3}>3 Columns</option>
                            <option value={4}>4 Columns</option>
                            <option value={5}>5 Columns</option>
                            <option value={6}>6 Columns</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Image Gap
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={selectedElementAny.galleryGap ?? 16}
                            onChange={(e) => updateSelectedProp("galleryGap", Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Aspect Ratio
                          </label>
                          <select
                            value={selectedElementAny.galleryAspectRatio || "square"}
                            onChange={(e) => updateSelectedProp("galleryAspectRatio", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
                          >
                            <option value="square">Square (1:1)</option>
                            <option value="landscape">Landscape (16:9)</option>
                            <option value="portrait">Portrait (3:4)</option>
                            <option value="auto">Original / Auto</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Hover Effect
                          </label>
                          <select
                            value={selectedElementAny.galleryHoverEffect || "zoom"}
                            onChange={(e) => updateSelectedProp("galleryHoverEffect", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
                          >
                            <option value="zoom">Zoom Scale</option>
                            <option value="lift">Lift & Elevation</option>
                            <option value="fade">Subtle Fade</option>
                            <option value="none">None</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Border Radius
                          </label>
                          <select
                            value={selectedElementAny.galleryBorderRadius || "16px"}
                            onChange={(e) => updateSelectedProp("galleryBorderRadius", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
                          >
                            <option value="0px">Square (0px)</option>
                            <option value="8px">Rounded Small (8px)</option>
                            <option value="16px">Rounded Large (16px)</option>
                            <option value="24px">Extra Rounded (24px)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Caption Style
                          </label>
                          <select
                            value={selectedElementAny.galleryCaptionPosition || "overlay"}
                            onChange={(e) => updateSelectedProp("galleryCaptionPosition", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
                          >
                            <option value="overlay">Overlay on Image</option>
                            <option value="below">Below Image</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <label className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                          Show Image Captions
                        </label>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.galleryShowCaptions !== false}
                          onChange={(e) => updateSelectedProp("galleryShowCaptions", e.target.checked)}
                          className="accent-pink-600 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Gallery Images Manager */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200/80 pb-2">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Gallery Images ({(selectedElementAny.galleryImages || []).length})
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Bulk Upload Button */}
                          <label className="rounded-lg bg-pink-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-pink-700 transition cursor-pointer flex items-center gap-1 shadow-xs">
                            <span>📁</span>
                            <span>Upload Photos</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = e.target.files;
                                if (!files || files.length === 0) return;
                                const currentItems = selectedElementAny.galleryImages || [];
                                const fileArray = Array.from(files);
                                const newItems: GalleryImageItem[] = [];
                                let loadedCount = 0;

                                fileArray.forEach((file, idx) => {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result) {
                                      newItems.push({
                                        id: String(Date.now() + idx + Math.random()),
                                        url: ev.target.result as string,
                                        caption: file.name.replace(/\.[^/.]+$/, ""),
                                        altText: file.name,
                                      });
                                    }
                                    loadedCount++;
                                    if (loadedCount === fileArray.length) {
                                      updateSelectedProp("galleryImages", [...currentItems, ...newItems]);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                });
                                e.target.value = "";
                              }}
                            />
                          </label>

                          {/* Add URL Item Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const arr = selectedElementAny.galleryImages || [];
                              const newImg: GalleryImageItem = {
                                id: String(Date.now()),
                                url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80",
                                caption: `Gallery Image ${arr.length + 1}`,
                                altText: "Gallery Image",
                              };
                              updateSelectedProp("galleryImages", [...arr, newImg]);
                            }}
                            className="rounded-lg bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-300 transition cursor-pointer"
                          >
                            + URL
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(selectedElementAny.galleryImages || []).map((img, imgIdx) => (
                          <div key={img.id} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                              {/* Thumbnail preview */}
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-100 border border-slate-200 relative">
                                  {img.url ? (
                                    <img src={img.url} alt="Thumbnail" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">📷</div>
                                  )}
                                </div>
                                <span className="font-bold text-xs text-slate-800 truncate">Photo #{imgIdx + 1}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = (selectedElementAny.galleryImages || []).filter((i) => i.id !== img.id);
                                  updateSelectedProp("galleryImages", filtered);
                                }}
                                className="h-5 w-5 shrink-0 rounded border border-red-200 bg-red-50 text-[10px] font-bold text-red-600 hover:bg-red-100 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Image Upload / URL Controls */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="block text-[9px] font-semibold text-slate-400">Photo File / Source URL</label>
                                <label className="text-[9px] font-bold text-pink-600 hover:text-pink-700 cursor-pointer flex items-center gap-1">
                                  <span>📤 Replace Photo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        if (ev.target?.result) {
                                          const copy = [...(selectedElementAny.galleryImages || [])];
                                          copy[imgIdx] = {
                                            ...copy[imgIdx],
                                            url: ev.target.result as string,
                                            caption: copy[imgIdx].caption || file.name.replace(/\.[^/.]+$/, ""),
                                          };
                                          updateSelectedProp("galleryImages", copy);
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              </div>

                              <input
                                type="text"
                                value={img.url}
                                onChange={(e) => {
                                  const copy = [...(selectedElementAny.galleryImages || [])];
                                  copy[imgIdx] = { ...copy[imgIdx], url: e.target.value };
                                  updateSelectedProp("galleryImages", copy);
                                }}
                                placeholder="Paste Image URL or select local file..."
                                className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-700 font-mono outline-none focus:border-pink-500"
                              />
                            </div>

                            {/* Caption */}
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400">Caption Text</label>
                              <input
                                type="text"
                                value={img.caption || ""}
                                onChange={(e) => {
                                  const copy = [...(selectedElementAny.galleryImages || [])];
                                  copy[imgIdx] = { ...copy[imgIdx], caption: e.target.value };
                                  updateSelectedProp("galleryImages", copy);
                                }}
                                placeholder="Image caption..."
                                className="w-full rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700 outline-none"
                              />
                            </div>

                            {/* Alt Text */}
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400">Alt Description (SEO)</label>
                              <input
                                type="text"
                                value={img.altText || ""}
                                onChange={(e) => {
                                  const copy = [...(selectedElementAny.galleryImages || [])];
                                  copy[imgIdx] = { ...copy[imgIdx], altText: e.target.value };
                                  updateSelectedProp("galleryImages", copy);
                                }}
                                placeholder="Alt text for accessibility..."
                                className="w-full rounded border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Flip Box Specific Properties (F-185) */}
                {selectedElementAny.type === "flip-box" && (
                  <div className="space-y-4">
                    {/* Card Animation & Dimensions Settings */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Card Settings & Effect
                        </span>
                        <button
                          type="button"
                          onClick={() => updateSelectedProp("flipIsFlippedManual", !selectedElementAny.flipIsFlippedManual)}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                            selectedElementAny.flipIsFlippedManual
                              ? "bg-amber-600 text-white"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          }`}
                        >
                          {selectedElementAny.flipIsFlippedManual ? "Viewing: BACK" : "Flip to Back"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Flip Direction
                          </label>
                          <select
                            value={selectedElementAny.flipDirection || "flip-right"}
                            onChange={(e) => updateSelectedProp("flipDirection", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          >
                            <option value="flip-right">Flip Right (0° → 180°)</option>
                            <option value="flip-left">Flip Left (0° → -180°)</option>
                            <option value="flip-up">Flip Up (-180° X)</option>
                            <option value="flip-down">Flip Down (180° X)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Animation Speed
                          </label>
                          <select
                            value={selectedElementAny.flipDuration || "0.6s"}
                            onChange={(e) => updateSelectedProp("flipDuration", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          >
                            <option value="0.3s">Fast (0.3s)</option>
                            <option value="0.6s">Normal (0.6s)</option>
                            <option value="0.9s">Slow (0.9s)</option>
                            <option value="1.2s">Very Slow (1.2s)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Card Height
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.flipCardHeight || "320px"}
                            onChange={(e) => updateSelectedProp("flipCardHeight", e.target.value)}
                            placeholder="320px"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Border Radius
                          </label>
                          <select
                            value={selectedElementAny.flipBorderRadius || "20px"}
                            onChange={(e) => updateSelectedProp("flipBorderRadius", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          >
                            <option value="0px">Square (0px)</option>
                            <option value="12px">Rounded (12px)</option>
                            <option value="20px">Large Curved (20px)</option>
                            <option value="32px">Pill / Heavy (32px)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Front Card Content */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Front Card Content
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Icon / Emoji
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.flipFrontIcon || "🚀"}
                            onChange={(e) => updateSelectedProp("flipFrontIcon", e.target.value)}
                            placeholder="🚀, 💡, ⚡..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                            Image URL (Optional)
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.flipFrontImage || ""}
                            onChange={(e) => updateSelectedProp("flipFrontImage", e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-700 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Front Title
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.flipFrontTitle !== undefined ? selectedElementAny.flipFrontTitle : "Interactive Solutions"}
                          onChange={(e) => updateSelectedProp("flipFrontTitle", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Front Description
                        </label>
                        <textarea
                          rows={2}
                          value={selectedElementAny.flipFrontDescription !== undefined ? selectedElementAny.flipFrontDescription : "Hover or tap to flip card and explore custom features."}
                          onChange={(e) => updateSelectedProp("flipFrontDescription", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Background Color / Gradient
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.flipFrontBg || "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"}
                            onChange={(e) => updateSelectedProp("flipFrontBg", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Text Color
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.flipFrontTextColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("flipFrontTextColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.flipFrontTextColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("flipFrontTextColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back Card Content */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Back Card Content
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Back Title
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.flipBackTitle !== undefined ? selectedElementAny.flipBackTitle : "Ready to Start?"}
                          onChange={(e) => updateSelectedProp("flipBackTitle", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Back Description
                        </label>
                        <textarea
                          rows={2}
                          value={selectedElementAny.flipBackDescription !== undefined ? selectedElementAny.flipBackDescription : "Join thousands of creators building high-converting websites."}
                          onChange={(e) => updateSelectedProp("flipBackDescription", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Text
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.flipBackBtnText !== undefined ? selectedElementAny.flipBackBtnText : "Get Started Now"}
                            onChange={(e) => updateSelectedProp("flipBackBtnText", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Link URL
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.flipBackBtnUrl || "#"}
                            onChange={(e) => updateSelectedProp("flipBackBtnUrl", e.target.value)}
                            placeholder="#"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Back Background
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.flipBackBg || "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"}
                            onChange={(e) => updateSelectedProp("flipBackBg", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Back Text Color
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.flipBackTextColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("flipBackTextColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.flipBackTextColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("flipBackTextColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Background
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.flipBackBtnBg || "#ffffff"}
                              onChange={(e) => updateSelectedProp("flipBackBtnBg", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.flipBackBtnBg || "#ffffff"}
                              onChange={(e) => updateSelectedProp("flipBackBtnBg", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Text Color
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.flipBackBtnTextColor || "#4f46e5"}
                              onChange={(e) => updateSelectedProp("flipBackBtnTextColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.flipBackBtnTextColor || "#4f46e5"}
                              onChange={(e) => updateSelectedProp("flipBackBtnTextColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Call to Action Specific Properties (F-186) */}
                {selectedElementAny.type === "call-to-action" && (
                  <CTAWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Media Carousel Specific Properties (F-187) */}
                {selectedElementAny.type === "media-carousel" && (
                  <MediaCarouselWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Testimonial Carousel Specific Properties (F-188) */}
                {selectedElementAny.type === "testimonial-carousel" && (
                  <TestimonialCarouselWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Nested Carousel Inspector Panel (F-189) */}
                {selectedElementAny.type === "nested-carousel" && (
                  <NestedCarouselWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                    setSelectedId={setSelectedId}
                  />
                )}

                {/* Loop Carousel Inspector Panel (F-190) */}
                {selectedElementAny.type === "loop-carousel" && (
                  <LoopCarouselWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Table of Contents Inspector Panel (F-191) */}
                {selectedElementAny.type === "table-of-contents" && (
                  <TOCWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Countdown Inspector Panel (F-192) */}
                {selectedElementAny.type === "countdown" && (
                  <div className="space-y-4">
                    {/* Target Date & Time */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Target Date & Time
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Target Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={selectedElementAny.countdownTargetDate || ""}
                          onChange={(e) => updateSelectedProp("countdownTargetDate", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Expired Message
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.countdownExpiredMessage || "Event Has Ended!"}
                          onChange={(e) => updateSelectedProp("countdownExpiredMessage", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    {/* Display Units */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Displayed Units & Labels
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.countdownShowDays !== false}
                              onChange={(e) => updateSelectedProp("countdownShowDays", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>Days</span>
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.countdownDaysLabel || "Days"}
                            onChange={(e) => updateSelectedProp("countdownDaysLabel", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-800 outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.countdownShowHours !== false}
                              onChange={(e) => updateSelectedProp("countdownShowHours", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>Hours</span>
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.countdownHoursLabel || "Hours"}
                            onChange={(e) => updateSelectedProp("countdownHoursLabel", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-800 outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.countdownShowMinutes !== false}
                              onChange={(e) => updateSelectedProp("countdownShowMinutes", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>Minutes</span>
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.countdownMinutesLabel || "Minutes"}
                            onChange={(e) => updateSelectedProp("countdownMinutesLabel", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-800 outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.countdownShowSeconds !== false}
                              onChange={(e) => updateSelectedProp("countdownShowSeconds", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>Seconds</span>
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.countdownSecondsLabel || "Seconds"}
                            onChange={(e) => updateSelectedProp("countdownSecondsLabel", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Layout & Styling */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Layout & Box Styling
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alignment</label>
                          <select
                            value={selectedElementAny.countdownAlignment || "center"}
                            onChange={(e) => updateSelectedProp("countdownAlignment", e.target.value as "left" | "center" | "right")}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Box Gap (px)</label>
                          <input
                            type="number"
                            value={selectedElementAny.countdownGap ?? 16}
                            onChange={(e) => updateSelectedProp("countdownGap", Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Number Size</label>
                          <input
                            type="text"
                            value={selectedElementAny.countdownNumberSize || "32px"}
                            onChange={(e) => updateSelectedProp("countdownNumberSize", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Label Size</label>
                          <input
                            type="text"
                            value={selectedElementAny.countdownLabelSize || "11px"}
                            onChange={(e) => updateSelectedProp("countdownLabelSize", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Box Background</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.countdownBoxBg || "#ffffff"}
                              onChange={(e) => updateSelectedProp("countdownBoxBg", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.countdownBoxBg || "#ffffff"}
                              onChange={(e) => updateSelectedProp("countdownBoxBg", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Number Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.countdownNumberColor || "#0f172a"}
                              onChange={(e) => updateSelectedProp("countdownNumberColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.countdownNumberColor || "#0f172a"}
                              onChange={(e) => updateSelectedProp("countdownNumberColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Border Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.countdownBoxBorder || "#e2e8f0"}
                              onChange={(e) => updateSelectedProp("countdownBoxBorder", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.countdownBoxBorder || "#e2e8f0"}
                              onChange={(e) => updateSelectedProp("countdownBoxBorder", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Label Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.countdownLabelColor || "#64748b"}
                              onChange={(e) => updateSelectedProp("countdownLabelColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.countdownLabelColor || "#64748b"}
                              onChange={(e) => updateSelectedProp("countdownLabelColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Facebook Page Inspector Panel (F-193) */}
                {selectedElementAny.type === "facebook-page" && (
                  <div className="space-y-4">
                    {/* Page URL & Tabs */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Facebook Page Configuration
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Facebook Page URL
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.facebookPageUrl || ""}
                          onChange={(e) => updateSelectedProp("facebookPageUrl", e.target.value)}
                          placeholder="https://www.facebook.com/facebook"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Displayed Tabs
                        </label>
                        <select
                          value={selectedElementAny.facebookTabs || "timeline"}
                          onChange={(e) => updateSelectedProp("facebookTabs", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                        >
                          <option value="timeline">Timeline</option>
                          <option value="events">Events</option>
                          <option value="messages">Messages</option>
                          <option value="timeline,events">Timeline & Events</option>
                          <option value="timeline,messages">Timeline & Messages</option>
                          <option value="events,messages">Events & Messages</option>
                          <option value="timeline,events,messages">Timeline, Events & Messages</option>
                        </select>
                      </div>
                    </div>

                    {/* Dimensions & Alignment */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Dimensions & Alignment
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Width (px)
                          </label>
                          <input
                            type="number"
                            min={180}
                            max={500}
                            value={selectedElementAny.facebookWidth ?? 340}
                            onChange={(e) => updateSelectedProp("facebookWidth", Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Height (px)
                          </label>
                          <input
                            type="number"
                            min={130}
                            max={1000}
                            value={selectedElementAny.facebookHeight ?? 500}
                            onChange={(e) => updateSelectedProp("facebookHeight", Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Alignment
                        </label>
                        <select
                          value={selectedElementAny.facebookAlignment || "center"}
                          onChange={(e) => updateSelectedProp("facebookAlignment", e.target.value as "left" | "center" | "right")}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>

                    {/* Display Options Toggles */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Display Controls
                      </span>

                      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer py-1">
                        <span>Adapt Container Width</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.facebookAdaptContainerWidth !== false}
                          onChange={(e) => updateSelectedProp("facebookAdaptContainerWidth", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer py-1 border-t border-slate-200/60">
                        <span>Use Small Header</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.facebookSmallHeader === true}
                          onChange={(e) => updateSelectedProp("facebookSmallHeader", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer py-1 border-t border-slate-200/60">
                        <span>Hide Cover Photo</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.facebookHideCover === true}
                          onChange={(e) => updateSelectedProp("facebookHideCover", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer py-1 border-t border-slate-200/60">
                        <span>Show Friend Faces</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.facebookShowFacepile !== false}
                          onChange={(e) => updateSelectedProp("facebookShowFacepile", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Blockquote Inspector Panel (F-194) */}
                {selectedElementAny.type === "blockquote" && (
                  <div className="space-y-4">
                    {/* Content & Citation */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Quote Content & Citation
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Quotation Text
                        </label>
                        <textarea
                          rows={3}
                          value={selectedElementAny.content || selectedElementAny.quoteContent || ""}
                          onChange={(e) => {
                            updateSelectedProp("content", e.target.value);
                            updateSelectedProp("quoteContent", e.target.value);
                          }}
                          placeholder="The only way to do great work is to love what you do."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Author Name
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.quoteAuthor || ""}
                            onChange={(e) => updateSelectedProp("quoteAuthor", e.target.value)}
                            placeholder="Steve Jobs"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Citation / Title
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.quoteCitation || ""}
                            onChange={(e) => updateSelectedProp("quoteCitation", e.target.value)}
                            placeholder="Co-founder, Apple Inc."
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Style Variant & Alignment */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Style Variant & Layout
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Style Variant
                          </label>
                          <select
                            value={selectedElementAny.quoteStyle || "accent-left"}
                            onChange={(e) => updateSelectedProp("quoteStyle", e.target.value as "accent-left" | "boxed" | "centered-clean" | "top-border")}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="accent-left">Left Accent Line</option>
                            <option value="boxed">Boxed Card</option>
                            <option value="top-border">Top Accent Line</option>
                            <option value="centered-clean">Centered Clean</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Text Alignment
                          </label>
                          <select
                            value={selectedElementAny.quoteAlignment || "left"}
                            onChange={(e) => updateSelectedProp("quoteAlignment", e.target.value as "left" | "center" | "right")}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Icon & Colors */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Appearance & Colors
                      </span>

                      <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer py-0.5">
                        <span>Show Decorative Quote Icon</span>
                        <input
                          type="checkbox"
                          checked={selectedElementAny.quoteShowIcon !== false}
                          onChange={(e) => updateSelectedProp("quoteShowIcon", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Icon Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.quoteIconColor || "#6366f1"}
                              onChange={(e) => updateSelectedProp("quoteIconColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.quoteIconColor || "#6366f1"}
                              onChange={(e) => updateSelectedProp("quoteIconColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Border/Accent</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.quoteBorderColor || "#6366f1"}
                              onChange={(e) => updateSelectedProp("quoteBorderColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.quoteBorderColor || "#6366f1"}
                              onChange={(e) => updateSelectedProp("quoteBorderColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Quote Text Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.quoteTextColor || "#1e293b"}
                              onChange={(e) => updateSelectedProp("quoteTextColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.quoteTextColor || "#1e293b"}
                              onChange={(e) => updateSelectedProp("quoteTextColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Author Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.quoteAuthorColor || "#475569"}
                              onChange={(e) => updateSelectedProp("quoteAuthorColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.quoteAuthorColor || "#475569"}
                              onChange={(e) => updateSelectedProp("quoteAuthorColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Template Inspector Panel (F-195) */}
                {selectedElementAny.type === "template" && (
                  <div className="space-y-4">
                    {/* Source Selection & Picker */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Template Source & Selection
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Template Source Type
                        </label>
                        <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedProp("templateSource", "preset");
                              updateSelectedProp("templateId", undefined);
                              if (!selectedElementAny.templatePresetName) {
                                updateSelectedProp("templatePresetName", "hero");
                              }
                            }}
                            className={`py-1 text-xs font-bold rounded-md transition ${
                              selectedElementAny.templateSource !== "custom"
                                ? "bg-white text-purple-700 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Presets
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedProp("templateSource", "custom");
                              updateSelectedProp("templatePresetName", undefined);
                              const firstCompKey = Object.keys(components)[0];
                              if (firstCompKey) {
                                updateSelectedProp("templateId", firstCompKey);
                              }
                            }}
                            className={`py-1 text-xs font-bold rounded-md transition ${
                              selectedElementAny.templateSource === "custom"
                                ? "bg-white text-purple-700 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Saved Components
                          </button>
                        </div>
                      </div>

                      {selectedElementAny.templateSource === "custom" ? (
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Select Saved Reusable Component
                          </label>
                          {Object.keys(components).length === 0 ? (
                            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5 text-center text-[10px] font-medium text-purple-700">
                              No components saved yet. Select any element & click "Save as Comp".
                            </div>
                          ) : (
                            <select
                              value={selectedElementAny.templateId || ""}
                              onChange={(e) => updateSelectedProp("templateId", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                            >
                              <option value="">-- Choose Component --</option>
                              {Object.entries(components).map(([compId, comp]) => (
                                <option key={compId} value={compId}>
                                  {comp.name} ({comp.element.type})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Select Section Template Preset
                          </label>
                          <select
                            value={selectedElementAny.templatePresetName || "hero"}
                            onChange={(e) => updateSelectedProp("templatePresetName", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                          >
                            {Object.entries(PRESET_SECTION_TEMPLATES).map(([key, tpl]) => (
                              <option key={key} value={key}>
                                {tpl.icon} {tpl.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleUnpackTemplate(selectedElementAny.id)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-purple-700 active:scale-98 mt-2"
                      >
                        <span>⚡</span>
                        <span>Unpack / Insert into Canvas</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Reviews Inspector Panel (F-196) */}
                {selectedElementAny.type === "reviews" && (
                  <div className="space-y-4">
                    {/* Layout & Columns */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Layout & Alignment
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Layout Mode</label>
                          <select
                            value={selectedElementAny.reviewLayout || "grid"}
                            onChange={(e) => updateSelectedProp("reviewLayout", e.target.value as "grid" | "list")}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="grid">Grid Layout</option>
                            <option value="list">List Layout</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Grid Columns</label>
                          <select
                            value={selectedElementAny.reviewColumns || 3}
                            onChange={(e) => updateSelectedProp("reviewColumns", parseInt(e.target.value))}
                            disabled={selectedElementAny.reviewLayout === "list"}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none disabled:opacity-50"
                          >
                            <option value={1}>1 Column</option>
                            <option value={2}>2 Columns</option>
                            <option value={3}>3 Columns</option>
                            <option value={4}>4 Columns</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Text Alignment</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-lg">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => updateSelectedProp("reviewAlignment", align)}
                              className={`py-1 text-xs font-bold capitalize rounded-md transition ${
                                (selectedElementAny.reviewAlignment || "left") === align
                                  ? "bg-white text-amber-700 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Colors & Visual Features */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Color & Badges
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Star Rating Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.reviewStarColor || "#f59e0b"}
                              onChange={(e) => updateSelectedProp("reviewStarColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.reviewStarColor || "#f59e0b"}
                              onChange={(e) => updateSelectedProp("reviewStarColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Card Background</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.reviewCardBg || "#ffffff"}
                              onChange={(e) => updateSelectedProp("reviewCardBg", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.reviewCardBg || "#ffffff"}
                              onChange={(e) => updateSelectedProp("reviewCardBg", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedElementAny.reviewShowAvatar !== false}
                            onChange={(e) => updateSelectedProp("reviewShowAvatar", e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <span>Show Avatars</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedElementAny.reviewShowVerified !== false}
                            onChange={(e) => updateSelectedProp("reviewShowVerified", e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>Show Verified Badge</span>
                        </label>
                      </div>
                    </div>

                    {/* Visitor Manual Submission Options */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Manual Review Submissions
                      </span>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.reviewAllowSubmission !== false}
                          onChange={(e) => updateSelectedProp("reviewAllowSubmission", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>Enable "Write a Review" Button</span>
                      </label>

                      {selectedElementAny.reviewAllowSubmission !== false && (
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Submit Button Text
                          </label>
                          <input
                            type="text"
                            value={selectedElementAny.reviewSubmissionButtonText || "+ Write a Review"}
                            onChange={(e) => updateSelectedProp("reviewSubmissionButtonText", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Customer Review Items Manager */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Customer Reviews ({selectedElementAny.reviewItems?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = selectedElementAny.reviewItems || [];
                            const newItem: ReviewItem = {
                              id: "rev-" + Date.now(),
                              reviewerName: "Alex Rivera",
                              reviewerTitle: "Verified Customer",
                              reviewText: "Fantastic experience! Highly recommended product.",
                              rating: 5,
                              avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
                              verified: true,
                            };
                            updateSelectedProp("reviewItems", [...current, newItem]);
                          }}
                          className="flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-amber-700 transition"
                        >
                          <span>+</span> Add Review
                        </button>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {(selectedElementAny.reviewItems || []).map((rev, idx) => (
                          <div key={rev.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="text-xs font-bold text-amber-800">
                                Review #{idx + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const items = [...(selectedElementAny.reviewItems || [])];
                                      const temp = items[idx];
                                      items[idx] = items[idx - 1];
                                      items[idx - 1] = temp;
                                      updateSelectedProp("reviewItems", items);
                                    }}
                                    className="px-1 text-[10px] text-slate-500 hover:text-slate-900"
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                )}
                                {idx < (selectedElementAny.reviewItems?.length || 0) - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const items = [...(selectedElementAny.reviewItems || [])];
                                      const temp = items[idx];
                                      items[idx] = items[idx + 1];
                                      items[idx + 1] = temp;
                                      updateSelectedProp("reviewItems", items);
                                    }}
                                    className="px-1 text-[10px] text-slate-500 hover:text-slate-900"
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const items = (selectedElementAny.reviewItems || []).filter((i) => i.id !== rev.id);
                                    updateSelectedProp("reviewItems", items);
                                  }}
                                  className="ml-1 text-[10px] font-bold text-red-500 hover:text-red-700"
                                  title="Remove Review"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Name</label>
                                <input
                                  type="text"
                                  value={rev.reviewerName}
                                  onChange={(e) => {
                                    const items = [...(selectedElementAny.reviewItems || [])];
                                    items[idx] = { ...items[idx], reviewerName: e.target.value };
                                    updateSelectedProp("reviewItems", items);
                                  }}
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Rating</label>
                                <select
                                  value={rev.rating || 5}
                                  onChange={(e) => {
                                    const items = [...(selectedElementAny.reviewItems || [])];
                                    items[idx] = { ...items[idx], rating: parseInt(e.target.value) };
                                    updateSelectedProp("reviewItems", items);
                                  }}
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                                >
                                  <option value={5}>5 Stars (★★★★★)</option>
                                  <option value={4}>4 Stars (★★★★☆)</option>
                                  <option value={3}>3 Stars (★★★☆☆)</option>
                                  <option value={2}>2 Stars (★★☆☆☆)</option>
                                  <option value={1}>1 Star (★☆☆☆☆)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Title / Role</label>
                              <input
                                type="text"
                                value={rev.reviewerTitle || ""}
                                onChange={(e) => {
                                  const items = [...(selectedElementAny.reviewItems || [])];
                                  items[idx] = { ...items[idx], reviewerTitle: e.target.value };
                                  updateSelectedProp("reviewItems", items);
                                }}
                                placeholder="Verified Buyer"
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Review Text</label>
                              <textarea
                                rows={2}
                                value={rev.reviewText}
                                onChange={(e) => {
                                  const items = [...(selectedElementAny.reviewItems || [])];
                                  items[idx] = { ...items[idx], reviewText: e.target.value };
                                  updateSelectedProp("reviewItems", items);
                                }}
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-normal text-slate-800 outline-none"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[10px] font-semibold text-slate-500">Avatar Image</label>
                                <label className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded cursor-pointer border border-amber-200">
                                  <span>📁 Upload File</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          if (typeof reader.result === "string") {
                                            const items = [...(selectedElementAny.reviewItems || [])];
                                            items[idx] = { ...items[idx], avatarUrl: reader.result };
                                            updateSelectedProp("reviewItems", items);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                              <input
                                type="text"
                                value={rev.avatarUrl || ""}
                                onChange={(e) => {
                                  const items = [...(selectedElementAny.reviewItems || [])];
                                  items[idx] = { ...items[idx], avatarUrl: e.target.value };
                                  updateSelectedProp("reviewItems", items);
                                }}
                                placeholder="https://..."
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                              />
                            </div>

                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-0.5">
                              <input
                                type="checkbox"
                                checked={rev.verified ?? true}
                                onChange={(e) => {
                                  const items = [...(selectedElementAny.reviewItems || [])];
                                  items[idx] = { ...items[idx], verified: e.target.checked };
                                  updateSelectedProp("reviewItems", items);
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span>Verified Customer Badge</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Facebook Button Inspector Panel (F-197) */}
                {selectedElementAny.type === "facebook-button" && (
                  <div className="space-y-4">
                    {/* Facebook Button Configuration */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FacebookButtonBoxIcon />
                        <span>Facebook Button Settings</span>
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Target Facebook URL *
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.fbButtonUrl || "https://facebook.com"}
                          onChange={(e) => updateSelectedProp("fbButtonUrl", e.target.value)}
                          placeholder="https://facebook.com/yourpage"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Button Label *
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.fbButtonLabel || "Like Us on Facebook"}
                          onChange={(e) => updateSelectedProp("fbButtonLabel", e.target.value)}
                          placeholder="e.g. Like Us on Facebook, Share Page, Follow Us"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Action
                          </label>
                          <select
                            value={selectedElementAny.fbButtonAction || "like"}
                            onChange={(e) => updateSelectedProp("fbButtonAction", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="like">Like</option>
                            <option value="share">Share</option>
                            <option value="follow">Follow</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Button Size
                          </label>
                          <select
                            value={selectedElementAny.fbButtonSize || "md"}
                            onChange={(e) => updateSelectedProp("fbButtonSize", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="sm">Small</option>
                            <option value="md">Medium</option>
                            <option value="lg">Large</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-lg">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => updateSelectedProp("fbButtonAlignment", align)}
                              className={`py-1 text-xs font-bold capitalize rounded-md transition ${
                                (selectedElementAny.fbButtonAlignment || "left") === align
                                  ? "bg-white text-blue-700 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Color Customization */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Button Colors & Styling
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Background</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.fbButtonBgColor || "#1877F2"}
                              onChange={(e) => updateSelectedProp("fbButtonBgColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.fbButtonBgColor || "#1877F2"}
                              onChange={(e) => updateSelectedProp("fbButtonBgColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Hover Background</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.fbButtonHoverBgColor || "#0d65d9"}
                              onChange={(e) => updateSelectedProp("fbButtonHoverBgColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.fbButtonHoverBgColor || "#0d65d9"}
                              onChange={(e) => updateSelectedProp("fbButtonHoverBgColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Text & Icon Color</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={selectedElementAny.fbButtonTextColor || "#ffffff"}
                            onChange={(e) => updateSelectedProp("fbButtonTextColor", e.target.value)}
                            className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                          />
                          <input
                            type="text"
                            value={selectedElementAny.fbButtonTextColor || "#ffffff"}
                            onChange={(e) => updateSelectedProp("fbButtonTextColor", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Facebook Embed Inspector Panel (F-198) */}
                {selectedElementAny.type === "facebook-embed" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FacebookEmbedBoxIcon />
                        <span>Facebook Embed Settings</span>
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Post or Video URL *
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.fbEmbedUrl || "https://www.facebook.com/facebook"}
                          onChange={(e) => updateSelectedProp("fbEmbedUrl", e.target.value)}
                          placeholder="https://www.facebook.com/username/posts/123"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Width</label>
                          <input
                            type="text"
                            value={selectedElementAny.fbEmbedWidth || "100%"}
                            onChange={(e) => updateSelectedProp("fbEmbedWidth", e.target.value)}
                            placeholder="e.g. 100% or 500px"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Height</label>
                          <input
                            type="text"
                            value={selectedElementAny.fbEmbedHeight || "450px"}
                            onChange={(e) => updateSelectedProp("fbEmbedHeight", e.target.value)}
                            placeholder="e.g. 450px"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alignment</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-lg">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => updateSelectedProp("fbEmbedAlignment", align)}
                              className={`py-1 text-xs font-bold capitalize rounded-md transition ${
                                (selectedElementAny.fbEmbedAlignment || "center") === align
                                  ? "bg-white text-blue-700 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Facebook Comments Inspector Panel (F-199) */}
                {selectedElementAny.type === "facebook-comments" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FacebookCommentsBoxIcon />
                        <span>Facebook Comments Settings</span>
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Target Discussion URL *
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.fbCommentsUrl || "https://facebook.com"}
                          onChange={(e) => updateSelectedProp("fbCommentsUrl", e.target.value)}
                          placeholder="https://yourwebsite.com/blog/article-1"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Number of Posts</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={selectedElementAny.fbCommentsNumPosts || 5}
                            onChange={(e) => updateSelectedProp("fbCommentsNumPosts", parseInt(e.target.value) || 5)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Container Width</label>
                          <input
                            type="text"
                            value={selectedElementAny.fbCommentsWidth || "100%"}
                            onChange={(e) => updateSelectedProp("fbCommentsWidth", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alignment</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-lg">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => updateSelectedProp("fbCommentsAlignment", align)}
                              className={`py-1 text-xs font-bold capitalize rounded-md transition ${
                                (selectedElementAny.fbCommentsAlignment || "center") === align
                                  ? "bg-white text-blue-700 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PayPal Button Inspector Panel (F-200 / F-217) */}
                {selectedElementAny.type === "paypal-button" && (
                  <PayPalWidgetInspector
                    el={selectedElementAny}
                    updateProp={updateSelectedProp}
                  />
                )}

                {/* Stripe Button Inspector Panel (F-201) */}
                {selectedElementAny.type === "stripe-button" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <StripeButtonBoxIcon />
                        <span>Stripe Checkout Settings</span>
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.stripeText || "Checkout with Stripe"}
                          onChange={(e) => updateSelectedProp("stripeText", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Stripe Payment Link URL *
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.stripeCheckoutUrl || "https://buy.stripe.com"}
                          onChange={(e) => updateSelectedProp("stripeCheckoutUrl", e.target.value)}
                          placeholder="https://buy.stripe.com/..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Display Amount</label>
                          <input
                            type="text"
                            value={selectedElementAny.stripeAmount || "$49.00"}
                            onChange={(e) => updateSelectedProp("stripeAmount", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Size</label>
                          <select
                            value={selectedElementAny.stripeButtonSize || "md"}
                            onChange={(e) => updateSelectedProp("stripeButtonSize", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="sm">Small</option>
                            <option value="md">Medium</option>
                            <option value="lg">Large</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Colors</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Background</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.stripeBgColor || "#635BFF"}
                              onChange={(e) => updateSelectedProp("stripeBgColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.stripeBgColor || "#635BFF"}
                              onChange={(e) => updateSelectedProp("stripeBgColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Text Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElementAny.stripeTextColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("stripeTextColor", e.target.value)}
                              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={selectedElementAny.stripeTextColor || "#ffffff"}
                              onChange={(e) => updateSelectedProp("stripeTextColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lottie Inspector Panel (F-202) */}
                {selectedElementAny.type === "lottie" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                        <LottieBoxIcon />
                        <span>Lottie Animation Settings</span>
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Lottie JSON Animation URL *
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.lottieUrl || ""}
                          onChange={(e) => updateSelectedProp("lottieUrl", e.target.value)}
                          placeholder="https://assets9.lottiefiles.com/..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Width</label>
                          <input
                            type="text"
                            value={selectedElementAny.lottieWidth || "280px"}
                            onChange={(e) => updateSelectedProp("lottieWidth", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Height</label>
                          <input
                            type="text"
                            value={selectedElementAny.lottieHeight || "280px"}
                            onChange={(e) => updateSelectedProp("lottieHeight", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedElementAny.lottieAutoplay ?? true}
                            onChange={(e) => updateSelectedProp("lottieAutoplay", e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>Autoplay</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedElementAny.lottieLoop ?? true}
                            onChange={(e) => updateSelectedProp("lottieLoop", e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>Loop</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Code Highlight Inspector Panel (F-203) */}
                {selectedElementAny.type === "code-highlight" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <CodeHighlightBoxIcon />
                        <span>Code Highlight Settings</span>
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Language
                        </label>
                        <select
                          value={selectedElementAny.codeLanguage || "typescript"}
                          onChange={(e) => updateSelectedProp("codeLanguage", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                        >
                          <option value="typescript">TypeScript</option>
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="json">JSON</option>
                          <option value="bash">Bash / Shell</option>
                          <option value="sql">SQL</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Code Snippet Content
                        </label>
                        <textarea
                          rows={6}
                          value={selectedElementAny.codeSnippet || ""}
                          onChange={(e) => updateSelectedProp("codeSnippet", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Theme Mode</label>
                          <select
                            value={selectedElementAny.codeTheme || "dark"}
                            onChange={(e) => updateSelectedProp("codeTheme", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="dark">Dark (Vs Code Dark)</option>
                            <option value="light">Light (Vs Code Light)</option>
                          </select>
                        </div>

                        <div className="flex items-center pt-4">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.codeShowLineNumbers ?? true}
                              onChange={(e) => updateSelectedProp("codeShowLineNumbers", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Line Numbers</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Playlist Inspector Panel (F-204) */}
                {selectedElementAny.type === "video-playlist" && (() => {
                  const items: PlaylistItem[] = selectedElementAny.playlistItems?.length
                    ? selectedElementAny.playlistItems
                    : [
                        {
                          id: "1",
                          title: "ForgeStudio Platform Overview & Quick Start Guide",
                          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                          duration: "3:45",
                          thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
                          thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
                        },
                        {
                          id: "2",
                          title: "Designing Responsive SaaS Layouts in Record Time",
                          url: "https://vimeo.com/76979871",
                          videoUrl: "https://vimeo.com/76979871",
                          duration: "5:12",
                          thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=400&q=80",
                          thumbnailUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=400&q=80",
                        },
                      ];

                  return (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 space-y-3">
                        <span className="block text-[11px] font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                          <VideoPlaylistBoxIcon />
                          <span>Video Playlist Settings</span>
                        </span>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                            Playlist Layout Position
                          </label>
                          <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-lg">
                            {(["right", "bottom"] as const).map((pos) => (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => updateSelectedProp("playlistPosition", pos)}
                                className={`py-1 text-xs font-bold capitalize rounded-md transition ${
                                  (selectedElementAny.playlistPosition || "right") === pos
                                    ? "bg-white text-red-700 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {pos}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Video Playlist Editor */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Playlist Videos ({items.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newItem: PlaylistItem = {
                                id: `v_${Date.now()}`,
                                title: `New Video ${items.length + 1}`,
                                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                                videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                                duration: "2:30",
                                thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
                                thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
                              };
                              updateSelectedProp("playlistItems", [...items, newItem]);
                            }}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-red-700 transition cursor-pointer"
                          >
                            + Add Video
                          </button>
                        </div>

                        <div className="space-y-3">
                          {items.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <span className="text-xs font-bold text-red-700">Video #{idx + 1}</span>
                                {items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = items.filter((_, i) => i !== idx);
                                      updateSelectedProp("playlistItems", updated);
                                    }}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Title</label>
                                <input
                                  type="text"
                                  value={item.title || ""}
                                  onChange={(e) => {
                                    const updated = [...items];
                                    updated[idx] = { ...updated[idx], title: e.target.value };
                                    updateSelectedProp("playlistItems", updated);
                                  }}
                                  placeholder="Video Title"
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-red-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Video URL (YouTube, Vimeo, MP4 link) *
                                </label>
                                <input
                                  type="text"
                                  value={item.videoUrl || ""}
                                  onChange={(e) => {
                                    const updated = [...items];
                                    updated[idx] = { ...updated[idx], videoUrl: e.target.value };
                                    updateSelectedProp("playlistItems", updated);
                                  }}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono text-slate-800 outline-none focus:border-red-500"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Duration</label>
                                  <input
                                    type="text"
                                    value={item.duration || ""}
                                    onChange={(e) => {
                                      const updated = [...items];
                                      updated[idx] = { ...updated[idx], duration: e.target.value };
                                      updateSelectedProp("playlistItems", updated);
                                    }}
                                    placeholder="e.g. 4:15"
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="block text-[10px] font-semibold text-slate-500">Thumbnail</label>
                                    <label className="text-[9px] font-bold text-red-600 hover:text-red-800 cursor-pointer">
                                      📁 Upload
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              if (typeof reader.result === "string") {
                                                const updated = [...items];
                                                updated[idx] = { ...updated[idx], thumbnail: reader.result };
                                                updateSelectedProp("playlistItems", updated);
                                              }
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                  <input
                                    type="text"
                                    value={item.thumbnail || ""}
                                    onChange={(e) => {
                                      const updated = [...items];
                                      updated[idx] = { ...updated[idx], thumbnail: e.target.value };
                                      updateSelectedProp("playlistItems", updated);
                                    }}
                                    placeholder="https://..."
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Mega Menu Inspector Panel (F-205) */}
                {selectedElementAny.type === "mega-menu" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <MegaMenuBoxIcon />
                        <span>Mega Menu Navigation Settings</span>
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Background</label>
                          <input
                            type="color"
                            value={selectedElementAny.megaMenuBgColor || "#ffffff"}
                            onChange={(e) => updateSelectedProp("megaMenuBgColor", e.target.value)}
                            className="h-8 w-full cursor-pointer rounded border border-slate-200 p-0.5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Text Color</label>
                          <input
                            type="color"
                            value={selectedElementAny.megaMenuTextColor || "#0f172a"}
                            onChange={(e) => updateSelectedProp("megaMenuTextColor", e.target.value)}
                            className="h-8 w-full cursor-pointer rounded border border-slate-200 p-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Off Canvas Inspector Panel (F-206) */}
                {selectedElementAny.type === "off-canvas" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                      <span className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <OffCanvasBoxIcon />
                        <span>Off Canvas Panel Settings</span>
                      </span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Trigger Button Text</label>
                        <input
                          type="text"
                          value={selectedElementAny.offCanvasButtonText || "Open Panel"}
                          onChange={(e) => updateSelectedProp("offCanvasButtonText", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Panel Title</label>
                        <input
                          type="text"
                          value={selectedElementAny.offCanvasTitle || "Navigation & Tools"}
                          onChange={(e) => updateSelectedProp("offCanvasTitle", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Position</label>
                          <select
                            value={selectedElementAny.offCanvasPosition || "right"}
                            onChange={(e) => updateSelectedProp("offCanvasPosition", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="right">Slide Right</option>
                            <option value="left">Slide Left</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Panel Width</label>
                          <input
                            type="text"
                            value={selectedElementAny.offCanvasWidth || "340px"}
                            onChange={(e) => updateSelectedProp("offCanvasWidth", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Carousel Inspector Panel (F-210) */}
                {selectedElementAny.type === "image-carousel" && (() => {
                  const items: ImageCarouselItem[] = selectedElementAny.imageCarouselItems || [];
                  return (
                    <div className="space-y-4">
                      {/* CONTENT SECTION */}
                      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-3">
                        <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🖼️</span>
                            <span>CONTENT — Images ({items.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newItem: ImageCarouselItem = {
                                id: "img_" + Math.random().toString(36).substring(2, 9),
                                url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                                title: `Image Slide ${items.length + 1}`,
                                caption: "New Carousel Image",
                                alt: "Carousel Image",
                              };
                              updateSelectedProp("imageCarouselItems", [...items, newItem]);
                            }}
                            className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer"
                          >
                            + Add Image
                          </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          {items.map((item, idx) => (
                            <div key={item.id || idx} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700">
                                    {idx + 1}
                                  </span>
                                  {item.url && (
                                    <img src={item.url} alt={item.title || "thumbnail"} className="h-6 w-8 object-cover rounded border border-slate-200" />
                                  )}
                                  <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                                    {item.title || `Image ${idx + 1}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => {
                                      const updated = [...items];
                                      const temp = updated[idx];
                                      updated[idx] = updated[idx - 1];
                                      updated[idx - 1] = temp;
                                      updateSelectedProp("imageCarouselItems", updated);
                                    }}
                                    className="px-1 py-0.5 text-[10px] font-bold text-slate-500 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === items.length - 1}
                                    onClick={() => {
                                      const updated = [...items];
                                      const temp = updated[idx];
                                      updated[idx] = updated[idx + 1];
                                      updated[idx + 1] = temp;
                                      updateSelectedProp("imageCarouselItems", updated);
                                    }}
                                    className="px-1 py-0.5 text-[10px] font-bold text-slate-500 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                  {items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = items.filter((_, i) => i !== idx);
                                        updateSelectedProp("imageCarouselItems", updated);
                                      }}
                                      className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline ml-1 cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="block text-[10px] font-semibold text-slate-500">Image Source URL *</label>
                                  <label className="text-[9px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
                                    📁 Upload File
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            if (typeof reader.result === "string") {
                                              const updated = [...items];
                                              updated[idx] = { ...updated[idx], url: reader.result };
                                              updateSelectedProp("imageCarouselItems", updated);
                                            }
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                                <input
                                  type="text"
                                  value={item.url || ""}
                                  onChange={(e) => {
                                    const updated = [...items];
                                    updated[idx] = { ...updated[idx], url: e.target.value };
                                    updateSelectedProp("imageCarouselItems", updated);
                                  }}
                                  placeholder="https://images.unsplash.com/..."
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Title</label>
                                  <input
                                    type="text"
                                    value={item.title || ""}
                                    onChange={(e) => {
                                      const updated = [...items];
                                      updated[idx] = { ...updated[idx], title: e.target.value };
                                      updateSelectedProp("imageCarouselItems", updated);
                                    }}
                                    placeholder="Slide Title"
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alt Text</label>
                                  <input
                                    type="text"
                                    value={item.alt || ""}
                                    onChange={(e) => {
                                      const updated = [...items];
                                      updated[idx] = { ...updated[idx], alt: e.target.value };
                                      updateSelectedProp("imageCarouselItems", updated);
                                    }}
                                    placeholder="Image Alt Text"
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Caption Overlay</label>
                                  <input
                                    type="text"
                                    value={item.caption || ""}
                                    onChange={(e) => {
                                      const updated = [...items];
                                      updated[idx] = { ...updated[idx], caption: e.target.value };
                                      updateSelectedProp("imageCarouselItems", updated);
                                    }}
                                    placeholder="Short Caption"
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Click Link URL</label>
                                  <input
                                    type="text"
                                    value={item.linkUrl || ""}
                                    onChange={(e) => {
                                      const updated = [...items];
                                      updated[idx] = { ...updated[idx], linkUrl: e.target.value };
                                      updateSelectedProp("imageCarouselItems", updated);
                                    }}
                                    placeholder="https://..."
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SLIDES SECTION */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">SLIDES — Sizing & Ratio</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Image Sizing</label>
                            <select
                              value={selectedElementAny.imageCarouselImageSizing || "cover"}
                              onChange={(e) => updateSelectedProp("imageCarouselImageSizing", e.target.value as any)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                            >
                              <option value="cover">Cover (Fill & Crop)</option>
                              <option value="contain">Contain (Fit inside)</option>
                              <option value="fill">Fill (Stretch)</option>
                              <option value="auto">Auto Original</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Aspect Ratio</label>
                            <select
                              value={selectedElementAny.imageCarouselAspectRatio || "landscape"}
                              onChange={(e) => updateSelectedProp("imageCarouselAspectRatio", e.target.value as any)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                            >
                              <option value="landscape">Landscape (16:10)</option>
                              <option value="video">Video (16:9)</option>
                              <option value="square">Square (1:1)</option>
                              <option value="portrait">Portrait (3:4)</option>
                              <option value="auto">Custom Height</option>
                            </select>
                          </div>
                        </div>

                        {selectedElementAny.imageCarouselAspectRatio === "auto" && (
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Slide Fixed Height</label>
                            <input
                              type="text"
                              value={selectedElementAny.imageCarouselHeight || "320px"}
                              onChange={(e) => updateSelectedProp("imageCarouselHeight", e.target.value)}
                              placeholder="e.g. 320px or 40vh"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Slide Corner Radius</label>
                          <input
                            type="text"
                            value={selectedElementAny.imageCarouselBorderRadius || "16px"}
                            onChange={(e) => updateSelectedProp("imageCarouselBorderRadius", e.target.value)}
                            placeholder="e.g. 16px"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      {/* NAVIGATION SECTION */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">NAVIGATION</span>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.imageCarouselShowNav !== false}
                              onChange={(e) => updateSelectedProp("imageCarouselShowNav", e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>Show Previous / Next Arrows</span>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.imageCarouselShowDots !== false}
                              onChange={(e) => updateSelectedProp("imageCarouselShowDots", e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>Show Pagination Dots</span>
                          </label>
                        </div>
                      </div>

                      {/* AUTOPLAY SECTION */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">AUTOPLAY & LOOP</span>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.imageCarouselAutoplay !== false}
                              onChange={(e) => updateSelectedProp("imageCarouselAutoplay", e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>Enable Autoplay</span>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedElementAny.imageCarouselLoop !== false}
                              onChange={(e) => updateSelectedProp("imageCarouselLoop", e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>Infinite Loop Rotation</span>
                          </label>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Autoplay Speed ({selectedElementAny.imageCarouselAutoplaySpeed ?? 3000} ms)
                          </label>
                          <input
                            type="range"
                            min={1000}
                            max={8000}
                            step={500}
                            value={selectedElementAny.imageCarouselAutoplaySpeed ?? 3000}
                            onChange={(e) => updateSelectedProp("imageCarouselAutoplaySpeed", parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Transition Type</label>
                          <select
                            value={selectedElementAny.imageCarouselTransition || "slide"}
                            onChange={(e) => updateSelectedProp("imageCarouselTransition", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          >
                            <option value="slide">Slide Track</option>
                            <option value="fade">Fade In/Out</option>
                          </select>
                        </div>
                      </div>

                      {/* LAYOUT SECTION */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">LAYOUT & RESPONSIVE</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Slides Per View (Desktop)</label>
                            <select
                              value={selectedElementAny.imageCarouselSlidesPerView ?? 3}
                              onChange={(e) => updateSelectedProp("imageCarouselSlidesPerView", parseInt(e.target.value))}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                            >
                              <option value={1}>1 Slide</option>
                              <option value={2}>2 Slides</option>
                              <option value={3}>3 Slides</option>
                              <option value={4}>4 Slides</option>
                              <option value={5}>5 Slides</option>
                              <option value={6}>6 Slides</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Gap Between Slides (px)</label>
                            <input
                              type="number"
                              min={0}
                              max={40}
                              value={selectedElementAny.imageCarouselGap ?? 16}
                              onChange={(e) => updateSelectedProp("imageCarouselGap", parseInt(e.target.value) || 0)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Widget Alignment</label>
                          <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-lg">
                            {(["left", "center", "right"] as const).map((align) => (
                              <button
                                key={align}
                                type="button"
                                onClick={() => updateSelectedProp("imageCarouselAlignment", align)}
                                className={`py-1 text-xs font-bold capitalize rounded-md transition cursor-pointer ${
                                  (selectedElementAny.imageCarouselAlignment || "center") === align
                                    ? "bg-white text-blue-700 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Heading Level Selector (F-191) */}
                {selectedElementAny.type === "heading" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Heading Level Tag
                    </label>
                    <select
                      value={selectedElementAny.headingLevel || "h2"}
                      onChange={(e) => updateSelectedProp("headingLevel", e.target.value as "h1" | "h2" | "h3" | "h4" | "h5" | "h6")}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="h1">H1 - Main Page Heading</option>
                      <option value="h2">H2 - Section Heading</option>
                      <option value="h3">H3 - Sub-section Heading</option>
                      <option value="h4">H4 - Minor Heading</option>
                      <option value="h5">H5 - Small Heading</option>
                      <option value="h6">H6 - Tiny Heading</option>
                    </select>
                  </div>
                )}

                {/* Content Input */}
                {selectedElementAny.type !== "image" && selectedElementAny.type !== "video" && selectedElementAny.type !== "container" && selectedElementAny.type !== "posts" && selectedElementAny.type !== "share-buttons" && selectedElementAny.type !== "portfolio" && selectedElementAny.type !== "slides" && selectedElementAny.type !== "form" && selectedElementAny.type !== "login" && selectedElementAny.type !== "nav-menu" && selectedElementAny.type !== "animated-headline" && selectedElementAny.type !== "price-table" && selectedElementAny.type !== "price-list" && selectedElementAny.type !== "gallery" && selectedElementAny.type !== "flip-box" && selectedElementAny.type !== "call-to-action" && selectedElementAny.type !== "media-carousel" && selectedElementAny.type !== "testimonial-carousel" && selectedElementAny.type !== "nested-carousel" && selectedElementAny.type !== "loop-carousel" && selectedElementAny.type !== "table-of-contents" && selectedElementAny.type !== "countdown" && selectedElementAny.type !== "facebook-page" && selectedElementAny.type !== "blockquote" && selectedElementAny.type !== "template" && selectedElementAny.type !== "reviews" && selectedElementAny.type !== "facebook-button" && selectedElementAny.type !== "facebook-embed" && selectedElementAny.type !== "facebook-comments" && selectedElementAny.type !== "paypal-button" && selectedElementAny.type !== "stripe-button" && selectedElementAny.type !== "lottie" && selectedElementAny.type !== "code-highlight" && selectedElementAny.type !== "video-playlist" && selectedElementAny.type !== "mega-menu" && selectedElementAny.type !== "off-canvas" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Text
                    </label>
                    <textarea
                      rows={selectedElementAny.type === "text" ? 3 : 2}
                      value={selectedElementAny.content}
                      onChange={(e) => updateSelectedProp("content", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Advanced Typography Section */}
                {renderTypographySection()}

                {/* Text Color Input */}
                {selectedElementAny.type !== "image" && selectedElementAny.type !== "video" && selectedElementAny.type !== "video-playlist" && selectedElementAny.type !== "posts" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Text Color
                      </label>
                      {isControlStyleConfigured(selectedElementAny, activeDevice, activeElementState, "color") && (
                        <button
                          type="button"
                          onClick={() => resetSelectedStyle("color")}
                          title="Reset Text Color to Default"
                          className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                        >
                          ↺ Reset
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "color") || "#0f172a"}
                        onChange={(e) => updateSelectedStyle("color", e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "color") || "#0f172a"}
                        onChange={(e) => updateSelectedStyle("color", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSampleColor((hex) => updateSelectedStyle("color", hex))}
                        title="Sample Color from Screen / Image"
                        className="h-8 px-2 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1 shrink-0"
                      >
                        <span>🧪</span>
                        <span className="text-[10px]">Sample</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Alignment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alignment
                  </label>
                  <select
                    value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "textAlign") || "left"}
                    onChange={(e) => updateSelectedStyle("textAlign", e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>

                {/* Button Href Link */}
                {selectedElementAny.type === "button" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Button Link (URL)
                    </label>
                    <input
                      type="text"
                      value={selectedElementAny.href || "#"}
                      onChange={(e) => updateSelectedProp("href", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Button Background Color */}
                {selectedElementAny.type === "button" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Button Color
                      </label>
                      {isControlStyleConfigured(selectedElementAny, activeDevice, activeElementState, "backgroundColor") && (
                        <button
                          type="button"
                          onClick={() => resetSelectedStyle("backgroundColor")}
                          title="Reset Button Color to Default"
                          className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                        >
                          ↺ Reset
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "backgroundColor") || "#2563eb"}
                        onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "backgroundColor") || "#2563eb"}
                        onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSampleColor((hex) => updateSelectedStyle("backgroundColor", hex))}
                        title="Sample Color from Screen / Image"
                        className="h-8 px-2 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1 shrink-0"
                      >
                        <span>🧪</span>
                        <span className="text-[10px]">Sample</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Video Widget Inspector Panel (F-208) */}
                {selectedElementAny.type === "video" && (
                  <div className="space-y-6 pt-2 border-t border-slate-100">
                    {/* Hidden file input for video file */}
                    <input
                      id="video-file-input"
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleVideoFileSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {/* Hidden file input for video poster image */}
                    <input
                      id="video-poster-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleVideoPosterSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {/* CONTENT SECTION */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center justify-between">
                        <span>Content</span>
                        <span className="text-[10px] text-blue-600 font-normal">Source & Poster</span>
                      </h3>

                      {/* Video Source Input & Upload Trigger */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Video Source URL
                          </label>
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => document.getElementById("video-file-input")?.click()}
                            className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            <span>📁</span>
                            <span>{isUploading ? "Uploading..." : "Browse Video File"}</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={selectedElementAny.src || ""}
                          onChange={(e) => updateSelectedProp("src", e.target.value)}
                          placeholder="YouTube, Vimeo, or MP4 URL..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                        <p className="mt-1 text-[10px] text-slate-400">
                          Supports YouTube (`youtu.be`), Vimeo (`vimeo.com`), and direct `.mp4` video files
                        </p>
                      </div>

                      {/* Video Poster Image Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Poster Image URL (HTML5)
                          </label>
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => document.getElementById("video-poster-input")?.click()}
                            className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            <span>🖼️</span>
                            <span>{isUploading ? "Uploading..." : "Browse Image"}</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={selectedElementAny.videoPoster || ""}
                          onChange={(e) => updateSelectedProp("videoPoster", e.target.value)}
                          placeholder="https://.../poster.jpg"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                        {selectedElementAny.videoPoster && (
                          <div className="mt-2 flex items-center gap-2">
                            <img
                              src={resolveImageUrl(selectedElementAny.videoPoster, apiUrl)}
                              alt="Poster preview"
                              className="h-10 w-16 object-cover rounded border border-slate-200 bg-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => updateSelectedProp("videoPoster", "")}
                              className="text-[10px] font-bold text-red-500 hover:underline"
                            >
                              Remove Poster
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PLAYBACK SECTION */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        Playback Controls
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Show Controls */}
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 cursor-pointer hover:bg-slate-100 transition">
                          <input
                            type="checkbox"
                            checked={selectedElementAny.videoControls !== false}
                            onChange={(e) => updateSelectedProp("videoControls", e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-700">Show Controls</span>
                        </label>

                        {/* Autoplay */}
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 cursor-pointer hover:bg-slate-100 transition">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedElementAny.videoAutoplay)}
                            onChange={(e) => updateSelectedProp("videoAutoplay", e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-700">Autoplay</span>
                        </label>

                        {/* Loop */}
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 cursor-pointer hover:bg-slate-100 transition">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedElementAny.videoLoop)}
                            onChange={(e) => updateSelectedProp("videoLoop", e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-700">Loop</span>
                        </label>

                        {/* Muted */}
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 cursor-pointer hover:bg-slate-100 transition">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedElementAny.videoMuted)}
                            onChange={(e) => updateSelectedProp("videoMuted", e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-700">Muted</span>
                        </label>
                      </div>
                    </div>

                    {/* LAYOUT SECTION */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        Layout & Alignment
                      </h3>

                      {/* Width & Height */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Width
                          </label>
                          <select
                            value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "width") || "100%"}
                            onChange={(e) => updateSelectedStyle("width", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="100%">100% (Full Width)</option>
                            <option value="80%">80%</option>
                            <option value="60%">60%</option>
                            <option value="50%">50%</option>
                            <option value="auto">Auto</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Height
                          </label>
                          <select
                            value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "height") || "auto"}
                            onChange={(e) => updateSelectedStyle("height", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="auto">Auto (16:9 Aspect)</option>
                            <option value="250px">250px</option>
                            <option value="350px">350px</option>
                            <option value="450px">450px</option>
                            <option value="550px">550px</option>
                          </select>
                        </div>
                      </div>

                      {/* Alignment */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                          {(["left", "center", "right"] as const).map((align) => {
                            const currentAlign = getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "textAlign") || "left";
                            const isActive = currentAlign === align;
                            return (
                              <button
                                key={align}
                                type="button"
                                onClick={() => updateSelectedStyle("textAlign", align)}
                                className={`rounded-md py-1 text-xs font-semibold capitalize transition ${
                                  isActive
                                    ? "bg-white text-blue-600 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {align}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* STYLE SECTION */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        Style & Border
                      </h3>

                      {/* Border Radius */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Border Radius
                        </label>
                        <select
                          value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "borderRadius") || "8px"}
                          onChange={(e) => updateSelectedStyle("borderRadius", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="0px">0px (Square Sharp)</option>
                          <option value="4px">4px (Small)</option>
                          <option value="8px">8px (Medium Rounded)</option>
                          <option value="16px">16px (Large Rounded)</option>
                          <option value="24px">24px (Extra Rounded)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Playlist Inspector Panel (F-209) */}
                {selectedElementAny.type === "video-playlist" && (
                  <div className="space-y-6 pt-2 border-t border-slate-100">
                    {/* PLAYLIST ITEMS MANAGEMENT */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <span>📺</span>
                          <span>Playlist Videos</span>
                        </h3>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {(selectedElementAny.playlistItems || []).length} items
                        </span>
                      </div>

                      {/* Add Video Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const items = selectedElementAny.playlistItems || [];
                          const newItemId = `vp_${Date.now()}`;
                          const newItem: PlaylistItem = {
                            id: newItemId,
                            title: `New Video ${items.length + 1}`,
                            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                            duration: "03:00",
                          };
                          const updated = [...items, newItem];
                          updateSelectedProp("playlistItems", updated);
                          if (!selectedElementAny.playlistActiveId) {
                            updateSelectedProp("playlistActiveId", newItemId);
                          }
                        }}
                        className="w-full rounded-lg border border-dashed border-blue-400 bg-blue-50/50 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100/60 transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>➕</span>
                        <span>Add Video to Playlist</span>
                      </button>

                      {/* Playlist Item Cards */}
                      <div className="space-y-3 pt-1">
                        {(selectedElementAny.playlistItems || []).map((item: any, index: number) => {
                          const isActive = item.id === (selectedElementAny.playlistActiveId || selectedElementAny.playlistItems?.[0]?.id);
                          return (
                            <div
                              key={item.id || index}
                              className={`rounded-xl border p-3 transition space-y-2.5 ${
                                isActive
                                  ? "border-blue-400 bg-blue-50/40 ring-1 ring-blue-400/50 shadow-xs"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              {/* Header & Item Actions */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateSelectedProp("playlistActiveId", item.id)}
                                    title={isActive ? "Currently Active Video" : "Set as Active Video"}
                                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition ${
                                      isActive
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-200 text-slate-600 hover:bg-blue-500 hover:text-white"
                                    }`}
                                  >
                                    {isActive ? "▶" : index + 1}
                                  </button>
                                  <span className="text-xs font-bold text-slate-800">
                                    Video #{index + 1}
                                  </span>
                                  {isActive && (
                                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                                      Active
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Move Up */}
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => {
                                      const items = [...(selectedElementAny.playlistItems || [])];
                                      if (index > 0) {
                                        const temp = items[index];
                                        items[index] = items[index - 1];
                                        items[index - 1] = temp;
                                        updateSelectedProp("playlistItems", items);
                                      }
                                    }}
                                    title="Move Up"
                                    className="h-6 w-6 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center text-xs"
                                  >
                                    ↑
                                  </button>

                                  {/* Move Down */}
                                  <button
                                    type="button"
                                    disabled={index === (selectedElementAny.playlistItems || []).length - 1}
                                    onClick={() => {
                                      const items = [...(selectedElementAny.playlistItems || [])];
                                      if (index < items.length - 1) {
                                        const temp = items[index];
                                        items[index] = items[index + 1];
                                        items[index + 1] = temp;
                                        updateSelectedProp("playlistItems", items);
                                      }
                                    }}
                                    title="Move Down"
                                    className="h-6 w-6 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center text-xs"
                                  >
                                    ↓
                                  </button>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const items = (selectedElementAny.playlistItems || []).filter(
                                        (_: any, i: number) => i !== index
                                      );
                                      updateSelectedProp("playlistItems", items);
                                      if (selectedElementAny.playlistActiveId === item.id && items.length > 0) {
                                        updateSelectedProp("playlistActiveId", items[0].id);
                                      }
                                    }}
                                    title="Delete Video Item"
                                    className="h-6 w-6 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center text-xs ml-1"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>

                              {/* Title Input */}
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Video Title
                                </label>
                                <input
                                  type="text"
                                  value={item.title || ""}
                                  onChange={(e) => {
                                    const items = [...(selectedElementAny.playlistItems || [])];
                                    items[index] = { ...items[index], title: e.target.value };
                                    updateSelectedProp("playlistItems", items);
                                  }}
                                  placeholder="e.g. 01. Introduction Overview"
                                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>

                              {/* URL Input */}
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Video URL (YouTube, Vimeo, MP4)
                                </label>
                                <input
                                  type="text"
                                  value={item.url || ""}
                                  onChange={(e) => {
                                    const items = [...(selectedElementAny.playlistItems || [])];
                                    items[index] = { ...items[index], url: e.target.value };
                                    updateSelectedProp("playlistItems", items);
                                  }}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>

                              {/* Duration & Thumbnail URL Row */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                    Duration
                                  </label>
                                  <input
                                    type="text"
                                    value={item.duration || ""}
                                    onChange={(e) => {
                                      const items = [...(selectedElementAny.playlistItems || [])];
                                      items[index] = { ...items[index], duration: e.target.value };
                                      updateSelectedProp("playlistItems", items);
                                    }}
                                    placeholder="e.g. 04:30"
                                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                    Thumbnail URL
                                  </label>
                                  <input
                                    type="text"
                                    value={item.thumbnailUrl || ""}
                                    onChange={(e) => {
                                      const items = [...(selectedElementAny.playlistItems || [])];
                                      items[index] = { ...items[index], thumbnailUrl: e.target.value };
                                      updateSelectedProp("playlistItems", items);
                                    }}
                                    placeholder="https://.../thumb.jpg"
                                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* LAYOUT SECTION */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        Layout & Position
                      </h3>

                      {/* Playlist Position Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Playlist Position
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateSelectedProp("playlistPosition", "right")}
                            className={`rounded-lg border p-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                              (selectedElementAny.playlistPosition || "right") === "right"
                                ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>▶️</span>
                            <span>Right Sidebar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateSelectedProp("playlistPosition", "bottom")}
                            className={`rounded-lg border p-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                              selectedElementAny.playlistPosition === "bottom"
                                ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>🔽</span>
                            <span>Bottom List</span>
                          </button>
                        </div>
                      </div>

                      {/* Player Width Selector (Right Sidebar mode) */}
                      {(selectedElementAny.playlistPosition || "right") === "right" && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Player Portion Width
                          </label>
                          <select
                            value={selectedElementAny.playlistPlayerWidth || "65%"}
                            onChange={(e) => updateSelectedProp("playlistPlayerWidth", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="60%">60% Player / 40% Playlist</option>
                            <option value="65%">65% Player / 35% Playlist (Standard)</option>
                            <option value="70%">70% Player / 30% Playlist</option>
                            <option value="75%">75% Player / 25% Playlist</option>
                          </select>
                        </div>
                      )}

                      {/* Alignment */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                          {(["left", "center", "right"] as const).map((align) => {
                            const currentAlign = getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "textAlign") || "left";
                            const isActive = currentAlign === align;
                            return (
                              <button
                                key={align}
                                type="button"
                                onClick={() => updateSelectedStyle("textAlign", align)}
                                className={`rounded-md py-1 text-xs font-semibold capitalize transition ${
                                  isActive
                                    ? "bg-white text-blue-600 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {align}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* STYLE SECTION */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        Style & Border
                      </h3>

                      {/* Border Radius */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Border Radius
                        </label>
                        <select
                          value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "borderRadius") || "12px"}
                          onChange={(e) => updateSelectedStyle("borderRadius", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="0px">0px (Square Sharp)</option>
                          <option value="8px">8px (Small Rounded)</option>
                          <option value="12px">12px (Medium Rounded)</option>
                          <option value="16px">16px (Large Rounded)</option>
                          <option value="24px">24px (Extra Rounded)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Widget Inspector Panel (F-207) */}
                {selectedElementAny.type === "image" && (
                  <div className="space-y-6 pt-2 border-t border-slate-100">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFileSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {/* CONTENT SECTION */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center justify-between">
                        <span>Content</span>
                        <span className="text-[10px] text-blue-600 font-normal">Source & Alt Text</span>
                      </h3>

                      {/* Image Source Selection / Active Thumbnail */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Image Source
                        </label>

                        {selectedElementAny.src ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600">Preview</span>
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Active Image
                              </span>
                            </div>
                            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                              <img
                                src={resolveImageUrl(selectedElementAny.src, apiUrl)}
                                alt="Thumbnail preview"
                                className="h-28 w-full object-cover"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
                              >
                                <span>🔄</span>
                                <span>{isUploading ? "Uploading..." : "Replace Image"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSelectedProp("src", "")}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                              >
                                Remove
                              </button>
                            </div>

                            {/* Extracted Image Color Palette (F-034) */}
                            {extractedColors.length > 0 && (
                              <div className="pt-2 border-t border-slate-200">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                  Extracted Palette
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {extractedColors.map((hex, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => updateSelectedStyle("backgroundColor", hex)}
                                      title={`Apply extracted color ${hex}`}
                                      className="h-6 w-6 rounded-full border border-slate-300 shadow-xs hover:scale-110 transition shrink-0"
                                      style={{ backgroundColor: hex }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                              dragOver
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-300 bg-slate-50/50 hover:border-slate-400"
                            }`}
                          >
                            <UploadCloudIcon />
                            <p className="mt-2 text-xs font-bold text-slate-700">
                              No image selected
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              Choose local file or drop image here
                            </p>

                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() => fileInputRef.current?.click()}
                              className="mt-3 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                            >
                              {isUploading ? "Uploading..." : "Select Image"}
                            </button>
                          </div>
                        )}

                        {uploadError && (
                          <p className="text-xs font-semibold text-red-500">{uploadError}</p>
                        )}
                      </div>

                      {/* Direct Image URL input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Image Web URL / Source
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.src || ""}
                          onChange={(e) => updateSelectedProp("src", e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Alt Text */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Alt Text (SEO & Accessibility)
                        </label>
                        <input
                          type="text"
                          value={selectedElementAny.alt || ""}
                          onChange={(e) => updateSelectedProp("alt", e.target.value)}
                          placeholder="Describe the image content..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* LAYOUT SECTION */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        Layout & Alignment
                      </h3>

                      {/* Width & Height */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Width
                          </label>
                          <select
                            value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "width") || "100%"}
                            onChange={(e) => updateSelectedStyle("width", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="100%">100% (Full Width)</option>
                            <option value="75%">75%</option>
                            <option value="50%">50% (Half Width)</option>
                            <option value="33%">33%</option>
                            <option value="25%">25%</option>
                            <option value="auto">Auto</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Height
                          </label>
                          <select
                            value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "height") || "auto"}
                            onChange={(e) => updateSelectedStyle("height", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="auto">Auto</option>
                            <option value="150px">150px</option>
                            <option value="200px">200px</option>
                            <option value="300px">300px</option>
                            <option value="400px">400px</option>
                            <option value="500px">500px</option>
                          </select>
                        </div>
                      </div>

                      {/* Object Fit & Object Position */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Object Fit
                          </label>
                          <select
                            value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "objectFit") || "cover"}
                            onChange={(e) => updateSelectedStyle("objectFit", e.target.value as any)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="cover">Cover (Fill Container)</option>
                            <option value="contain">Contain (Fit Whole Image)</option>
                            <option value="fill">Fill (Stretch)</option>
                            <option value="none">None (Original Size)</option>
                            <option value="scale-down">Scale Down</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Object Position
                          </label>
                          <select
                            value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "objectPosition") || "center"}
                            onChange={(e) => updateSelectedStyle("objectPosition", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="center">Center</option>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                            <option value="top left">Top Left</option>
                            <option value="top right">Top Right</option>
                            <option value="bottom left">Bottom Left</option>
                            <option value="bottom right">Bottom Right</option>
                          </select>
                        </div>
                      </div>

                      {/* Alignment */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                          {(["left", "center", "right"] as const).map((align) => {
                            const currentAlign = getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "textAlign") || "left";
                            const isActive = currentAlign === align;
                            return (
                              <button
                                key={align}
                                type="button"
                                onClick={() => updateSelectedStyle("textAlign", align)}
                                className={`rounded-md py-1 text-xs font-semibold capitalize transition ${
                                  isActive
                                    ? "bg-white text-blue-600 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {align}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* STYLE SECTION */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        Style & Effects
                      </h3>

                      {/* Border Radius */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Border Radius
                        </label>
                        <select
                          value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "borderRadius") || "8px"}
                          onChange={(e) => updateSelectedStyle("borderRadius", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="0px">0px (Square Sharp)</option>
                          <option value="4px">4px (Small)</option>
                          <option value="8px">8px (Medium Rounded)</option>
                          <option value="16px">16px (Large Rounded)</option>
                          <option value="24px">24px (Extra Rounded)</option>
                          <option value="9999px">9999px (Pill / Circle)</option>
                        </select>
                      </div>

                      {/* Opacity */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Opacity
                          </label>
                          <span className="text-xs font-mono font-bold text-slate-600">
                            {Math.round(Number(getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "opacity") ?? 1) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={getControlStyleValue(selectedElementAny, activeDevice, activeElementState, "opacity") ?? 1}
                          onChange={(e) => updateSelectedStyle("opacity", parseFloat(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                      {/* F-220: Image Mask Shape */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Image Mask Shape (F-220)
                        </label>
                        <select
                          value={selectedElementAny.imageMaskShape || "none"}
                          onChange={(e) => updateSelectedProp("imageMaskShape", e.target.value as any)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="none">None (Rectangular)</option>
                          <option value="circle">⚪ Circle</option>
                          <option value="rounded">▢ Smooth Rounded</option>
                          <option value="blob">🫧 Organic Blob</option>
                          <option value="hexagon">⬡ Hexagon</option>
                          <option value="star">⭐ Star</option>
                          <option value="diamond">◆ Diamond</option>
                          <option value="squircle">⭕ Squircle</option>
                          <option value="heart">💖 Heart</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* F-212: Basic Media Carousel Inspector */}
                {selectedElementAny.type === "basic-media-carousel" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      🎠 Media Carousel Settings
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Slides Per View</label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={selectedElementAny.mediaCarouselSlidesPerView || 2}
                          onChange={(e) => updateSelectedProp("mediaCarouselSlidesPerView", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Gap (px)</label>
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={selectedElementAny.mediaCarouselGap ?? 12}
                          onChange={(e) => updateSelectedProp("mediaCarouselGap", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.mediaCarouselShowNav !== false}
                          onChange={(e) => updateSelectedProp("mediaCarouselShowNav", e.target.checked)}
                        />
                        Nav Arrows
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.mediaCarouselShowDots !== false}
                          onChange={(e) => updateSelectedProp("mediaCarouselShowDots", e.target.checked)}
                        />
                        Pagination Dots
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElementAny.mediaCarouselAutoplay ?? true}
                          onChange={(e) => updateSelectedProp("mediaCarouselAutoplay", e.target.checked)}
                        />
                        Autoplay
                      </label>
                    </div>
                  </div>
                )}

                {/* F-214: Basic Gallery Inspector */}
                {selectedElementAny.type === "basic-gallery" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      🖼️ Basic Gallery Settings
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Columns</label>
                        <select
                          value={selectedElementAny.basicGalleryColumns || 3}
                          onChange={(e) => updateSelectedProp("basicGalleryColumns", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold outline-none"
                        >
                          <option value={1}>1 Column</option>
                          <option value={2}>2 Columns</option>
                          <option value={3}>3 Columns</option>
                          <option value={4}>4 Columns</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Gap (px)</label>
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={selectedElementAny.basicGalleryGap ?? 12}
                          onChange={(e) => updateSelectedProp("basicGalleryGap", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* F-215: Audio Playlist Inspector */}
                {selectedElementAny.type === "audio-playlist" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      🎵 Audio Playlist Colors & Tracks
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Card Background</label>
                        <input
                          type="color"
                          value={selectedElementAny.audioPlaylistCardBg || "#0f172a"}
                          onChange={(e) => updateSelectedProp("audioPlaylistCardBg", e.target.value)}
                          className="h-8 w-full cursor-pointer rounded border border-slate-300 p-0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Accent Color</label>
                        <input
                          type="color"
                          value={selectedElementAny.audioPlaylistAccentColor || "#38bdf8"}
                          onChange={(e) => updateSelectedProp("audioPlaylistAccentColor", e.target.value)}
                          className="h-8 w-full cursor-pointer rounded border border-slate-300 p-0.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* F-219: Dynamic Lightbox Inspector */}
                {selectedElementAny.type === "dynamic-lightbox" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      🔍 Dynamic Lightbox Settings
                    </span>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Trigger Button Label</label>
                      <input
                        type="text"
                        value={selectedElementAny.lightboxTriggerText || "🔍 Open Dynamic Lightbox"}
                        onChange={(e) => updateSelectedProp("lightboxTriggerText", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* F-221: Custom SVG Inspector */}
                {selectedElementAny.type === "custom-svg" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      ⚡ Custom SVG Markup & Styling
                    </span>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Raw SVG Markup Code</label>
                      <textarea
                        rows={4}
                        value={selectedElementAny.svgRawContent || ""}
                        onChange={(e) => updateSelectedProp("svgRawContent", e.target.value)}
                        placeholder="<svg viewBox='0 0 24 24'>...</svg>"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">SVG Fill / Stroke Color</label>
                        <input
                          type="color"
                          value={selectedElementAny.svgColor || "#0284c7"}
                          onChange={(e) => updateSelectedProp("svgColor", e.target.value)}
                          className="h-8 w-full cursor-pointer rounded border border-slate-300 p-0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Alignment</label>
                        <select
                          value={selectedElementAny.svgAlignment || "center"}
                          onChange={(e) => updateSelectedProp("svgAlignment", e.target.value as any)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold outline-none"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* F-222: Icon Library Inspector */}
                {selectedElementAny.type === "icon-library" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      ✨ Icon Library Styling
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Icon Size (px)</label>
                        <input
                          type="number"
                          value={selectedElementAny.iconSize || 48}
                          onChange={(e) => updateSelectedProp("iconSize", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Icon Color</label>
                        <input
                          type="color"
                          value={selectedElementAny.iconColor || "#e11d48"}
                          onChange={(e) => updateSelectedProp("iconColor", e.target.value)}
                          className="h-8 w-full cursor-pointer rounded border border-slate-300 p-0.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Spacing Controls for non-container elements */}
                {selectedElementAny.type !== "container" && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Advanced Spacing
                    </h3>
                    {render4SideSpacingControl("Margin", "margin", isMarginLinked, setIsMarginLinked)}
                    {render4SideSpacingControl("Padding", "padding", isPaddingLinked, setIsPaddingLinked)}
                  </div>
                )}

                {/* Background & Border Controls */}
                {renderBackgroundAndBorderControls()}

                {/* Positioning & Layering Controls */}
                {renderPositioningControls()}
              </div>
            ) : (
              <div className="space-y-5">
              {/* Page Settings Section (F-018 & F-019) */}
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-blue-600 flex items-center gap-1.5">
                    <span>📄</span>
                    <span>PAGE SETTINGS</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configure page-level properties & SEO settings.
                  </p>
                </div>
                        {/* Site Identity */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <h3 className="text-xs font-bold text-slate-700 mb-2">Site Identity</h3>
                          <input
                            type="text"
                            value={globalSettings.siteIdentity?.name || ""}
                            onChange={(e) =>
                              setGlobalSettings((prev: any) => ({
                                ...prev,
                                siteIdentity: { ...prev.siteIdentity, name: e.target.value },
                              }))
                            }
                            placeholder="Site Name"
                            className="w-full rounded border px-2 py-1 text-xs"
                          />

                        {/* Back To Top Button Settings */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-700">Back To Top Button</h3>
                            <input
                              type="checkbox"
                              checked={globalSettings.backToTop?.enabled !== false}
                              onChange={(e) =>
                                setGlobalSettings((prev: any) => ({
                                  ...prev,
                                  backToTop: { ...prev.backToTop, enabled: e.target.checked },
                                }))
                              }
                              className="h-4 w-4 rounded text-blue-600"
                            />
                          </div>
                          {globalSettings.backToTop?.enabled !== false && (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[11px] font-semibold text-slate-600">Position:</label>
                                <select
                                  value={globalSettings.backToTop?.position || "bottom-right"}
                                  onChange={(e) =>
                                    setGlobalSettings((prev: any) => ({
                                      ...prev,
                                      backToTop: { ...prev.backToTop, position: e.target.value },
                                    }))
                                  }
                                  className="rounded border px-2 py-1 text-[11px]"
                                >
                                  <option value="bottom-right">Bottom Right</option>
                                  <option value="bottom-left">Bottom Left</option>
                                </select>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[11px] font-semibold text-slate-600">Scroll Offset (px):</label>
                                <input
                                  type="number"
                                  value={globalSettings.backToTop?.offset ?? 300}
                                  onChange={(e) =>
                                    setGlobalSettings((prev: any) => ({
                                      ...prev,
                                      backToTop: { ...prev.backToTop, offset: Number(e.target.value) },
                                    }))
                                  }
                                  className="w-20 rounded border px-2 py-1 text-[11px]"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Floating Action Button Settings */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-700">Floating Action Button (FAB)</h3>
                            <input
                              type="checkbox"
                              checked={globalSettings.floatingActionButton?.enabled === true}
                              onChange={(e) =>
                                setGlobalSettings((prev: any) => ({
                                  ...prev,
                                  floatingActionButton: {
                                    ...prev.floatingActionButton,
                                    enabled: e.target.checked,
                                  },
                                }))
                              }
                              className="h-4 w-4 rounded text-blue-600"
                            />
                          </div>

                          {globalSettings.floatingActionButton?.enabled && (
                            <div className="space-y-2 pt-1">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                  Icon & Type
                                </label>
                                <select
                                  value={globalSettings.floatingActionButton?.icon || "whatsapp"}
                                  onChange={(e) =>
                                    setGlobalSettings((prev: any) => ({
                                      ...prev,
                                      floatingActionButton: {
                                        ...prev.floatingActionButton,
                                        icon: e.target.value,
                                        backgroundColor:
                                          e.target.value === "whatsapp" ? "#25D366" : prev.floatingActionButton?.backgroundColor || "#2563eb",
                                      },
                                    }))
                                  }
                                  className="w-full rounded border px-2 py-1 text-[11px]"
                                >
                                  <option value="whatsapp">WhatsApp Button</option>
                                  <option value="chat">Live Chat / Message</option>
                                  <option value="phone">Call Now (Phone)</option>
                                  <option value="email">Email Us</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                  Label
                                </label>
                                <input
                                  type="text"
                                  value={globalSettings.floatingActionButton?.label || ""}
                                  onChange={(e) =>
                                    setGlobalSettings((prev: any) => ({
                                      ...prev,
                                      floatingActionButton: {
                                        ...prev.floatingActionButton,
                                        label: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Chat with us"
                                  className="w-full rounded border px-2 py-1 text-[11px]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                  Link or Smart Action
                                </label>
                                <input
                                  type="text"
                                  value={globalSettings.floatingActionButton?.link || ""}
                                  onChange={(e) =>
                                    setGlobalSettings((prev: any) => ({
                                      ...prev,
                                      floatingActionButton: {
                                        ...prev.floatingActionButton,
                                        link: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="https://wa.me/... or popup:open(id)"
                                  className="w-full rounded border px-2 py-1 text-[11px] font-mono"
                                />
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[11px] font-semibold text-slate-600">Position:</label>
                                <select
                                  value={globalSettings.floatingActionButton?.position || "bottom-left"}
                                  onChange={(e) =>
                                    setGlobalSettings((prev: any) => ({
                                      ...prev,
                                      floatingActionButton: {
                                        ...prev.floatingActionButton,
                                        position: e.target.value,
                                      },
                                    }))
                                  }
                                  className="rounded border px-2 py-1 text-[11px]"
                                >
                                  <option value="bottom-left">Bottom Left</option>
                                  <option value="bottom-right">Bottom Right</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                {/* Maintenance Mode Toggle (F-019) */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      <span>🛠️</span>
                      <span>Maintenance Mode</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={!!pageSettings.isMaintenanceMode}
                      onChange={(e) => setPageSettings((prev) => ({ ...prev, isMaintenanceMode: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Show temporary maintenance state to public visitors & preview while editing.
                  </p>
                  {pageSettings.isMaintenanceMode && (
                    <span className="inline-block rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Active — Site displays Maintenance Notice
                    </span>
                  )}

                </div>

                {/* Page Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={pageSettings.title || ""}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Home"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta Description (SEO)
                  </label>
                  <textarea
                    rows={3}
                    value={pageSettings.description || ""}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Page SEO description..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Page Path / URL Slug */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Path Slug
                  </label>
                  <input
                    type="text"
                    value={pageSettings.path || "/"}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, path: e.target.value }))}
                    placeholder="/"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Site / Website Published Language (F-022) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{t("siteLang", "Site Language (Published)")}</span>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">HTML lang</span>
                  </label>
                  <select
                    value={pageSettings.siteLanguage || "en"}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, siteLanguage: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                    <option value="it">Italian (it)</option>
                    <option value="ja">Japanese (ja)</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Controls published HTML website language. Completely independent from Editor UI language.
                  </p>
                </div>

                {/* Page Canvas Background Color */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Page Canvas Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pageSettings.backgroundColor || "#ffffff"}
                      onChange={(e) => setPageSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={pageSettings.backgroundColor || "#ffffff"}
                      onChange={(e) => setPageSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Custom Head Script/Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Head Tags / Scripts
                  </label>
                  <textarea
                    rows={3}
                    value={pageSettings.customHead || ""}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, customHead: e.target.value }))}
                    placeholder="<meta name='keywords' content='builder' />"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Temporary Support Credentials (F-020) */}
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3 pt-3">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🔐</span>
                      <span>Temporary Support Access</span>
                    </label>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      2-Hr Limit
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Generate temporary, time-limited credentials for support troubleshooting without sharing your password.
                  </p>

                  {supportToken ? (
                    <div className="space-y-2 rounded-lg border border-purple-200 bg-white p-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Support Token:</span>
                        <span className="text-purple-600 font-bold">Expires ~{supportExpiresAt}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={supportToken}
                          className="w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (supportToken) {
                              navigator.clipboard.writeText(supportToken);
                              setSupportCopied(true);
                              setTimeout(() => setSupportCopied(false), 2000);
                            }
                          }}
                          className="rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 transition shrink-0"
                        >
                          {supportCopied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {supportMessage && (
                    <p className="text-[11px] font-semibold text-purple-700">{supportMessage}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isGeneratingToken}
                      onClick={handleGenerateSupportToken}
                      className="flex-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition"
                    >
                      {isGeneratingToken ? "Generating..." : "Generate Support Token"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokeSupportTokens}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                      title="Revoke active support credentials"
                    >
                      Revoke
                    </button>
                  </div>
                </div>

                {/* Editor User Preferences (F-026) */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>Editor User Preferences</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Persistent
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {/* Auto Save Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">⚡ Auto-Save Drafts</span>
                      <input
                        type="checkbox"
                        checked={userPreferences.autoSaveEnabled}
                        onChange={(e) => updatePreference("autoSaveEnabled", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Canvas Grid Alignment Overlay Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">📐 Canvas Alignment Grid</span>
                      <input
                        type="checkbox"
                        checked={userPreferences.gridOverlay}
                        onChange={(e) => updatePreference("gridOverlay", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Header Toolbar Theme Switch */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-slate-700">🎨 Header Toolbar Theme</span>
                      <button
                        type="button"
                        onClick={() => updatePreference("themeMode", userPreferences.themeMode === "dark" ? "light" : "dark")}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm transition"
                      >
                        {userPreferences.themeMode === "dark" ? "🌙 Dark Navy" : "☀️ Light Modern"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Contextual Action Menu Overlay (F-010) */}
      {contextMenu && !isPreview && (
        <div
          style={{
            top: `${Math.min(contextMenu.y, window.innerHeight - 260)}px`,
            left: `${Math.min(contextMenu.x, window.innerWidth - 190)}px`,
          }}
          className="fixed z-50 min-w-[170px] rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-1.5 shadow-xl text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Element Actions
          </div>
          <button
            onClick={() => {
              handleReorderElement(contextMenu.elementId, "up");
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Move Up</span>
            <span className="text-[10px] text-slate-400">▲</span>
          </button>
          <button
            onClick={() => {
              handleReorderElement(contextMenu.elementId, "down");
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Move Down</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={(e) => {
              handleCopyElement(contextMenu.elementId, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Copy</span>
            <span className="text-[10px] text-slate-400">Ctrl+C</span>
          </button>
          <button
            onClick={(e) => {
              handleCopyStyle(contextMenu.elementId, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Copy Style</span>
            <span className="text-[10px]">🎨</span>
          </button>
          {copiedStyles && (
            <button
              onClick={(e) => {
                handlePasteStyle(contextMenu.elementId, e);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-emerald-50 text-emerald-600 font-bold transition"
            >
              <span>Paste Style</span>
              <span className="text-[10px]">🖌️</span>
            </button>
          )}
          <button
            onClick={(e) => {
              handleDuplicateElement(contextMenu.elementId, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Duplicate</span>
            <span className="text-[10px] text-slate-400">Ctrl+D</span>
          </button>
          <button
            onClick={() => {
              handleSaveAsComponent(contextMenu.elementId);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-purple-50 text-purple-700 transition"
          >
            <span>Save as Comp</span>
            <span className="text-[10px]">🧩</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={(e) => {
              handleDeleteElement(contextMenu.elementId, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-red-50 text-red-600 transition"
          >
            <span>Delete</span>
            <span className="text-[10px] text-red-400">✕</span>
          </button>
        </div>
      )}

      {/* Finder Command Palette Modal (F-027) */}
      {isFinderOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Search Header Input */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 bg-slate-50/50">
              <span className="text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                autoFocus
                value={finderQuery}
                onChange={(e) => setFinderQuery(e.target.value)}
                placeholder="Search pages, templates, settings and features... (Esc to close)"
                className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setIsFinderOpen(false)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-white text-[11px] overflow-x-auto">
              <span className="text-slate-400 font-semibold mr-1">Filter:</span>
              <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-medium">Pages</span>
              <span className="rounded-full bg-purple-50 text-purple-600 px-2 py-0.5 font-medium">Templates</span>
              <span className="rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 font-medium">Settings</span>
              <span className="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 font-medium">Features</span>
            </div>

            {/* Search Results List */}
            <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-50">
              {[
                {
                  id: "page-home",
                  title: "Home Page",
                  category: "page",
                  icon: "📄",
                  description: "Current main landing page route (/)",
                  keywords: "home page index main route",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "page-settings",
                  title: "Page Settings",
                  category: "page",
                  icon: "⚙️",
                  description: "Configure page title, SEO description, URL slug",
                  keywords: "page settings config seo title description slug",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "tpl-hero",
                  title: "Hero Section Template",
                  category: "template",
                  icon: "✨",
                  description: "Header section with title, subtitle & action button",
                  keywords: "hero header template banner section title subtitle button",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("elements");
                    handleAddElement("container");
                  },
                },
                {
                  id: "tpl-features",
                  title: "Features Grid Template",
                  category: "template",
                  icon: "📌",
                  description: "Container block layout for product feature cards",
                  keywords: "features grid template cards layout block container",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("elements");
                    handleAddElement("container");
                  },
                },
                {
                  id: "tpl-cta",
                  title: "Call to Action Template",
                  category: "template",
                  icon: "🚀",
                  description: "Conversion banner block with text and primary button",
                  keywords: "call to action cta template banner button conversion",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("elements");
                    handleAddElement("button");
                  },
                },
                {
                  id: "set-maintenance",
                  title: "Maintenance Mode",
                  category: "setting",
                  icon: "🛠️",
                  description: "Show temporary maintenance state to public visitors",
                  keywords: "maintenance mode public temporary offline state",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "set-sitelang",
                  title: "Site Published Language",
                  category: "setting",
                  icon: "🌐",
                  description: "Set published HTML lang attribute (en, es, fr, de...)",
                  keywords: "site language html lang published website",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "set-editorlang",
                  title: "Editor UI Language",
                  category: "setting",
                  icon: "🗣️",
                  description: "Switch Editor interface language (English, Spanish...)",
                  keywords: "editor language ui interface translate english spanish french german",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "set-grid",
                  title: "Canvas Alignment Grid",
                  category: "setting",
                  icon: "📐",
                  description: "Toggle 20px visual layout grid overlay on canvas",
                  keywords: "grid alignment layout overlay canvas guidelines",
                  action: () => {
                    updatePreference("gridOverlay", !userPreferences.gridOverlay);
                  },
                },
                {
                  id: "set-theme",
                  title: "Header Toolbar Theme",
                  category: "setting",
                  icon: "🎨",
                  description: "Switch Header theme between Dark Navy and Light Modern",
                  keywords: "theme dark light header toolbar appearance mode",
                  action: () => {
                    updatePreference("themeMode", userPreferences.themeMode === "dark" ? "light" : "dark");
                  },
                },
                {
                  id: "feat-elements",
                  title: "Elements Palette",
                  category: "feature",
                  icon: "🧱",
                  description: "Browse containers, headings, text, images & buttons",
                  keywords: "elements palette add container heading text image button widgets",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("elements");
                  },
                },
                {
                  id: "feat-navigator",
                  title: "Navigator Layers",
                  category: "feature",
                  icon: "🌳",
                  description: "Visual tree structure hierarchy navigation panel",
                  keywords: "navigator layers tree structure hierarchy elements outline",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("navigator");
                  },
                },
                {
                  id: "feat-save",
                  title: "Save Website",
                  category: "feature",
                  icon: "💾",
                  description: "Persist all editor elements & page settings (Ctrl+S)",
                  keywords: "save site website persist publish store ctrl+s",
                  action: () => {
                    handleSave();
                  },
                },
                {
                  id: "feat-preview",
                  title: "Toggle Preview Mode",
                  category: "feature",
                  icon: "👁️",
                  description: "Switch between editing canvas and published site view (Ctrl+P)",
                  keywords: "preview mode view exit preview test ctrl+p",
                  action: () => {
                    setIsPreview(!isPreview);
                  },
                },
                {
                  id: "feat-undo",
                  title: "Undo Action",
                  category: "feature",
                  icon: "↩️",
                  description: "Restore previous canvas state (Ctrl+Z)",
                  keywords: "undo revert history ctrl+z",
                  action: () => {
                    handleUndo();
                  },
                },
                {
                  id: "feat-redo",
                  title: "Redo Action",
                  category: "feature",
                  icon: "↪️",
                  description: "Reapply undone canvas change (Ctrl+Y)",
                  keywords: "redo reapply history ctrl+y",
                  action: () => {
                    handleRedo();
                  },
                },
                {
                  id: "feat-moveup",
                  title: "Move Section Up",
                  category: "feature",
                  icon: "▲",
                  description: "Move selected section upward in page hierarchy (Alt+Up)",
                  keywords: "move section up reorder upward alt+up",
                  action: () => {
                    if (selectedId) handleReorderElement(selectedId, "up");
                  },
                },
                {
                  id: "feat-movedown",
                  title: "Move Section Down",
                  category: "feature",
                  icon: "▼",
                  description: "Move selected section downward in page hierarchy (Alt+Down)",
                  keywords: "move section down reorder downward alt+down",
                  action: () => {
                    if (selectedId) handleReorderElement(selectedId, "down");
                  },
                },
                {
                  id: "feat-support",
                  title: "Temporary Support Token",
                  category: "feature",
                  icon: "🔐",
                  description: "Generate 2-hour temporary support access credential",
                  keywords: "support token access credentials temporary auth troubleshooting",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                    handleGenerateSupportToken();
                  },
                },
                {
                  id: "feat-quit",
                  title: "Quit Editor",
                  category: "feature",
                  icon: "🚪",
                  description: "Exit visual editor and return to Dashboard",
                  keywords: "quit exit return dashboard leave back",
                  action: () => {
                    handleQuitEditor();
                  },
                },
              ]
                .filter((item) => {
                  if (!finderQuery.trim()) return true;
                  const q = finderQuery.toLowerCase().trim();
                  return (
                    item.title.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q) ||
                    item.keywords.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q)
                  );
                })
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setIsFinderOpen(false);
                      setFinderQuery("");
                      item.action();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-base shadow-sm group-hover:bg-blue-600 group-hover:text-white transition">
                        {item.icon}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition flex items-center gap-2">
                          <span>{item.title}</span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              item.category === "page"
                                ? "bg-slate-100 text-slate-600"
                                : item.category === "template"
                                ? "bg-purple-100 text-purple-700"
                                : item.category === "setting"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.category}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-slate-300 group-hover:text-blue-500 transition font-bold">
                      →
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* Keyboard Shortcuts Help Modal (F-031)      */}
      {/* ========================================== */}
      {isShortcutsHelpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsShortcutsHelpOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">⌨️</span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Keyboard Shortcuts</h3>
                  <p className="text-[11px] text-slate-400">Supported editor actions & key bindings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Shortcuts Content List */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Category 1: Editor Navigation & Canvas */}
              <div>
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <span>🚀</span> Editor & Navigation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Finder Search Palette</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + K</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Save Website</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + S</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Toggle Preview Mode</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + P</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Shortcuts Help Modal</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">?</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-700">Exit Fullscreen / Close Modal</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Category 2: Element Editing & Clipboard */}
              <div>
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <span>🎨</span> Element Editing & Clipboard
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Undo Action</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + Z</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Redo Action</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + Y</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Copy Element</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + C</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Paste Element</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + V</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Duplicate Element</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + D</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Delete Element</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Delete / Backspace</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Move Section Up</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Alt + Up</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Move Section Down</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Alt + Down</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Press <kbd className="font-mono bg-white border border-slate-200 px-1 rounded">Esc</kbd> anytime to close</span>
              <button
                type="button"
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* Manage Widgets & Visibility Modal (F-032)  */}
      {/* ========================================== */}
      {isElementManagerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsElementManagerOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Manage Widgets & Visibility</h3>
                  <p className="text-[11px] text-slate-400">
                    Control which widgets appear in the main Widget Library. Hiding a widget preserves all canvas elements.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsElementManagerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Top Toolbar: Search & Quick Action Buttons */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={managerSearchQuery}
                  onChange={(e) => setManagerSearchQuery(e.target.value)}
                  placeholder="Search all widgets..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-xs"
                />
                <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                {managerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setManagerSearchQuery("")}
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={enableAllWidgets}
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-xs"
                >
                  Enable All ({ALL_WIDGET_REGISTRY.length})
                </button>
                <button
                  type="button"
                  onClick={resetWidgetsToDefault}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
                >
                  Reset Default (5 Core)
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="px-6 py-2.5 border-b border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto">
              {["All", "Layout", "Basic", "Content", "Interactive", "Media", "Commerce", "Social"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setManagerCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap ${
                    managerCategoryFilter === cat
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Widget Toggles List */}
            <div className="p-6 overflow-y-auto space-y-2.5 max-h-[50vh]">
              {ALL_WIDGET_REGISTRY.filter((w) => {
                const matchesCat = managerCategoryFilter === "All" || w.category === managerCategoryFilter;
                if (!matchesCat) return false;
                if (!managerSearchQuery.trim()) return true;
                const q = managerSearchQuery.toLowerCase().trim();
                return (
                  w.name.toLowerCase().includes(q) ||
                  w.type.toLowerCase().includes(q) ||
                  w.description.toLowerCase().includes(q) ||
                  w.category.toLowerCase().includes(q)
                );
              }).map((w) => {
                const isDisabled = disabledWidgets.includes(w.type);
                return (
                  <div
                    key={w.type}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      isDisabled
                        ? "border-slate-200 bg-slate-50/60 opacity-80"
                        : "border-emerald-200 bg-emerald-50/20 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs">
                        {w.icon}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>{w.name}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {w.category}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isDisabled
                                ? "bg-slate-200 text-slate-600"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isDisabled ? "Hidden" : "Visible"}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{w.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleWidgetAvailability(w.type)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isDisabled ? "bg-slate-300" : "bg-emerald-500"
                      }`}
                      title={isDisabled ? `Enable ${w.name} in Widget Library` : `Hide ${w.name} from Widget Library`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isDisabled ? "translate-x-0" : "translate-x-5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">
                {ALL_WIDGET_REGISTRY.length - disabledWidgets.length} of {ALL_WIDGET_REGISTRY.length} widgets active in Main Library
              </span>
              <button
                type="button"
                onClick={() => setIsElementManagerOpen(false)}
                className="rounded-lg bg-blue-600 px-5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

{/* Popup Manager Modal */}
      <PopupManagerModal
        isOpen={isPopupManagerOpen}
        onClose={() => setIsPopupManagerOpen(false)}
        popups={popups}
        onSelectPopupForEdit={handleSelectPopupForEdit}
        onCreatePopup={handleCreatePopup}
        onUpdatePopup={handleUpdatePopup}
        onDeletePopup={handleDeletePopup}
        onDuplicatePopup={handleDuplicatePopup}
      />

      {/* Runtime Simulation in Preview Mode (F-282 - F-291) */}
      {isPreview && (
        <PopupRuntimePreview
          popups={popups}
          renderElementTree={renderElementTree}
          onTrackView={handleTrackPopupView}
          onTrackClick={handleTrackPopupClick}
          isPreviewMode={true}
          globalSettings={globalSettings}
        />
      )}

      {/* Developer Modal (F-102 - F-109) */}
      <DeveloperModal
        isOpen={!!devModalMode}
        onClose={() => setDevModalMode(null)}
        mode={devModalMode!}
        targetElement={selectedElement || elements[0]}
        initialValue={
          devModalMode === "element-css" ? selectedElement?.customCss :
            devModalMode === "css-selectors" ? selectedElement?.customSelectors :
              devModalMode === "custom-attributes" ? selectedElement?.customAttributes :
                devModalMode === "page-css" ? pageCss :
                  devModalMode === "global-css" ? globalSettings.customCss :
                    ""
        }
        onSave={(val) => {
          if (devModalMode === "element-css" && selectedElement) {
            updateSelectedProp("customCss", val);
          } else if (devModalMode === "css-selectors" && selectedElement) {
            updateSelectedProp("customSelectors", val);
          } else if (devModalMode === "custom-attributes" && selectedElement) {
            updateSelectedProp("customAttributes", val);
          } else if (devModalMode === "page-css") {
            setPageCss(val);
          } else if (devModalMode === "global-css") {
            setGlobalSettings((prev: any) => ({ ...prev, customCss: val }));
          }
        }}
      />

{/* F-322 / F-334 Save as Template / Update Template Dialog Modal */}
      <SaveTemplateDialog
        isOpen={isSaveTemplateOpen}
        isUpdateMode={isSaveTemplateUpdateMode}
        name={saveTemplateName}
        setName={setSaveTemplateName}
        description={saveTemplateDescription}
        setDescription={setSaveTemplateDescription}
        type={saveTemplateType}
        setType={setSaveTemplateType}
        category={saveTemplateCategory}
        setCategory={setSaveTemplateCategory}
        isSaving={isSavingTemplate}
        error={saveTemplateError}
        validationError={saveTemplateValidationError}
        onClose={closeSaveTemplateDialog}
        onSave={handleSaveTemplateSubmit}
        elements={elements}
        pageSettings={pageSettings}
      />

      {/* F-332 Replace Template Dialog Modal */}
      <ReplaceTemplateDialog
        isOpen={isReplaceTemplateOpen}
        targetElementName={selectedElement ? selectedElement.content || selectedElement.type : "Selected Element"}
        templates={libraryTemplates}
        onClose={() => setIsReplaceTemplateOpen(false)}
        onConfirmReplace={handleConfirmReplaceTemplate}
      />

      {/* F-336 Import Website Kit Dialog Modal */}
      <ImportWebsiteKitDialog
        isOpen={isImportWebsiteKitOpen}
        onClose={() => setIsImportWebsiteKitOpen(false)}
        onImportKit={handleConfirmImportWebsiteKit}
      />

      {/* F-320 Revision History Slide-Over Drawer */}
      <RevisionHistoryPanel
        isOpen={isRevisionHistoryOpen}
        onClose={() => setIsRevisionHistoryOpen(false)}
        websiteId={websiteId || ""}
        onRestore={handleRestoreRevision}
      />

      {/* Modal for Adding New Page */}
      {isAddPageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>✨</span>
                <span>Add New Website Page</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPageModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Page Title / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. About, Services, Contact, Pricing"
                  value={newPageName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPageName(val);
                    if (!newPageSlug || newPageSlug === `/${newPageName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`) {
                      setNewPageSlug(`/${val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500 transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL Path / Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. /about, /services, /contact"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddPageModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewPage}
                disabled={!newPageName.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 transition cursor-pointer"
              >
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Editing Existing Page */}
      {isEditPageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>✏️</span>
                <span>Edit Page Settings</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditPageModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Page Title / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. About Us, Our Services, Contact"
                  value={editPageName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditPageName(val);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500 transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL Path / Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. /about, /services, /contact"
                  value={editPageSlug}
                  onChange={(e) => setEditPageSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditPageModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditPage}
                disabled={!editPageName.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

