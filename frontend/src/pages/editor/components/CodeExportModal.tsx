import React, { useState, useEffect } from "react";

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  websiteName?: string;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
  websiteId,
  websiteName = "ForgeStudio Site",
}) => {
  const [activeTab, setActiveTab] = useState<"html" | "css" | "js" | "optimized" | "semantic" | "react" | "tailwind" | "nextjs">("html");
  const [codeData, setCodeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !websiteId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/websites/${websiteId}/export/preview`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.code) {
          setCodeData(data.code);
        } else {
          setError(data.message || "Failed to generate code preview.");
        }
      })
      .catch((err) => {
        setError(err.message || "Network error loading code preview.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, websiteId]);

  if (!isOpen) return null;

  const getCurrentCode = (): string => {
    if (!codeData) return "";
    switch (activeTab) {
      case "html":
        return codeData.html || "";
      case "css":
        return codeData.css || "";
      case "js":
        return codeData.js || "";
      case "optimized":
        return codeData.optimizedDomHtml || "";
      case "semantic":
        return codeData.semanticHtml || "";
      case "react":
        return codeData.reactCode?.appTsx || "";
      case "tailwind":
        return codeData.tailwindCode?.html || "";
      case "nextjs":
        return codeData.nextJsCode?.pageTsx || "";
      default:
        return "";
    }
  };

  const handleCopyCode = async () => {
    const code = getCurrentCode();
    if (!code) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Failed to copy code to clipboard");
    }
  };

  const handleDownloadZip = (type: "static" | "react" | "tailwind" | "nextjs") => {
    const link = document.createElement("a");
    link.href = `/api/websites/${websiteId}/export/zip?type=${type}`;
    link.setAttribute("download", `${websiteName.toLowerCase().replace(/[^a-z0-9]/g, "_")}-${type}-export.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadHelloTheme = () => {
    const link = document.createElement("a");
    link.href = `/api/plugins/wordpress/hello-theme/download`;
    link.setAttribute("download", "hello-forgestudio-theme.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        backgroundColor: "#111827",
        color: "#f3f4f6",
        borderRadius: "12px",
        width: "90%",
        maxWidth: "1000px",
        height: "85vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        border: "1px solid #374151",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid #374151",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>
              Code Preview & Export Engine — {websiteName}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#9ca3af" }}>
              F-745 → F-755: Production Code Exporters & X-786 WordPress Hello Theme Companion
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              fontSize: "24px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 24px",
          backgroundColor: "#1f2937",
          borderBottom: "1px solid #374151",
          overflowX: "auto",
        }}>
          {[
            { id: "html", label: "HTML5" },
            { id: "css", label: "CSS3" },
            { id: "js", label: "JavaScript" },
            { id: "optimized", label: "Optimized DOM" },
            { id: "semantic", label: "Semantic HTML" },
            { id: "react", label: "React TSX" },
            { id: "tailwind", label: "Tailwind CSS" },
            { id: "nextjs", label: "Next.js App Router" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === tab.id ? "#3b82f6" : "#374151",
                color: activeTab === tab.id ? "#ffffff" : "#d1d5db",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Content Viewport */}
        <div style={{ flex: 1, padding: "16px 24px", overflowY: "auto", fontFamily: "monospace", fontSize: "13px" }}>
          {loading && <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Generating production code...</div>}
          {error && <div style={{ color: "#ef4444", padding: "20px" }}>Error: {error}</div>}
          {!loading && !error && (
            <pre style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#e5e7eb",
              backgroundColor: "#030712",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #1f2937",
              minHeight: "100%",
            }}>
              <code>{getCurrentCode()}</code>
            </pre>
          )}
        </div>

        {/* Action Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #374151",
          backgroundColor: "#1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          {/* Left Actions: Copy & Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleCopyCode}
              disabled={loading || !codeData}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: copied ? "#10b981" : "#3b82f6",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              {copied ? "✓ Copied to Clipboard!" : "Copy Selected Code"}
            </button>
            {codeData?.stats && (
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                Nodes: {codeData.stats.totalNodes} | Size: ~{codeData.stats.estimatedSizeKb} KB
              </span>
            )}
          </div>

          {/* Right Actions: Downloads */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => handleDownloadZip("static")}
              style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, backgroundColor: "#374151", color: "#ffffff", border: "1px solid #4b5563", cursor: "pointer" }}
            >
              Download HTML/CSS ZIP
            </button>
            <button
              onClick={() => handleDownloadZip("react")}
              style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, backgroundColor: "#374151", color: "#61dafb", border: "1px solid #4b5563", cursor: "pointer" }}
            >
              Download React ZIP
            </button>
            <button
              onClick={() => handleDownloadZip("tailwind")}
              style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, backgroundColor: "#374151", color: "#38bdf8", border: "1px solid #4b5563", cursor: "pointer" }}
            >
              Download Tailwind ZIP
            </button>
            <button
              onClick={() => handleDownloadZip("nextjs")}
              style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, backgroundColor: "#374151", color: "#ffffff", border: "1px solid #4b5563", cursor: "pointer" }}
            >
              Download Next.js ZIP
            </button>
            <button
              onClick={handleDownloadHelloTheme}
              style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, backgroundColor: "#059669", color: "#ffffff", border: "none", cursor: "pointer" }}
            >
              Download Hello Theme (WP)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
