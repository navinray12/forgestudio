import React from "react";
import type { EditorElement } from "../types";

export const WpLegacyWidgetRenderer: React.FC<{ el: EditorElement }> = ({ el }) => {
  const widgetType = el.wpWidgetType || "calendar";
  const widgetTitle = el.wpWidgetTitle || "WordPress Widget";
  const showCount = el.wpWidgetShowCount !== false;
  const isDropdown = el.wpWidgetDropdown || false;

  const renderWidgetContent = () => {
    switch (widgetType) {
      case "calendar":
        return (
          <div className="w-full text-center text-xs font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2 font-semibold text-slate-700">
              <span>« Sep</span>
              <span>October 2026</span>
              <span>Nov »</span>
            </div>
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="text-[10px] text-slate-500 border-b border-slate-100">
                  <th className="p-1">M</th><th className="p-1">T</th><th className="p-1">W</th>
                  <th className="p-1">T</th><th className="p-1">F</th><th className="p-1">S</th><th className="p-1">S</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 text-xs">
                <tr><td className="p-1 text-slate-300">28</td><td className="p-1 text-slate-300">29</td><td className="p-1 text-slate-300">30</td><td className="p-1">1</td><td className="p-1">2</td><td className="p-1">3</td><td className="p-1">4</td></tr>
                <tr><td className="p-1">5</td><td className="p-1 font-bold text-blue-600 bg-blue-50 rounded">6</td><td className="p-1">7</td><td className="p-1">8</td><td className="p-1">9</td><td className="p-1">10</td><td className="p-1">11</td></tr>
                <tr><td className="p-1">12</td><td className="p-1">13</td><td className="p-1 font-bold text-blue-600 bg-blue-50 rounded">14</td><td className="p-1">15</td><td className="p-1">16</td><td className="p-1">17</td><td className="p-1">18</td></tr>
                <tr><td className="p-1">19</td><td className="p-1">20</td><td className="p-1">21</td><td className="p-1">22</td><td className="p-1 font-bold text-blue-600 bg-blue-50 rounded">23</td><td className="p-1">24</td><td className="p-1">25</td></tr>
                <tr><td className="p-1">26</td><td className="p-1">27</td><td className="p-1">28</td><td className="p-1 font-bold text-blue-600 bg-blue-50 rounded">29</td><td className="p-1">30</td><td className="p-1">31</td><td className="p-1 text-slate-300">1</td></tr>
              </tbody>
            </table>
          </div>
        );

      case "search":
        return (
          <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-1.5">
            <input
              type="search"
              placeholder="Search website..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-700"
            >
              Search
            </button>
          </form>
        );

      case "categories":
        if (isDropdown) {
          return (
            <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800">
              <option value="">Select Category</option>
              <option value="design">Design & UI {showCount ? "(12)" : ""}</option>
              <option value="dev">Engineering {showCount ? "(24)" : ""}</option>
              <option value="marketing">Growth & SEO {showCount ? "(8)" : ""}</option>
              <option value="news">Product Updates {showCount ? "(15)" : ""}</option>
            </select>
          );
        }
        return (
          <ul className="space-y-1.5 text-xs text-slate-700">
            <li className="flex items-center justify-between border-b border-slate-100 pb-1">
              <a href="#" className="hover:text-blue-600 hover:underline">Design & UI</a>
              {showCount && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">12</span>}
            </li>
            <li className="flex items-center justify-between border-b border-slate-100 pb-1">
              <a href="#" className="hover:text-blue-600 hover:underline">Engineering & Code</a>
              {showCount && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">24</span>}
            </li>
            <li className="flex items-center justify-between border-b border-slate-100 pb-1">
              <a href="#" className="hover:text-blue-600 hover:underline">Growth & SEO</a>
              {showCount && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">8</span>}
            </li>
            <li className="flex items-center justify-between pb-1">
              <a href="#" className="hover:text-blue-600 hover:underline">Product Updates</a>
              {showCount && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">15</span>}
            </li>
          </ul>
        );

      case "recent_posts":
        return (
          <ul className="space-y-2 text-xs">
            <li className="space-y-0.5">
              <a href="#" className="font-semibold text-slate-800 hover:text-blue-600 hover:underline block leading-snug">
                Building Modern Visual Builders with React
              </a>
              <span className="text-[10px] text-slate-400">October 24, 2026</span>
            </li>
            <li className="space-y-0.5 border-t border-slate-100 pt-1.5">
              <a href="#" className="font-semibold text-slate-800 hover:text-blue-600 hover:underline block leading-snug">
                Optimizing Masonry & Dynamic CSS Grid Layouts
              </a>
              <span className="text-[10px] text-slate-400">October 20, 2026</span>
            </li>
            <li className="space-y-0.5 border-t border-slate-100 pt-1.5">
              <a href="#" className="font-semibold text-slate-800 hover:text-blue-600 hover:underline block leading-snug">
                Automated Code Injection & Security Audit Rules
              </a>
              <span className="text-[10px] text-slate-400">October 15, 2026</span>
            </li>
          </ul>
        );

      case "tag_cloud":
        return (
          <div className="flex flex-wrap gap-1.5">
            {["React", "TypeScript", "Tailwind", "ForgeStudio", "UI/UX", "Vite", "SEO", "WordPress", "Widget"].map((tag, i) => (
              <span
                key={tag}
                className="rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-2 py-1 text-[11px] font-medium text-slate-700 cursor-pointer transition"
                style={{ fontSize: `${11 + (i % 4) * 1.5}px` }}
              >
                {tag}
              </span>
            ))}
          </div>
        );

      case "custom_html":
        return (
          <div
            className="prose prose-sm text-xs text-slate-700 max-w-none"
            dangerouslySetInnerHTML={{
              __html: el.wpWidgetContent || "<p>Custom HTML WordPress Widget Content</p>"
            }}
          />
        );

      default:
        return (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            WordPress Widget ({widgetType}) Active
          </div>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 w-full" id={`wp-widget-${el.id}`}>
      {widgetTitle && (
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
          <span>{widgetTitle}</span>
          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
            WP Widget
          </span>
        </h3>
      )}
      {renderWidgetContent()}
    </div>
  );
};
