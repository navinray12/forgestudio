import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

// ==========================================
// Types & Interfaces
// ==========================================

export type ElementType = "container" | "heading" | "text" | "image" | "button";

export interface ContainerLayout {
  direction?: "column" | "row";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
  gap?: number;
}

export interface ElementStyles {
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  backgroundColor?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  lineHeight?: string;
}

export interface EditorElement {
  id: string;
  type: ElementType;
  content: string;
  src?: string;
  alt?: string;
  href?: string;
  styles: ElementStyles;
  layout?: ContainerLayout;
  children?: EditorElement[];
}

interface WebsiteData {
  id: string;
  name: string;
  slug: string;
  status: string;
  editorData?: {
    version: number;
    elements: EditorElement[];
  };
}

// ==========================================
// Helpers
// ==========================================

function generateId(): string {
  return "el_" + Math.random().toString(36).substring(2, 9);
}

function resolveImageUrl(src: string | undefined, apiUrl: string): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  const cleanApiUrl = apiUrl.replace(/\/$/, "");
  const cleanSrc = src.startsWith("/") ? src : `/${src}`;
  return `${cleanApiUrl}${cleanSrc}`;
}

// Tree Navigation & Manipulation Helpers
function findTreeElement(list: EditorElement[], id: string): EditorElement | null {
  for (const item of list) {
    if (item.id === id) return item;
    if (item.children && item.children.length > 0) {
      const found = findTreeElement(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

function updateTreeElement(
  list: EditorElement[],
  id: string,
  updater: (el: EditorElement) => EditorElement
): EditorElement[] {
  return list.map((item) => {
    if (item.id === id) {
      return updater(item);
    }
    if (item.children && item.children.length > 0) {
      return {
        ...item,
        children: updateTreeElement(item.children, id, updater),
      };
    }
    return item;
  });
}

function deleteTreeElement(list: EditorElement[], id: string): EditorElement[] {
  return list
    .filter((item) => item.id !== id)
    .map((item) => {
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: deleteTreeElement(item.children, id),
        };
      }
      return item;
    });
}

function duplicateTreeElement(list: EditorElement[], id: string): EditorElement[] {
  let result: EditorElement[] = [];

  for (const item of list) {
    if (item.id === id) {
      const clonedItem: EditorElement = JSON.parse(JSON.stringify(item));
      const reassignIds = (node: EditorElement) => {
        node.id = generateId();
        if (node.children) {
          node.children.forEach(reassignIds);
        }
      };
      reassignIds(clonedItem);

      result.push(item);
      result.push(clonedItem);
    } else if (item.children && item.children.length > 0) {
      result.push({
        ...item,
        children: duplicateTreeElement(item.children, id),
      });
    } else {
      result.push(item);
    }
  }

  return result;
}

function insertTreeElement(
  list: EditorElement[],
  targetId: string | null,
  newEl: EditorElement
): EditorElement[] {
  if (!targetId) {
    return [...list, newEl];
  }

  const target = findTreeElement(list, targetId);
  if (!target) {
    return [...list, newEl];
  }

  if (target.type === "container") {
    return updateTreeElement(list, targetId, (c) => ({
      ...c,
      children: [...(c.children || []), newEl],
    }));
  }

  // If target is inside a container, append after target
  let inserted = false;
  const insertInArray = (arr: EditorElement[]): EditorElement[] => {
    const res: EditorElement[] = [];
    for (const item of arr) {
      res.push(item);
      if (item.id === targetId) {
        res.push(newEl);
        inserted = true;
      } else if (item.children && item.children.length > 0) {
        item.children = insertInArray(item.children);
      }
    }
    return res;
  };

  const updatedList = insertInArray(list);
  if (!inserted) {
    return [...list, newEl];
  }
  return updatedList;
}

// ==========================================
// Sidebar Vector Icons (Matching Screenshot)
// ==========================================

const ContainerBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="3 3" />
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  </div>
);

const HeadingBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center font-serif text-lg font-bold text-slate-700">
    H
  </div>
);

const TextBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center font-sans text-lg font-bold text-slate-700">
    T
  </div>
);

const ImageBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </div>
);

const ButtonBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center">
    <div className="h-4 w-5 rounded-md border-2 border-slate-700 bg-slate-100" />
  </div>
);

