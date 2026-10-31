import React, { useState, useEffect, useRef } from "react";

export interface MediaAssetItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  createdAt: string;
}

export interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, altText?: string) => void;
  websiteId?: string;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  websiteId,
}) => {
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mimeTypeFilter, setMimeTypeFilter] = useState("all");
  const [altTextInput, setAltTextInput] = useState("");
  const [savingAlt, setSavingAlt] = useState(false);
  const [altSuccess, setAltSuccess] = useState(false);
  const [altError, setAltError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");

  // Feedback & Warning States
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{
    assetId: string;
    message: string;
  } | null>(null);

  // Image Optimization States (Feature 8)
  const [optQuality, setOptQuality] = useState<number>(75);
  const [optMaxDim, setOptMaxDim] = useState<string>("original");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);
  const [optResult, setOptResult] = useState<{
    originalBytes: number;
    optimizedBytes: number;
    bytesSaved: number;
    savingsPercentage: string;
    width?: number;
    height?: number;
    optimizedUrl: string;
    asset?: MediaAssetItem;
  } | null>(null);

  // WebP Conversion States (Feature 9)
  const [webpQuality, setWebpQuality] = useState<number>(80);
  const [isConvertingWebp, setIsConvertingWebp] = useState(false);
  const [webpError, setWebpError] = useState<string | null>(null);
  const [webpResult, setWebpResult] = useState<{
    originalBytes: number;
    convertedBytes: number;
    bytesSaved: number;
    savingsPercentage: string;
    width?: number;
    height?: number;
    convertedUrl: string;
    asset?: MediaAssetItem;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

  const getMediaUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    const cleanApi = apiUrl.replace(/\/$/, "");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanApi}${cleanPath}`;
  };

  const cleanWebsiteId = websiteId && websiteId.trim() !== "" && websiteId !== "undefined" && websiteId !== "null"
    ? websiteId.trim()
    : undefined;

  const fetchMediaAssets = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (cleanWebsiteId) params.append("websiteId", cleanWebsiteId);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (mimeTypeFilter && mimeTypeFilter !== "all") {
        params.append("mimeType", mimeTypeFilter);
      }

      const res = await fetch(`${apiUrl}/api/media?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status} failed to load media assets`);
      }

      const data = await res.json();
      const loadedAssets: MediaAssetItem[] = data.assets || [];
      setAssets(loadedAssets);

      if (loadedAssets.length > 0) {
        // Keep selected if still in list, else pick first
        setSelectedAsset((prev) => {
          if (prev && loadedAssets.some((a) => a.id === prev.id)) {
            return loadedAssets.find((a) => a.id === prev.id) || loadedAssets[0];
          }
          return loadedAssets[0];
        });
      } else {
        setSelectedAsset(null);
      }
    } catch (err: any) {
      console.error("Error fetching media assets:", err);
      setFetchError(err.message || "Failed to load media assets from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        fetchMediaAssets();
      });
    }
  }, [isOpen, websiteId, mimeTypeFilter]);

  useEffect(() => {
    if (selectedAsset) {
      queueMicrotask(() => {
        setAltTextInput(selectedAsset.altText || "");
        setAltError(null);
        setAltSuccess(false);
        setDeleteWarning(null);
        setOptError(null);
        setOptResult(null);
        setWebpError(null);
        setWebpResult(null);
      });
    }
  }, [selectedAsset]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Client-side extension check
        const ext = file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase();
        const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
        if (!allowedExtensions.includes(ext)) {
          throw new Error(`"${file.name}" has an unsupported format. Allowed formats: JPG, JPEG, PNG, WEBP, GIF, SVG.`);
        }

        // 2. 5MB Client Check & Empty File Check
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 5MB file size limit.`);
        }
        if (file.size === 0) {
          throw new Error(`"${file.name}" is an empty file.`);
        }

        const formData = new FormData();
        formData.append("image", file);
        if (cleanWebsiteId) {
          formData.append("websiteId", cleanWebsiteId);
        }

        const res = await fetch(`${apiUrl}/api/uploads/image`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Failed to upload "${file.name}"`);
        }

        const data = await res.json();
        if (data.asset) {
          setAssets((prev) => [data.asset, ...prev]);
          setSelectedAsset(data.asset);
        }
      }

      setActiveTab("library");
      await fetchMediaAssets();
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAltText = async () => {
    if (!selectedAsset) return;
    setSavingAlt(true);
    setAltError(null);
    setAltSuccess(false);

    try {
      const res = await fetch(`${apiUrl}/api/media/${selectedAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText: altTextInput }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update alt text");
      }

      setSelectedAsset(data.asset);
      setAssets((prev) =>
        prev.map((a) => (a.id === data.asset.id ? data.asset : a))
      );
      setAltSuccess(true);
      setTimeout(() => setAltSuccess(false), 2500);
    } catch (err: any) {
      console.error("Error updating alt text:", err);
      setAltError(err?.message || "Could not save alt text.");
    } finally {
      setSavingAlt(false);
    }
  };

  const handleDeleteAsset = async (id: string, force: boolean = false) => {
    setDeleteWarning(null);
    try {
      const query = force ? "?force=true" : "";
      const res = await fetch(`${apiUrl}/api/media/${id}${query}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        setDeleteWarning({
          assetId: id,
          message: data.error?.message || "This media asset is currently used by website elements.",
        });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to delete media asset");
      }

      setAssets((prev) => prev.filter((a) => a.id !== id));
      if (selectedAsset?.id === id) {
        setSelectedAsset(null);
      }
    } catch (err: any) {
      console.error("Error deleting asset:", err);
      alert(err.message || "Could not delete media asset.");
    }
  };

  const handleOptimizeSelectedAsset = async () => {
    if (!selectedAsset) return;
    setIsOptimizing(true);
    setOptError(null);
    setOptResult(null);

    try {
      const maxDimVal = optMaxDim !== "original" ? parseInt(optMaxDim, 10) : undefined;

      const endpoint = cleanWebsiteId
        ? `${apiUrl}/api/websites/${cleanWebsiteId}/images/optimize-image`
        : `${apiUrl}/api/media/${selectedAsset.id}/optimize`;

      const payload = cleanWebsiteId
        ? {
            assetId: selectedAsset.id,
            quality: optQuality,
            maxWidth: maxDimVal,
            maxHeight: maxDimVal,
          }
        : {
            quality: optQuality,
            maxWidth: maxDimVal,
            maxHeight: maxDimVal,
            websiteId: cleanWebsiteId,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Image optimization failed");
      }

      setOptResult({
        originalBytes: data.originalBytes,
        optimizedBytes: data.optimizedBytes,
        bytesSaved: data.bytesSaved,
        savingsPercentage: data.savingsPercentage,
        width: data.width,
        height: data.height,
        optimizedUrl: data.optimizedUrl,
        asset: data.asset,
      });

      // Refresh media assets so the newly registered optimized asset appears in the grid
      await fetchMediaAssets();
    } catch (err: any) {
      setOptError(err?.message || "Failed to optimize image");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleConvertToWebp = async () => {
    if (!selectedAsset) return;
    setIsConvertingWebp(true);
    setWebpError(null);
    setWebpResult(null);

    try {
      const endpoint = cleanWebsiteId
        ? `${apiUrl}/api/websites/${cleanWebsiteId}/images/convert-webp`
        : `${apiUrl}/api/media/${selectedAsset.id}/convert-webp`;

      const payload = cleanWebsiteId
        ? {
            assetId: selectedAsset.id,
            quality: webpQuality,
          }
        : {
            quality: webpQuality,
            websiteId: cleanWebsiteId,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "WebP conversion failed");
      }

      setWebpResult({
        originalBytes: data.originalBytes,
        convertedBytes: data.convertedBytes,
        bytesSaved: data.bytesSaved,
        savingsPercentage: data.savingsPercentage,
        width: data.width,
        height: data.height,
        convertedUrl: data.convertedUrl,
        asset: data.asset,
      });

      // Refresh media assets so the newly registered WebP asset appears in the grid
      await fetchMediaAssets();
    } catch (err: any) {
      setWebpError(err?.message || "Failed to convert image to WebP");
    } finally {
      setIsConvertingWebp(false);
    }
  };

  if (!isOpen) return null;

  const filteredAssets = assets.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      a.originalName?.toLowerCase().includes(q) ||
      a.filename?.toLowerCase().includes(q) ||
      a.altText?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-library-modal-title"
        style={{
          width: "100%",
          maxWidth: "1100px",
          height: "85vh",
          backgroundColor: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "#f4f4f5",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h2 id="media-library-modal-title" style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
              📁 Media Library
            </h2>
            <div
              style={{
                display: "flex",
                backgroundColor: "#27272a",
                borderRadius: "6px",
                padding: "2px",
              }}
            >
              <button
                type="button"
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "none",
                  fontSize: "13px",
                  cursor: "pointer",
                  backgroundColor: activeTab === "library" ? "#3b82f6" : "transparent",
                  color: activeTab === "library" ? "#fff" : "#a1a1aa",
                  fontWeight: 500,
                }}
                onClick={() => setActiveTab("library")}
              >
                Media Files ({assets.length})
              </button>
              <button
                type="button"
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "none",
                  fontSize: "13px",
                  cursor: "pointer",
                  backgroundColor: activeTab === "upload" ? "#3b82f6" : "transparent",
                  color: activeTab === "upload" ? "#fff" : "#a1a1aa",
                  fontWeight: 500,
                }}
                onClick={() => setActiveTab("upload")}
              >
                Upload New
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media library"
            style={{
              background: "transparent",
              border: "none",
              color: "#a1a1aa",
              fontSize: "20px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Global Error Banner */}
        {fetchError && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              padding: "10px 24px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>⚠️ {fetchError}</span>
            <button
              type="button"
              onClick={fetchMediaAssets}
              style={{
                background: "none",
                border: "1px solid #fca5a5",
                borderRadius: "4px",
                color: "#fca5a5",
                padding: "2px 8px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Body */}
        {activeTab === "upload" ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px",
            }}
          >
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              style={{
                border: "2px dashed #3f3f46",
                borderRadius: "12px",
                padding: "60px 40px",
                textAlign: "center",
                maxWidth: "500px",
                width: "100%",
                backgroundColor: "#27272a",
                cursor: "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*,.webp,.svg,.gif,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>📁</div>
              <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>
                Drag & drop image files here
              </h3>
              <p style={{ margin: "0 0 16px", color: "#a1a1aa", fontSize: "13px" }}>
                Supports JPG, PNG, WEBP, GIF, SVG (Up to 5MB each)
              </p>
              {uploadError && (
                <div
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid #ef4444",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    color: "#fca5a5",
                    fontSize: "12px",
                    marginBottom: "16px",
                  }}
                >
                  ⚠️ {uploadError}
                </div>
              )}
              <button
                type="button"
                style={{
                  padding: "8px 20px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Browse Local Files"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Left/Middle: Search, Filters & Gallery Grid */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid #27272a",
                overflow: "hidden",
              }}
            >
              {/* Search & Filter Bar */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #27272a",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search assets by filename or alt text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchMediaAssets();
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 14px",
                    backgroundColor: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "13px",
                  }}
                />

                {/* Media Type Filter Dropdown */}
                <select
                  value={mimeTypeFilter}
                  onChange={(e) => setMimeTypeFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Media Types</option>
                  <option value="image/png">PNG Images</option>
                  <option value="image/jpeg">JPEG / JPG</option>
                  <option value="image/webp">WebP</option>
                  <option value="image/svg+xml">SVG Vectors</option>
                  <option value="image/gif">GIF Animations</option>
                </select>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#27272a",
                    border: "1px solid #3f3f46",
                    color: "white",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Upload
                </button>
              </div>

              {/* Grid Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "14px",
                  alignContent: "start",
                }}
              >
                {loading ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#a1a1aa" }}>
                    Loading media assets...
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "60px 20px",
                      color: "#a1a1aa",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontSize: "36px" }}>🖼️</span>
                    <span style={{ fontSize: "14px", fontWeight: 500 }}>
                      {searchQuery || mimeTypeFilter !== "all"
                        ? "No media assets match your search/filter."
                        : "No media assets found in your library."}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("upload")}
                      style={{
                        padding: "6px 16px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Upload First Image
                    </button>
                  </div>
                ) : (
                  filteredAssets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        style={{
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: isSelected ? "2px solid #3b82f6" : "1px solid #27272a",
                          backgroundColor: "#27272a",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          position: "relative",
                          aspectRatio: "1 / 1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={getMediaUrl(asset.url)}
                          alt={asset.altText || asset.originalName}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                          }}
                        />
                        {asset.width && asset.height && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "4px",
                              left: "4px",
                              backgroundColor: "rgba(0,0,0,0.75)",
                              color: "#fff",
                              fontSize: "10px",
                              padding: "2px 4px",
                              borderRadius: "4px",
                            }}
                          >
                            {asset.width}×{asset.height}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Sidebar: Details & Actions */}
            <div
              style={{
                width: "320px",
                backgroundColor: "#202023",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                overflowY: "auto",
              }}
            >
              {selectedAsset ? (
                <>
                  <div
                    style={{
                      height: "180px",
                      backgroundColor: "#18181b",
                      borderRadius: "8px",
                      border: "1px solid #27272a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px",
                    }}
                  >
                    <img
                      src={getMediaUrl(selectedAsset.url)}
                      alt={selectedAsset.altText || ""}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>

                  <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontWeight: 600, wordBreak: "break-all" }}>
                      {selectedAsset.originalName}
                    </div>
                    <div style={{ color: "#a1a1aa" }}>
                      {selectedAsset.width && selectedAsset.height
                        ? `${selectedAsset.width} × ${selectedAsset.height} px • `
                        : ""}
                      {Math.round(selectedAsset.sizeBytes / 1024)} KB
                    </div>
                    <div style={{ color: "#a1a1aa", fontSize: "11px" }}>
                      Format: {selectedAsset.mimeType}
                    </div>
                    {selectedAsset.createdAt && (
                      <div style={{ color: "#71717a", fontSize: "11px" }}>
                        Uploaded: {new Date(selectedAsset.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Alt Text Input */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: 500 }}>
                        Alt Text (SEO & Accessibility)
                      </label>
                      <span style={{ fontSize: "10px", color: "#71717a" }}>
                        Leave blank for decorative
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="Describe this image for screen readers..."
                        value={altTextInput}
                        onChange={(e) => {
                          setAltTextInput(e.target.value);
                          setAltError(null);
                          setAltSuccess(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveAltText();
                          }
                        }}
                        onBlur={handleSaveAltText}
                        maxLength={500}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          backgroundColor: "#18181b",
                          border: altError ? "1px solid #ef4444" : "1px solid #3f3f46",
                          borderRadius: "6px",
                          color: "white",
                          fontSize: "12px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveAltText}
                        disabled={savingAlt}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#27272a",
                          border: "1px solid #3f3f46",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          cursor: savingAlt ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {savingAlt ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {savingAlt && (
                      <span style={{ fontSize: "11px", color: "#3b82f6" }}>Saving alt text...</span>
                    )}
                    {altSuccess && (
                      <span style={{ fontSize: "11px", color: "#10b981" }}>✓ Alt text saved</span>
                    )}
                    {altError && (
                      <span style={{ fontSize: "11px", color: "#ef4444" }}>⚠️ {altError}</span>
                    )}
                  </div>

                  {/* Direct Link */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: 500 }}>
                      File URL
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        readOnly
                        value={selectedAsset.url}
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          backgroundColor: "#18181b",
                          border: "1px solid #3f3f46",
                          borderRadius: "4px",
                          color: "#a1a1aa",
                          fontSize: "11px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(selectedAsset.url)}
                        style={{
                          padding: "6px 10px",
                          backgroundColor: "#27272a",
                          border: "1px solid #3f3f46",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Safe Deletion Warning State */}
                  {deleteWarning && (
                    <div
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        borderRadius: "8px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "#fca5a5", lineHeight: "1.4" }}>
                        ⚠️ <strong>Asset In Use:</strong> {deleteWarning.message}
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setDeleteWarning(null)}
                          style={{
                            flex: 1,
                            padding: "6px",
                            backgroundColor: "#27272a",
                            border: "1px solid #3f3f46",
                            color: "white",
                            borderRadius: "4px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          Keep Asset
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(deleteWarning.assetId, true)}
                          style={{
                            flex: 1,
                            padding: "6px",
                            backgroundColor: "#ef4444",
                            border: "none",
                            color: "white",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Force Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Image Optimization Section (Feature 8) */}
                  {selectedAsset.mimeType?.startsWith("image/") && (
                    <div
                      style={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#e4e4e7" }}>
                          ⚡ Image Optimization
                        </span>
                        <span style={{ fontSize: "10px", color: "#a1a1aa", backgroundColor: "#27272a", padding: "2px 6px", borderRadius: "4px" }}>
                          Feature 8
                        </span>
                      </div>

                      {/* Quality Presets */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "11px", color: "#a1a1aa" }}>Compression Quality</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                          {[
                            { label: "High (85%)", val: 85 },
                            { label: "Balanced (75%)", val: 75 },
                            { label: "Max (60%)", val: 60 },
                          ].map((q) => (
                            <button
                              key={q.val}
                              type="button"
                              onClick={() => setOptQuality(q.val)}
                              style={{
                                padding: "4px",
                                fontSize: "10px",
                                borderRadius: "4px",
                                border: optQuality === q.val ? "1px solid #3b82f6" : "1px solid #3f3f46",
                                backgroundColor: optQuality === q.val ? "#1d4ed8" : "#27272a",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: optQuality === q.val ? 600 : 400,
                              }}
                            >
                              {q.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max Dimension */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "11px", color: "#a1a1aa" }}>Max Dimension (Proportional)</label>
                        <select
                          value={optMaxDim}
                          onChange={(e) => setOptMaxDim(e.target.value)}
                          style={{
                            padding: "6px 8px",
                            fontSize: "11px",
                            backgroundColor: "#27272a",
                            border: "1px solid #3f3f46",
                            color: "white",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <option value="original">Keep Original Dimensions</option>
                          <option value="1920">Max 1920px (Desktop Full)</option>
                          <option value="1200">Max 1200px (Content Width)</option>
                          <option value="800">Max 800px (Mobile / Thumbnail)</option>
                        </select>
                      </div>

                      {/* Optimize Action Button */}
                      <button
                        type="button"
                        onClick={handleOptimizeSelectedAsset}
                        disabled={isOptimizing}
                        style={{
                          padding: "8px",
                          backgroundColor: "#6366f1",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: isOptimizing ? "not-allowed" : "pointer",
                          opacity: isOptimizing ? 0.6 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        {isOptimizing ? "Compressing & Resizing..." : "⚡ Optimize Image"}
                      </button>

                      {/* Error Box */}
                      {optError && (
                        <div style={{ fontSize: "11px", color: "#f87171", backgroundColor: "rgba(239, 68, 68, 0.15)", padding: "6px 8px", borderRadius: "4px" }}>
                          ❌ {optError}
                        </div>
                      )}

                      {/* Results Box */}
                      {optResult && (
                        <div
                          style={{
                            backgroundColor: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            borderRadius: "6px",
                            padding: "8px 10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#34d399", display: "flex", justifyContent: "space-between" }}>
                            <span>✓ Optimization Complete</span>
                            <span>{optResult.savingsPercentage} saved</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#a1a1aa", lineHeight: "1.4" }}>
                            <div>Size: {Math.round(optResult.originalBytes / 1024)} KB → <strong style={{ color: "#34d399" }}>{Math.round(optResult.optimizedBytes / 1024)} KB</strong> ({Math.round(optResult.bytesSaved / 1024)} KB saved)</div>
                            {optResult.width && optResult.height && (
                              <div>Dimensions: {optResult.width} × {optResult.height} px</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(optResult.optimizedUrl, optResult.asset?.altText || altTextInput);
                              onClose();
                            }}
                            style={{
                              padding: "6px 10px",
                              backgroundColor: "#059669",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              marginTop: "2px",
                            }}
                          >
                            ✓ Use Optimized Image
                          </button>
                          <span style={{ fontSize: "10px", color: "#71717a" }}>
                            Original asset remains safely untouched in your library.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WebP Conversion Section (Feature 9) */}
                  {selectedAsset.mimeType?.startsWith("image/") && (
                    <div
                      style={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#e4e4e7" }}>
                          🌐 WebP Conversion
                        </span>
                        <span style={{ fontSize: "10px", color: "#60a5fa", backgroundColor: "rgba(59, 130, 246, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                          Feature 9
                        </span>
                      </div>

                      {selectedAsset.mimeType === "image/svg+xml" ? (
                        <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                          SVG vector graphics are already scalable and cannot be converted to raster WebP format.
                        </div>
                      ) : (
                        <>
                          {/* WebP Quality Presets */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "11px", color: "#a1a1aa" }}>WebP Quality</label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                              {[
                                { label: "High (90%)", val: 90 },
                                { label: "Balanced (80%)", val: 80 },
                                { label: "Max Save (70%)", val: 70 },
                              ].map((q) => (
                                <button
                                  key={q.val}
                                  type="button"
                                  onClick={() => setWebpQuality(q.val)}
                                  style={{
                                    padding: "4px",
                                    fontSize: "10px",
                                    borderRadius: "4px",
                                    border: webpQuality === q.val ? "1px solid #3b82f6" : "1px solid #3f3f46",
                                    backgroundColor: webpQuality === q.val ? "#1d4ed8" : "#27272a",
                                    color: "white",
                                    cursor: "pointer",
                                    fontWeight: webpQuality === q.val ? 600 : 400,
                                  }}
                                >
                                  {q.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Convert to WebP Action Button */}
                          <button
                            type="button"
                            onClick={handleConvertToWebp}
                            disabled={isConvertingWebp}
                            style={{
                              padding: "8px",
                              backgroundColor: "#0284c7",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: isConvertingWebp ? "not-allowed" : "pointer",
                              opacity: isConvertingWebp ? 0.6 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            {isConvertingWebp ? "Converting to WebP..." : "🌐 Convert to WebP"}
                          </button>

                          {/* Error Box */}
                          {webpError && (
                            <div style={{ fontSize: "11px", color: "#f87171", backgroundColor: "rgba(239, 68, 68, 0.15)", padding: "6px 8px", borderRadius: "4px" }}>
                              ❌ {webpError}
                            </div>
                          )}

                          {/* Results Box */}
                          {webpResult && (
                            <div
                              style={{
                                backgroundColor: "rgba(14, 165, 233, 0.12)",
                                border: "1px solid rgba(14, 165, 233, 0.3)",
                                borderRadius: "6px",
                                padding: "8px 10px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                              }}
                            >
                              <div style={{ fontSize: "11px", fontWeight: 600, color: "#38bdf8", display: "flex", justifyContent: "space-between" }}>
                                <span>✓ WebP Conversion Complete</span>
                                {webpResult.bytesSaved > 0 ? (
                                  <span>{webpResult.savingsPercentage} saved</span>
                                ) : (
                                  <span>WebP format</span>
                                )}
                              </div>
                              <div style={{ fontSize: "11px", color: "#a1a1aa", lineHeight: "1.4" }}>
                                <div>
                                  Size: {Math.round(webpResult.originalBytes / 1024)} KB →{" "}
                                  <strong style={{ color: "#38bdf8" }}>{Math.round(webpResult.convertedBytes / 1024)} KB</strong>
                                  {webpResult.bytesSaved > 0 && ` (${Math.round(webpResult.bytesSaved / 1024)} KB saved)`}
                                </div>
                                {webpResult.width && webpResult.height && (
                                  <div>Dimensions: {webpResult.width} × {webpResult.height} px</div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onSelect(
                                    webpResult.convertedUrl,
                                    webpResult.asset?.altText !== undefined && webpResult.asset?.altText !== null
                                      ? webpResult.asset.altText
                                      : altTextInput
                                  );
                                  onClose();
                                }}
                                style={{
                                  padding: "6px 10px",
                                  backgroundColor: "#0284c7",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  marginTop: "2px",
                                }}
                              >
                                ✓ Use WebP Image
                              </button>
                              <span style={{ fontSize: "10px", color: "#71717a" }}>
                                Original asset remains safely untouched in your library.
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(
                          selectedAsset.url,
                          selectedAsset.altText !== undefined && selectedAsset.altText !== null
                            ? selectedAsset.altText
                            : altTextInput
                        );
                        onClose();
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Insert Selected Image
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(selectedAsset.id, false)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        backgroundColor: "transparent",
                        color: "#ef4444",
                        border: "1px solid #7f1d1d",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Delete Asset
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: "#a1a1aa", fontSize: "13px", textAlign: "center", marginTop: "40px" }}>
                  Select an asset to view details and insert.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibraryModal;
