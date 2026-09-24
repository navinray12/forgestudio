import React from "react";
import type { BlockNode } from "../types/block.types";
import { DocumentOutlineService } from "../services/documentOutlineService";
import { List, FileText, AlertTriangle, Hash, Image as ImageIcon, Type, X, ChevronRight } from "lucide-react";

interface DocumentOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: BlockNode[];
  onSelectBlock: (blockId: string) => void;
}

export const DocumentOutlineModal: React.FC<DocumentOutlineModalProps> = ({
  isOpen,
  onClose,
  blocks,
  onSelectBlock,
}) => {
  if (!isOpen) return null;

  const outlineItems = DocumentOutlineService.generateDocumentOutline(blocks);
  const stats = DocumentOutlineService.calculateDocumentStats(blocks);
  const issues = DocumentOutlineService.validateHeadingHierarchy(blocks);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100">Document Outline & Hierarchy Inspector</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document Quick Stats Bar */}
        <div className="grid grid-cols-6 gap-2 p-4 bg-slate-950/30 border-b border-slate-800/80 text-center text-xs font-mono">
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Words</div>
            <div className="text-indigo-400 font-bold text-sm mt-0.5">{stats.words}</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Chars</div>
            <div className="text-emerald-400 font-bold text-sm mt-0.5">{stats.characters}</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Blocks</div>
            <div className="text-purple-400 font-bold text-sm mt-0.5">{stats.blocks}</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Headings</div>
            <div className="text-amber-400 font-bold text-sm mt-0.5">{stats.headings}</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Paragraphs</div>
            <div className="text-sky-400 font-bold text-sm mt-0.5">{stats.paragraphs}</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Images</div>
            <div className="text-rose-400 font-bold text-sm mt-0.5">{stats.images}</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Validation & Accessibility Issues Section */}
          {issues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                Structure & Accessibility Warnings ({issues.length})
              </div>
              <div className="space-y-1.5">
                {issues.map((issue, idx) => (
                  <div
                    key={`issue-${idx}`}
                    className={`flex items-start justify-between p-2.5 rounded-lg border text-xs ${
                      issue.severity === "error"
                        ? "bg-rose-950/30 border-rose-800/60 text-rose-300"
                        : "bg-amber-950/30 border-amber-800/60 text-amber-300"
                    }`}
                  >
                    <span>{issue.message}</span>
                    {issue.blockId && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectBlock(issue.blockId!);
                          onClose();
                        }}
                        className="ml-2 px-2 py-0.5 text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-200 rounded font-mono border border-slate-700 transition-colors"
                      >
                        Jump to block
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heading Outline Tree */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Heading Hierarchy & Navigation Tree
            </div>

            {outlineItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No headings or structured sections found in this document. Add a Core Heading block to build your outline.
              </div>
            ) : (
              <div className="space-y-1">
                {outlineItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectBlock(item.blockId);
                      onClose();
                    }}
                    style={{ paddingLeft: `${item.depth * 16 + 12}px` }}
                    className="w-full flex items-center justify-between py-2 pr-3 rounded-lg text-left text-xs bg-slate-950/40 hover:bg-indigo-950/40 border border-slate-800/60 hover:border-indigo-700/50 transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {item.headingLevel ? (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-mono text-[10px] font-bold">
                          H{item.headingLevel}
                        </span>
                      ) : (
                        <Type className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span className="text-slate-200 group-hover:text-white truncate font-medium">
                        {item.text || "Untitled Block"}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close Outline
          </button>
        </div>
      </div>
    </div>
  );
};
