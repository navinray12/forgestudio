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
  const [altTextInput, setAltTextInput] = useState("");
  const [savingAlt, setSavingAlt] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMediaAssets();
    }
  }, [isOpen, websiteId]);

  useEffect(() => {
    if (selectedAsset) {
      setAltTextInput(selectedAsset.altText || "");
    }
  }, [selectedAsset]);

  const fetchMediaAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (websiteId) params.append("websiteId", websiteId);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/media?${params.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        if (data.assets && data.assets.length > 0 && !selectedAsset) {
          setSelectedAsset(data.assets[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching media assets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch("/api/uploads/image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.asset) {
            setAssets((prev) => [data.asset, ...prev]);
            setSelectedAsset(data.asset);
          }
        }
      }
      setActiveTab("library");
      fetchMediaAssets();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAltText = async () => {
    if (!selectedAsset) return;
    setSavingAlt(true);
    try {
      const res = await fetch(`/api/media/${selectedAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText: altTextInput }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedAsset(data.asset);
        setAssets((prev) =>
          prev.map((a) => (a.id === data.asset.id ? data.asset : a))
        );
      }
    } catch (err) {
      console.error("Error updating alt text:", err);
    } finally {
      setSavingAlt(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this media asset?")) return;
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        if (selectedAsset?.id === id) {
          setSelectedAsset(null);
        }
      }
    } catch (err) {
      console.error("Error deleting asset:", err);
    }
  };

  if (!isOpen) return null;

  const filteredAssets = assets.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
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
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
              Media & Asset Library
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
            onClick={onClose}
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
              <button
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
            {/* Left/Middle: Search & Gallery Grid */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid #27272a",
                overflow: "hidden",
              }}
            >
              {/* Search Bar */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #27272a",
                  display: "flex",
                  gap: "12px",
                }}
              >
                <input
                  type="text"
                  placeholder="Search assets by filename or alt text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#27272a",
                    border: "1px solid #3f3f46",
                    color: "white",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  + Upload
                </button>
              </div>

              {/* Grid */}
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
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#a1a1aa" }}>
                    No media assets found. Upload images to get started.
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
                          src={asset.url}
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
                              backgroundColor: "rgba(0,0,0,0.7)",
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
                      src={selectedAsset.url}
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
                      Type: {selectedAsset.mimeType}
                    </div>
                  </div>

                  {/* Alt Text Input */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: 500 }}>
                      Alt Text (Accessibility)
                    </label>
                    <input
                      type="text"
                      placeholder="Describe this image..."
                      value={altTextInput}
                      onChange={(e) => setAltTextInput(e.target.value)}
                      onBlur={handleSaveAltText}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "6px",
                        color: "white",
                        fontSize: "12px",
                      }}
                    />
                    {savingAlt && (
                      <span style={{ fontSize: "11px", color: "#3b82f6" }}>Saving alt text...</span>
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

                  {/* Action Buttons */}
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button
                      onClick={() => {
                        onSelect(selectedAsset.url, selectedAsset.altText || altTextInput);
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
                      onClick={() => handleDeleteAsset(selectedAsset.id)}
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
