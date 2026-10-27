import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { EditorElement, ElementStyles } from "../types";
import { IconRenderer } from "./icons";

interface NestedContentRendererProps {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}

export const NestedTabsWidgetRenderer = ({ el, mergedStyles }: NestedContentRendererProps) => {
  const [activeTab, setActiveTab] = useState(el.tabsActiveIndex || 0);
  const tabs = el.tabsItems || [
    { id: "tab1", title: "Tab 1", icon: "layers" },
    { id: "tab2", title: "Tab 2", icon: "sparkles" },
    { id: "tab3", title: "Tab 3", icon: "settings" },
  ];
  const isVertical = el.tabsOrientation === "vertical";

  return (
    <div className="w-full flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ marginTop: mergedStyles.marginTop, marginBottom: mergedStyles.marginBottom }}>
      <div className={isVertical ? "flex flex-col md:flex-row gap-4" : "flex flex-col gap-4"}>
        <div className={isVertical ? "flex flex-col gap-1.5 w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-3" : "flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3"}>
          {tabs.map((tab, index) => {
            const isActive = activeTab === index;
            return (
              <button key={tab.id || index} type="button" onClick={() => setActiveTab(index)} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${isActive ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"}`}>
                {tab.icon && <IconRenderer iconName={tab.icon} className="w-3.5 h-3.5" />}
                <span>{tab.title || `Tab ${index + 1}`}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 p-4 rounded-xl bg-slate-50 border border-slate-200/60 min-h-[120px]">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">{tabs[activeTab]?.title || `Tab ${activeTab + 1}`} Content</h4>
          <p className="text-xs text-slate-600 leading-relaxed">{tabs[activeTab]?.content || "Tab panel active content. Drop container elements or widgets inside this tab panel from the editor canvas."}</p>
        </div>
      </div>
    </div>
  );
};

export const NestedAccordionWidgetRenderer = ({ el, mergedStyles }: NestedContentRendererProps) => {
  const items = el.accordionItems || [
    { id: "acc1", title: "1. What features are included in ForgeStudio?", icon: "help-circle" },
    { id: "acc2", title: "2. How does document persistence work?", icon: "database" },
    { id: "acc3", title: "3. Can I export clean React or HTML code?", icon: "code" },
  ];
  const allowMultiple = el.accordionAllowMultiple || false;
  const [openIds, setOpenIds] = useState<string[]>(el.accordionActiveIds || [items[0]?.id || "acc1"]);

  const toggleAccordion = (itemId: string) => {
    if (allowMultiple) {
      setOpenIds((previous) => previous.includes(itemId) ? previous.filter((id) => id !== itemId) : [...previous, itemId]);
    } else {
      setOpenIds((previous) => previous.includes(itemId) ? [] : [itemId]);
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ marginTop: mergedStyles.marginTop, marginBottom: mergedStyles.marginBottom }}>
      {items.map((item, index) => {
        const itemId = item.id || String(index);
        const isOpen = openIds.includes(itemId);
        return (
          <div key={itemId} className="rounded-xl border border-slate-200 overflow-hidden transition-all bg-white">
            <button type="button" onClick={() => toggleAccordion(itemId)} className={`w-full flex items-center justify-between px-4 py-3 text-left transition cursor-pointer ${isOpen ? "bg-blue-50/80 text-blue-900 font-bold" : "bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold"}`}>
              <div className="flex items-center gap-2.5">
                {item.icon && <IconRenderer iconName={item.icon} className="w-4 h-4 text-blue-600" />}
                <span className="text-xs">{item.title || `Accordion Item ${index + 1}`}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
            </button>
            {isOpen && <div className="p-4 bg-white border-t border-slate-200/60 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-150">{item.content || "Accordion panel expandable body. Place text, buttons, forms, or child canvas elements inside this section."}</div>}
          </div>
        );
      })}
    </div>
  );
};