// Colorful placeholder icon inside empty image box
const EmptyPictureIcon = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" />
    </svg>
  </div>
);

// Upload Icon
const UploadCloudIcon = () => (
  <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// ==========================================
// Default Elements Creator
// ==========================================

function createDefaultElement(type: ElementType): EditorElement {
  const id = generateId();
  switch (type) {
    case "container":
      return {
        id,
        type: "container",
        content: "Container",
        children: [],
        layout: {
          direction: "column",
          justifyContent: "flex-start",
          alignItems: "stretch",
          gap: 10,
        },
        styles: {
          width: "100%",
          height: "auto",
          backgroundColor: "#ffffff",
          paddingTop: "16px",
          paddingRight: "16px",
          paddingBottom: "16px",
          paddingLeft: "16px",
          marginTop: "8px",
          marginBottom: "8px",
          borderRadius: "12px",
        },
      };
    case "heading":
      return {
        id,
        type: "heading",
        content: "Heading Text",
        styles: {
          color: "#0f172a",
          fontSize: "32px",
          fontWeight: "700",
          textAlign: "left",
          marginTop: "16px",
          marginBottom: "16px",
          lineHeight: "1.2",
        },
      };
    case "text":
      return {
        id,
        type: "text",
        content: "Click here to edit this paragraph text. Add your own description and details.",
        styles: {
          color: "#475569",
          fontSize: "16px",
          fontWeight: "400",
          textAlign: "left",
          marginTop: "12px",
          marginBottom: "12px",
          lineHeight: "1.6",
        },
      };
    case "image":
      return {
        id,
        type: "image",
        content: "Image",
        src: "",
        alt: "Uploaded Image",
        styles: {
          width: "100%",
          borderRadius: "8px",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
    case "button":
      return {
        id,
        type: "button",
        content: "Click Me",
        href: "#",
        styles: {
          color: "#ffffff",
          backgroundColor: "#2563eb",
          fontSize: "14px",
          fontWeight: "600",
          textAlign: "center",
          padding: "10px 22px",
          borderRadius: "8px",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
  }
}

// ==========================================
// Main WebsiteEditor Component
// ==========================================

export default function WebsiteEditor() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // State Management
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isPreview, setIsPreview] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Fetch Website Data
  useEffect(() => {
    if (!websiteId) return;

    const fetchWebsite = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || data?.error?.message || "Failed to load website.");
        }

        const loadedSite = data.website || data;
        setWebsite(loadedSite);

        if (loadedSite?.editorData?.elements && Array.isArray(loadedSite.editorData.elements)) {
          setElements(loadedSite.editorData.elements);
        } else {
          // Default starting elements matching screenshot
          setElements([
            createDefaultElement("heading"),
            createDefaultElement("text"),
            createDefaultElement("button"),
            createDefaultElement("heading"),
            createDefaultElement("text"),
            createDefaultElement("button"),
            createDefaultElement("image"),
            createDefaultElement("heading"),
          ]);
        }
      } catch (err) {
        console.error("Error loading website:", err);
        setErrorMessage(err instanceof Error ? err.message : "Error loading website");
      } finally {
        setLoading(false);
      }
    };

    fetchWebsite();
  }, [websiteId, apiUrl]);

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
        },
      };

      const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Failed to save website.");
      }

      setSaveMessage("Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Error saving website:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to save website.");
    } finally {
      setSaving(false);
    }
  };

  // Element Manipulation (Tree Aware)
  const handleAddElement = (type: ElementType) => {
    const newEl = createDefaultElement(type);
    setElements((prev) => insertTreeElement(prev, selectedId, newEl));
    setSelectedId(newEl.id);
  };

  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setElements((prev) => deleteTreeElement(prev, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleDuplicateElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setElements((prev) => duplicateTreeElement(prev, id));
  };

  const selectedElement = selectedId ? findTreeElement(elements, selectedId) : null;

  const updateSelectedProp = (key: keyof EditorElement, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => ({ ...el, [key]: value }))
    );
  };

  const updateSelectedStyle = (key: keyof ElementStyles, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => ({
        ...el,
        styles: { ...el.styles, [key]: value },
      }))
    );
  };

  const updateSelectedLayout = (key: keyof ContainerLayout, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => ({
        ...el,
        layout: { ...el.layout, [key]: value },
      }))
    );
  };

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
        throw new Error(uploadData?.message || uploadData?.error?.message || "Failed to upload image.");
      }

      const returnedUrl = uploadData.url || uploadData?.data?.url;
      if (returnedUrl) {
        updateSelectedProp("src", returnedUrl);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Helper for numeric font size parsing
  const getFontSizeNum = (fontSizeStr?: string) => {
    if (!fontSizeStr) return "16";
    return fontSizeStr.replace(/px$/, "");
  };

  // Recursive Element Tree Renderer
  const renderElementTree = (el: EditorElement): React.ReactNode => {
    const isSelected = selectedId === el.id && !isPreview;

    if (el.type === "container") {
      return (
        <div
          key={el.id}
          onClick={(e) => {
            e.stopPropagation();
            if (!isPreview) setSelectedId(el.id);
          }}
          className={`relative transition-all duration-150 ${
            isPreview
              ? ""
              : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
          } ${
            isSelected
              ? "border-2 border-blue-500 shadow-sm"
              : isPreview
              ? ""
              : "border border-dashed border-slate-300"
          }`}
          style={{
            display: "flex",
            flexDirection: el.layout?.direction || "column",
            justifyContent: el.layout?.justifyContent || "flex-start",
            alignItems: el.layout?.alignItems || "stretch",
            gap: `${el.layout?.gap ?? 10}px`,
            width: el.styles.width || "100%",
            height: el.styles.height || "auto",
            backgroundColor: el.styles.backgroundColor || "transparent",
            paddingTop: el.styles.paddingTop || "16px",
            paddingRight: el.styles.paddingRight || "16px",
            paddingBottom: el.styles.paddingBottom || "16px",
            paddingLeft: el.styles.paddingLeft || "16px",
            marginTop: el.styles.marginTop || "8px",
            marginRight: el.styles.marginRight || "0px",
            marginBottom: el.styles.marginBottom || "8px",
            marginLeft: el.styles.marginLeft || "0px",
            borderRadius: el.styles.borderRadius || "8px",
          }}
        >
          {isSelected && (
            <div className="absolute -top-3.5 right-3 z-30 flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
              <span>Container</span>
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
                className="hover:underline"
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

    return (
      <div
        key={el.id}
        onClick={(e) => {
          e.stopPropagation();
          if (!isPreview) setSelectedId(el.id);
        }}
        className={`relative rounded-xl transition duration-150 ${
          isPreview
            ? ""
            : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
        } ${
          isSelected
            ? "border-2 border-blue-500 p-2.5"
            : "p-2.5 border border-transparent"
        }`}
        style={{
          marginTop: el.styles.marginTop,
          marginBottom: el.styles.marginBottom,
        }}
      >
        {isSelected && (
          <div className="absolute -top-3.5 right-3 z-30 flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
            <button
              onClick={(e) => handleDuplicateElement(el.id, e)}
              className="hover:underline"
            >
              Duplicate
            </button>
            <span>•</span>
            <button
              onClick={(e) => handleDeleteElement(el.id, e)}
              className="hover:underline"
            >
              Delete
            </button>
          </div>
        )}

        {/* Element Renderers */}
        {el.type === "heading" && (
          <h2
            style={{
              color: el.styles.color || "#0f172a",
              fontSize: el.styles.fontSize || "32px",
              fontWeight: el.styles.fontWeight || "700",
              textAlign: el.styles.textAlign || "left",
              lineHeight: el.styles.lineHeight || "1.2",
            }}
          >
            {el.content}
          </h2>
        )}

        {el.type === "text" && (
          <p
            style={{
              color: el.styles.color || "#475569",
              fontSize: el.styles.fontSize || "16px",
              fontWeight: el.styles.fontWeight || "400",
              textAlign: el.styles.textAlign || "left",
              lineHeight: el.styles.lineHeight || "1.6",
            }}
          >
            {el.content}
          </p>
        )}

        {el.type === "image" && (
          <div style={{ textAlign: el.styles.textAlign || "left" }}>
            {el.src ? (
              <img
                src={resolveImageUrl(el.src, apiUrl)}
                alt={el.alt || "Uploaded Image"}
                className="inline-block object-cover max-w-full"
                style={{
                  width: el.styles.width || "100%",
                  height: el.styles.height || "auto",
                  borderRadius: el.styles.borderRadius || "8px",
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-10 px-6 text-center transition hover:border-blue-400">
                <EmptyPictureIcon />
                <h4 className="mt-3 text-xs font-bold text-slate-700">
                  No Image Selected
                </h4>
                <p className="mt-1 text-[11px] text-slate-400">
                  Click to choose or upload an image in the right panel
                </p>
              </div>
            )}
          </div>
        )}

        {el.type === "button" && (
          <div style={{ textAlign: el.styles.textAlign || "left" }}>
            <a
              href={el.href || "#"}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
              className="inline-block transition hover:opacity-90 shadow-sm"
              style={{
                color: el.styles.color || "#ffffff",
                backgroundColor: el.styles.backgroundColor || "#2563eb",
                fontSize: el.styles.fontSize || "14px",
                fontWeight: el.styles.fontWeight || "600",
                padding: el.styles.padding || "10px 22px",
                borderRadius: el.styles.borderRadius || "8px",
              }}
            >
              {el.content}
            </a>
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
      {/* Top Header Bar (Dark Navy, matching screenshot) */}
      {/* ========================================== */}
      <header className="flex h-12 shrink-0 items-center justify-between bg-[#0b1329] px-5 shadow-md">
        {/* Left: Dashboard link & Site Name */}
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1"
          >
            ‹ Dashboard
          </Link>

          <span className="text-xs font-bold text-white tracking-wide">
            {website?.name || "new 1"}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-xs font-medium text-emerald-400">
              ✓ {saveMessage}
            </span>
          )}

          {errorMessage && (
            <span className="text-xs font-medium text-red-400">
              {errorMessage}
            </span>
          )}

          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`rounded-full border border-slate-600 bg-transparent px-4 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white ${
              isPreview ? "bg-amber-500/20 text-amber-300 border-amber-500/50" : ""
            }`}
          >
            {isPreview ? "Exit Preview" : "Preview"}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-1 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* ========================================== */}
      {/* Main Workspace Body                         */}
      {/* ========================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ========================================== */}
        {/* Left Sidebar: ELEMENTS                     */}
        {/* ========================================== */}
        {!isPreview && (
          <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto shadow-sm">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
              ELEMENTS
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Container */}
              <button
                onClick={() => handleAddElement("container")}
                className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <ContainerBoxIcon />
                <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800">
                  + Add Container
                </span>
              </button>

              {/* Heading */}
              <button
                onClick={() => handleAddElement("heading")}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <HeadingBoxIcon />
                <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  Heading
                </span>
              </button>

              {/* Text */}
              <button
                onClick={() => handleAddElement("text")}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <TextBoxIcon />
                <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  Text
                </span>
              </button>

              {/* Image */}
              <button
                onClick={() => handleAddElement("image")}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <ImageBoxIcon />
                <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  Image
                </span>
              </button>

              {/* Button */}
              <button
                onClick={() => handleAddElement("button")}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <ButtonBoxIcon />
                <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  Button
                </span>
              </button>
            </div>
          </aside>
        )}

        {/* ========================================== */}
        {/* Center: White Canvas Container              */}
        {/* ========================================== */}
        <main
          onClick={() => setSelectedId(null)}
          className="flex flex-1 justify-center items-start overflow-y-auto bg-[#f1f5f9] p-6 sm:p-10"
        >
          <div className="w-full max-w-[760px] min-h-[750px] h-auto shrink-0 my-2 rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm transition-all pb-20">
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

            {selectedElement ? (
              <div className="space-y-5">
                {/* Element Type Header & Quick Actions */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    {selectedElement.type}
                  </span>

                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <button
                      onClick={(e) => handleDuplicateElement(selectedElement.id, e)}
                      className="text-blue-600 hover:underline"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => handleDeleteElement(selectedElement.id, e)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Container Specific Layout Controls */}
                {selectedElement.type === "container" && (
                  <div className="space-y-4">
                    {/* Direction */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Direction
                      </label>
                      <select
                        value={selectedElement.layout?.direction || "column"}
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
                        value={selectedElement.layout?.justifyContent || "flex-start"}
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
                        value={selectedElement.layout?.alignItems || "stretch"}
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
                      <input
                        type="number"
                        value={selectedElement.layout?.gap ?? 10}
                        onChange={(e) => updateSelectedLayout("gap", Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Width & Height */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Width
                        </label>
                        <select
                          value={selectedElement.styles.width || "100%"}
                          onChange={(e) => updateSelectedStyle("width", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="100%">100%</option>
                          <option value="75%">75%</option>
                          <option value="50%">50%</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Height
                        </label>
                        <select
                          value={selectedElement.styles.height || "auto"}
                          onChange={(e) => updateSelectedStyle("height", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="auto">Auto</option>
                          <option value="200px">200px</option>
                          <option value="300px">300px</option>
                          <option value="400px">400px</option>
                        </select>
                      </div>
                    </div>

                    {/* Padding Controls */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Padding (px)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] text-slate-500">
                        <div>
                          <span>Top</span>
                          <input
                            type="number"
                            value={parseInt(selectedElement.styles.paddingTop || "16")}
                            onChange={(e) => updateSelectedStyle("paddingTop", `${e.target.value}px`)}
                            className="w-full rounded border border-slate-300 p-1 text-center text-xs"
                          />
                        </div>
                        <div>
                          <span>Right</span>
                          <input
                            type="number"
                            value={parseInt(selectedElement.styles.paddingRight || "16")}
                            onChange={(e) => updateSelectedStyle("paddingRight", `${e.target.value}px`)}
                            className="w-full rounded border border-slate-300 p-1 text-center text-xs"
                          />
                        </div>
                        <div>
                          <span>Bottom</span>
                          <input
                            type="number"
                            value={parseInt(selectedElement.styles.paddingBottom || "16")}
                            onChange={(e) => updateSelectedStyle("paddingBottom", `${e.target.value}px`)}
                            className="w-full rounded border border-slate-300 p-1 text-center text-xs"
                          />
                        </div>
                        <div>
                          <span>Left</span>
                          <input
                            type="number"
                            value={parseInt(selectedElement.styles.paddingLeft || "16")}
                            onChange={(e) => updateSelectedStyle("paddingLeft", `${e.target.value}px`)}
                            className="w-full rounded border border-slate-300 p-1 text-center text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Margin Controls */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Margin (px)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] text-slate-500">
                        <div>
                          <span>Top</span>
                          <input
                            type="number"
                            value={parseInt(selectedElement.styles.marginTop || "8")}
                            onChange={(e) => updateSelectedStyle("marginTop", `${e.target.value}px`)}
                            className="w-full rounded border border-slate-300 p-1 text-center text-xs"
                          />
                        </div>
                        <div>
                          <span>Right</span>
                          <input
                            type="number"
                            value={parseInt(selectedElement.styles.marginRight || "0")}
                            onChange={(e) => updateSelectedStyle("marginRight", `${e.target.value}px`)}
                            className="w-full rounded border border-slate-300 p-1 text-center text-xs"
                          />
                        </div>
                        <div>
                          <span>Bottom</span>
                          <input
                            type="number"
                            value={parseInt(selectedElement.styles.marginBottom || "8")}
                            onChange={(e) => updateSelectedStyle("marginBottom", `${e.target.value}px`)}
                            className="w-full rounded border border-slate-300 p-1 text-center text-xs"
                          />
                        </div>
                        <div>
                          <span>Left</span>
                          <input
                            type="number"
                            value={parseInt(selectedElement.styles.marginLeft || "0")}
                            onChange={(e) => updateSelectedStyle("marginLeft", `${e.target.value}px`)}
                            className="w-full rounded border border-slate-300 p-1 text-center text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Container Background Color */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Background Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.styles.backgroundColor || "#ffffff"}
                          onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={selectedElement.styles.backgroundColor || "#ffffff"}
                          onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Input */}
                {selectedElement.type !== "image" && selectedElement.type !== "container" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Text
                    </label>
                    <textarea
                      rows={selectedElement.type === "text" ? 3 : 2}
                      value={selectedElement.content}
                      onChange={(e) => updateSelectedProp("content", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Font Size Input (px) */}
                {selectedElement.type !== "image" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Font Size (px)
                    </label>
                    <input
                      type="number"
                      value={getFontSizeNum(selectedElement.styles.fontSize)}
                      onChange={(e) =>
                        updateSelectedStyle(
                          "fontSize",
                          e.target.value ? `${e.target.value}px` : "16px"
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Font Weight Dropdown */}
                {selectedElement.type !== "image" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Font Weight
                    </label>
                    <select
                      value={selectedElement.styles.fontWeight || "400"}
                      onChange={(e) => updateSelectedStyle("fontWeight", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">SemiBold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">ExtraBold (800)</option>
                    </select>
                  </div>
                )}

                {/* Text Color Input */}
                {selectedElement.type !== "image" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.styles.color || "#0f172a"}
                        onChange={(e) => updateSelectedStyle("color", e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={selectedElement.styles.color || "#0f172a"}
                        onChange={(e) => updateSelectedStyle("color", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Alignment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alignment
                  </label>
                  <select
                    value={selectedElement.styles.textAlign || "left"}
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
                {selectedElement.type === "button" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Button Link (URL)
                    </label>
                    <input
                      type="text"
                      value={selectedElement.href || "#"}
                      onChange={(e) => updateSelectedProp("href", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Button Background Color */}
                {selectedElement.type === "button" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Button Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.styles.backgroundColor || "#2563eb"}
                        onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={selectedElement.styles.backgroundColor || "#2563eb"}
                        onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Image Upload Dropzone & Controls */}
                {selectedElement.type === "image" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700">
                      Upload Computer Image
                    </label>

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

                      <UploadCloudIcon />
                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        {isUploading ? "Uploading..." : "Choose Image from Computer"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Supports JPG, PNG, WEBP, GIF, SVG (Max 5MB)
                      </p>

                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {isUploading ? "Uploading..." : "Browse Files"}
                      </button>
                    </div>

                    {uploadError && (
                      <p className="text-xs font-semibold text-red-500">{uploadError}</p>
                    )}

                    {/* Active Preview Thumbnail */}
                    {selectedElement.src && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="block text-[11px] font-bold text-slate-500 mb-2">
                          Image Preview:
                        </span>
                        <img
                          src={resolveImageUrl(selectedElement.src, apiUrl)}
                          alt="Preview"
                          className="h-28 w-full object-contain rounded-md border border-slate-200 bg-white"
                        />
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 rounded-lg border border-slate-300 bg-white py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => updateSelectedProp("src", "")}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Direct Image URL input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Or Image Web URL
                      </label>
                      <input
                        type="text"
                        value={selectedElement.src || ""}
                        onChange={(e) => updateSelectedProp("src", e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Basic Image Styling: Width, Height, Border Radius */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Width
                        </label>
                        <select
                          value={selectedElement.styles.width || "100%"}
                          onChange={(e) => updateSelectedStyle("width", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="100%">100% (Full)</option>
                          <option value="75%">75%</option>
                          <option value="50%">50%</option>
                          <option value="25%">25%</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Height
                        </label>
                        <select
                          value={selectedElement.styles.height || "auto"}
                          onChange={(e) => updateSelectedStyle("height", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="auto">Auto</option>
                          <option value="200px">200px</option>
                          <option value="300px">300px</option>
                          <option value="400px">400px</option>
                          <option value="500px">500px</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Border Radius
                        </label>
                        <select
                          value={selectedElement.styles.borderRadius || "8px"}
                          onChange={(e) => updateSelectedStyle("borderRadius", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="0px">0px (Square)</option>
                          <option value="4px">4px (Small)</option>
                          <option value="8px">8px (Medium)</option>
                          <option value="16px">16px (Large)</option>
                          <option value="9999px">Rounded Pill / Circle</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Alt Text
                        </label>
                        <input
                          type="text"
                          value={selectedElement.alt || ""}
                          onChange={(e) => updateSelectedProp("alt", e.target.value)}
                          placeholder="Image alt description"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center p-4 text-slate-400">
                <p className="text-xs font-medium">
                  Select an element on the canvas to customize text, colors, font sizes, or upload images.
                </p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
