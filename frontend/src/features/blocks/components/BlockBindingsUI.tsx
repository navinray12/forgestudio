import React, { useState } from "react";
import type { BlockBindingConfig, BlockNode } from "../types/block.types";

interface BlockBindingsUIProps {
  block: BlockNode;
  onUpdateBindings: (bindings: Record<string, BlockBindingConfig>) => void;
}

export const BlockBindingsUI: React.FC<BlockBindingsUIProps> = ({ block, onUpdateBindings }) => {
  const bindings = block.bindings || {};
  const [selectedAttr, setSelectedAttr] = useState<string>("content");
  const [provider, setProvider] = useState<string>("post");
  const [fieldKey, setFieldKey] = useState<string>("title");
  const [defaultValue, setDefaultValue] = useState<string>("");

  const handleAddOrUpdateBinding = () => {
    if (!selectedAttr) return;

    const newBindings = {
      ...bindings,
      [selectedAttr]: {
        provider,
        field: provider !== "custom_field" ? fieldKey : undefined,
        metaKey: provider === "custom_field" ? fieldKey : undefined,
        defaultValue: defaultValue || undefined,
      },
    };

    onUpdateBindings(newBindings);
  };

  const handleRemoveBinding = (attrKey: string) => {
    const next = { ...bindings };
    delete next[attrKey];
    onUpdateBindings(next);
  };

  const availableAttributes = Object.keys(block.attributes || {});
  if (!availableAttributes.includes("content")) availableAttributes.push("content");
  if (!availableAttributes.includes("url")) availableAttributes.push("url");

  return (
    <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#151521", borderRadius: "8px", border: "1px solid #323248" }}>
      <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "#3699ff", display: "flex", alignItems: "center", gap: "6px" }}>
        <span>🔗</span> Dynamic Data Bindings
      </h4>

      {/* Existing Bindings */}
      {Object.keys(bindings).length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          {Object.entries(bindings).map(([attr, cfg]) => (
            <div
              key={attr}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                backgroundColor: "#1e1e2d",
                borderRadius: "4px",
                marginBottom: "6px",
                fontSize: "0.8rem",
              }}
            >
              <div>
                <strong style={{ color: "#fff" }}>{attr}</strong> →{" "}
                <span style={{ color: "#a1a5b7" }}>
                  {cfg.provider}:{cfg.field || cfg.metaKey || cfg.key}
                </span>
              </div>
              <button
                onClick={() => handleRemoveBinding(attr)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f64e60",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Binding */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <label style={{ fontSize: "0.75rem", color: "#a1a5b7", display: "block", marginBottom: "4px" }}>Target Attribute</label>
          <select
            value={selectedAttr}
            onChange={(e) => setSelectedAttr(e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              backgroundColor: "#1e1e2d",
              border: "1px solid #323248",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "0.8rem",
            }}
          >
            {availableAttributes.map((attr) => (
              <option key={attr} value={attr}>
                {attr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", color: "#a1a5b7", display: "block", marginBottom: "4px" }}>Data Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              backgroundColor: "#1e1e2d",
              border: "1px solid #323248",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "0.8rem",
            }}
          >
            <option value="post">Post / Page Data</option>
            <option value="site">Site Information</option>
            <option value="user">Current User</option>
            <option value="media">Media Library</option>
            <option value="custom_field">Custom Field / ACF</option>
            <option value="static">Static Fallback</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", color: "#a1a5b7", display: "block", marginBottom: "4px" }}>
            {provider === "custom_field" ? "Meta Key / ACF Field" : "Field Name / Key"}
          </label>
          <input
            type="text"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
            placeholder={provider === "post" ? "e.g. title, excerpt, date" : "e.g. siteName, meta_key"}
            style={{
              width: "100%",
              padding: "6px",
              backgroundColor: "#1e1e2d",
              border: "1px solid #323248",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "0.8rem",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", color: "#a1a5b7", display: "block", marginBottom: "4px" }}>Fallback Value</label>
          <input
            type="text"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            placeholder="Default text if empty"
            style={{
              width: "100%",
              padding: "6px",
              backgroundColor: "#1e1e2d",
              border: "1px solid #323248",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "0.8rem",
            }}
          />
        </div>

        <button
          onClick={handleAddOrUpdateBinding}
          style={{
            marginTop: "4px",
            padding: "6px 12px",
            backgroundColor: "#3699ff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "0.8rem",
          }}
        >
          Set Data Binding
        </button>
      </div>
    </div>
  );
};
