import React, { useState } from "react";
import type { BlockNode } from "../types/block.types";
import { getAvailableTransforms, executeBlockTransform } from "../engine/blockTransforms";
import { getRegisteredBlockType } from "../registry/blockRegistry";

interface BlockToolbarProps {
  block: BlockNode;
  onUpdateBlock: (updated: BlockNode) => void;
  onDetachSyncedPattern?: (patternId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectParent?: () => void;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  block,
  onUpdateBlock,
  onDetachSyncedPattern,
  onDuplicate,
  onDelete,
  onSelectParent,
}) => {
  const [showTransformMenu, setShowTransformMenu] = useState(false);
  const [showVariationMenu, setShowVariationMenu] = useState(false);

  const transforms = getAvailableTransforms(block);
  const blockDef = getRegisteredBlockType(block.name);
  const variations = blockDef?.variations || [];

  const handleTransform = (targetType: string) => {
    const transformed = executeBlockTransform(block, targetType);
    onUpdateBlock(transformed);
    setShowTransformMenu(false);
  };

  const handleSelectVariation = (varName: string) => {
    const v = variations.find((item) => item.name === varName);
    if (v) {
      onUpdateBlock({
        ...block,
        variation: v.name,
        attributes: {
          ...block.attributes,
          ...(v.attributes || {}),
        },
      });
    }
    setShowVariationMenu(false);
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: "#1e1e2d",
        border: "1px solid #323248",
        borderRadius: "8px",
        padding: "4px 8px",
        gap: "6px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        color: "#ffffff",
        fontSize: "0.85rem",
        zIndex: 1000,
        position: "relative",
      }}
    >
      {/* Parent Nav */}
      {onSelectParent && (
        <button
          title="Select Parent Container"
          onClick={onSelectParent}
          style={{
            background: "transparent",
            border: "none",
            color: "#a1a5b7",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          ⬆️
        </button>
      )}

      {/* Block Switcher / Transform Dropdown */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => {
            setShowTransformMenu(!showTransformMenu);
            setShowVariationMenu(false);
          }}
          style={{
            background: "#151521",
            border: "1px solid #323248",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>{blockDef?.icon || "🧱"}</span>
          <span>{blockDef?.title || block.name}</span>
          <span style={{ fontSize: "0.7rem", color: "#a1a5b7" }}>▼</span>
        </button>

        {showTransformMenu && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              backgroundColor: "#1e1e2d",
              border: "1px solid #323248",
              borderRadius: "6px",
              padding: "6px 0",
              minWidth: "160px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              zIndex: 1001,
            }}
          >
            <div style={{ padding: "4px 12px", fontSize: "0.75rem", color: "#a1a5b7", fontWeight: 600 }}>
              TRANSFORM TO
            </div>
            {transforms.length === 0 ? (
              <div style={{ padding: "8px 12px", fontSize: "0.8rem", color: "#6c7293" }}>No transforms available</div>
            ) : (
              transforms.map((t) => (
                <div
                  key={t.targetType}
                  onClick={() => handleTransform(t.targetType)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2b2b40")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {t.title}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Variations Dropdown */}
      {variations.length > 0 && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              setShowVariationMenu(!showVariationMenu);
              setShowTransformMenu(false);
            }}
            style={{
              background: "#151521",
              border: "1px solid #323248",
              color: "#3699ff",
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Variation: {block.variation || "Default"}
          </button>

          {showVariationMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "4px",
                backgroundColor: "#1e1e2d",
                border: "1px solid #323248",
                borderRadius: "6px",
                padding: "6px 0",
                minWidth: "160px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                zIndex: 1001,
              }}
            >
              <div style={{ padding: "4px 12px", fontSize: "0.75rem", color: "#a1a5b7", fontWeight: 600 }}>
                SELECT VARIATION
              </div>
              {variations.map((v) => (
                <div
                  key={v.name}
                  onClick={() => handleSelectVariation(v.name)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2b2b40")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {v.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Synced Pattern Detach */}
      {block.metadata?.syncedPatternId && onDetachSyncedPattern && (
        <button
          title="Detach / Unlink Synced Pattern"
          onClick={() => onDetachSyncedPattern(block.metadata!.syncedPatternId)}
          style={{
            background: "#3699ff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "0.75rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Detach Synced
        </button>
      )}

      <div style={{ width: "1px", height: "18px", backgroundColor: "#323248" }} />

      {/* Duplicate */}
      <button
        title="Duplicate Block"
        onClick={onDuplicate}
        style={{
          background: "transparent",
          border: "none",
          color: "#a1a5b7",
          cursor: "pointer",
          padding: "4px 6px",
        }}
      >
        📋
      </button>

      {/* Delete */}
      <button
        title="Delete Block"
        onClick={onDelete}
        style={{
          background: "transparent",
          border: "none",
          color: "#f64e60",
          cursor: "pointer",
          padding: "4px 6px",
        }}
      >
        🗑️
      </button>
    </div>
  );
};
