import React, { useState } from "react";
import type { BlockNode } from "../types/block.types";
import { getRegisteredBlockType } from "../registry/blockRegistry";
import { BlockBindingsUI } from "./BlockBindingsUI";
import { BlockStyleControlsUI } from "./BlockStyleControlsUI";
import { AdvancedBlockControlsUI } from "./AdvancedBlockControlsUI";

interface BlockInspectorProps {
  block: BlockNode | null;
  allBlocks?: BlockNode[];
  onUpdateBlock: (updated: BlockNode) => void;
}

export const BlockInspector: React.FC<BlockInspectorProps> = ({ block, allBlocks = [], onUpdateBlock }) => {
  const [activeTab, setActiveTab] = useState<"settings" | "styles" | "bindings" | "advanced">("settings");

  if (!block) {
    return (
      <div style={{ padding: "20px", color: "#a1a5b7", textAlign: "center", fontSize: "0.85rem" }}>
        Select a block to inspect its settings, attributes, dynamic data bindings, and responsive styles.
      </div>
    );
  }

  const blockDef = getRegisteredBlockType(block.name);
  const attributes = block.attributes || {};

  const handleAttrChange = (key: string, value: any) => {
    onUpdateBlock({
      ...block,
      attributes: {
        ...attributes,
        [key]: value,
      },
    });
  };

  return (
    <div
      style={{
        backgroundColor: "#1e1e2d",
        color: "#ffffff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #323248",
      }}
    >
      {/* Block Inspector Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #323248",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "1.3rem" }}>{blockDef?.icon || "🧱"}</span>
        <div>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{blockDef?.title || block.name}</h4>
          <span style={{ fontSize: "0.75rem", color: "#a1a5b7" }}>{block.name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #323248",
          backgroundColor: "#151521",
        }}
      >
        {[
          { id: "settings", label: "Settings" },
          { id: "styles", label: "Styles" },
          { id: "bindings", label: "Bindings" },
          { id: "advanced", label: "Advanced" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              backgroundColor: activeTab === tab.id ? "#1e1e2d" : "transparent",
              color: activeTab === tab.id ? "#3699ff" : "#a1a5b7",
              borderBottom: activeTab === tab.id ? "2px solid #3699ff" : "none",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inspector Body */}
      <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
        {activeTab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {blockDef?.attributes ? (
              Object.entries(blockDef.attributes).map(([key, schema]) => (
                <div key={key}>
                  <label style={{ fontSize: "0.75rem", color: "#a1a5b7", display: "block", marginBottom: "4px", textTransform: "capitalize" }}>
                    {key}
                  </label>

                  {schema.enum ? (
                    <select
                      value={attributes[key] ?? schema.default ?? ""}
                      onChange={(e) => handleAttrChange(key, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        backgroundColor: "#151521",
                        border: "1px solid #323248",
                        color: "#fff",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                      }}
                    >
                      {schema.enum.map((opt: any) => (
                        <option key={String(opt)} value={opt}>
                          {String(opt)}
                        </option>
                      ))}
                    </select>
                  ) : schema.type === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={!!attributes[key]}
                      onChange={(e) => handleAttrChange(key, e.target.checked)}
                    />
                  ) : (
                    <input
                      type={schema.type === "number" ? "number" : "text"}
                      value={attributes[key] ?? ""}
                      onChange={(e) => handleAttrChange(key, schema.type === "number" ? Number(e.target.value) : e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        backgroundColor: "#151521",
                        border: "1px solid #323248",
                        color: "#fff",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                      }}
                    />
                  )}
                </div>
              ))
            ) : (
              <div style={{ fontSize: "0.8rem", color: "#a1a5b7" }}>No attribute schema registered for this block.</div>
            )}
          </div>
        )}

        {activeTab === "bindings" && (
          <BlockBindingsUI
            block={block}
            onUpdateBindings={(bindings) =>
              onUpdateBlock({
                ...block,
                bindings,
              })
            }
          />
        )}

        {activeTab === "advanced" && (
          <AdvancedBlockControlsUI
            block={block}
            allBlocks={allBlocks}
            onUpdateBlock={onUpdateBlock}
          />
        )}
      </div>
    </div>
  );
};
