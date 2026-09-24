import React, { useState, useEffect } from "react";
import { CORE_BLOCK_REGISTRY } from "../registry/blockRegistry";
import type { BlockNode, BlockPattern } from "../types/block.types";
import { fetchBlockPatterns } from "../services/blockPatternService";

interface BlockInserterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (block: BlockNode) => void;
  onSelectPattern: (pattern: BlockPattern) => void;
  workspaceId?: string;
}

export const BlockInserterModal: React.FC<BlockInserterModalProps> = ({
  isOpen,
  onClose,
  onSelectBlock,
  onSelectPattern,
  workspaceId,
}) => {
  const [activeTab, setActiveTab] = useState<"blocks" | "variations" | "patterns" | "synced">("blocks");
  const [search, setSearch] = useState("");
  const [patterns, setPatterns] = useState<BlockPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (isOpen && (activeTab === "patterns" || activeTab === "synced")) {
      loadPatterns();
    }
  }, [isOpen, activeTab, categoryFilter]);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const data = await fetchBlockPatterns({
        workspaceId,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        isSynced: activeTab === "synced",
        search: search.trim() || undefined,
      });
      setPatterns(data);
    } catch (e) {
      console.error("Failed to load block patterns", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const blockList = Object.values(CORE_BLOCK_REGISTRY).filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  );

  const variationsList: Array<{ blockName: string; variation: any }> = [];
  Object.values(CORE_BLOCK_REGISTRY).forEach((b) => {
    if (b.variations) {
      b.variations.forEach((v) => {
        if (
          v.title.toLowerCase().includes(search.toLowerCase()) ||
          (v.description && v.description.toLowerCase().includes(search.toLowerCase()))
        ) {
          variationsList.push({ blockName: b.name, variation: v });
        }
      });
    }
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          width: "800px",
          maxHeight: "85vh",
          backgroundColor: "#1e1e2d",
          borderRadius: "12px",
          border: "1px solid #323248",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #323248",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Block & Pattern Inserter</h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#a1a5b7" }}>
              Insert core Gutenberg blocks, variations, patterns, or synced components.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#a1a5b7",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs & Search */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #323248",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", background: "#151521", padding: "4px", borderRadius: "8px" }}>
            {[
              { id: "blocks", label: "Core Blocks" },
              { id: "variations", label: "Variations" },
              { id: "patterns", label: "Patterns" },
              { id: "synced", label: "Synced Patterns" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: activeTab === tab.id ? "#3699ff" : "transparent",
                  color: activeTab === tab.id ? "#ffffff" : "#a1a5b7",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search blocks & patterns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 14px",
              borderRadius: "6px",
              backgroundColor: "#151521",
              border: "1px solid #323248",
              color: "#fff",
              fontSize: "0.85rem",
            }}
          />
        </div>

        {/* Content Area */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {activeTab === "blocks" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat( auto-fill, minmax(220px, 1fr) )", gap: "16px" }}>
              {blockList.map((b) => (
                <div
                  key={b.name}
                  onClick={() => {
                    onSelectBlock({
                      id: `block-${Math.random().toString(36).substring(2, 9)}`,
                      name: b.name,
                      attributes: {},
                    });
                    onClose();
                  }}
                  style={{
                    backgroundColor: "#151521",
                    border: "1px solid #323248",
                    borderRadius: "8px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3699ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#323248")}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{b.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>{b.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#a1a5b7", lineHeight: "1.3" }}>{b.description}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "variations" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat( auto-fill, minmax(220px, 1fr) )", gap: "16px" }}>
              {variationsList.map(({ blockName, variation }) => (
                <div
                  key={`${blockName}-${variation.name}`}
                  onClick={() => {
                    onSelectBlock({
                      id: `block-${Math.random().toString(36).substring(2, 9)}`,
                      name: blockName,
                      variation: variation.name,
                      attributes: variation.attributes || {},
                    });
                    onClose();
                  }}
                  style={{
                    backgroundColor: "#151521",
                    border: "1px solid #323248",
                    borderRadius: "8px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3699ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#323248")}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{variation.icon || "✨"}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>{variation.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#a1a5b7", lineHeight: "1.3" }}>
                    {variation.description || `Variation of ${blockName}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(activeTab === "patterns" || activeTab === "synced") && (
            <div>
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#a1a5b7" }}>Loading patterns...</div>
              ) : patterns.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#a1a5b7" }}>
                  No {activeTab === "synced" ? "synced patterns" : "patterns"} found.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat( auto-fill, minmax(240px, 1fr) )", gap: "16px" }}>
                  {patterns.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectPattern(p);
                        onClose();
                      }}
                      style={{
                        backgroundColor: "#151521",
                        border: "1px solid #323248",
                        borderRadius: "8px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3699ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#323248")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "1.2rem" }}>{p.isSynced ? "🔄" : "🧱"}</span>
                        {p.isSynced && (
                          <span style={{ fontSize: "0.7rem", backgroundColor: "#3699ff", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                            Synced (v{p.version || 1})
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>{p.title}</div>
                      <div style={{ fontSize: "0.8rem", color: "#a1a5b7", lineHeight: "1.3" }}>
                        {p.description || "Reusable layout pattern"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
