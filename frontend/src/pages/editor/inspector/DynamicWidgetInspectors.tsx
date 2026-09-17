import { isSafeShareUrl, getCurrentResolvedPageUrl, resolveButtonHref, getLinkedPageStatus } from "../widgets/renderers";
import { IconRenderer } from "../widgets/icons";
import React from "react";
import type {
  EditorElement,
  GalleryImageItem,
  SlideItem,
  PlaylistItem,
  ShareNetworkItem,
  ShareNetworkType,
  ShareActionType,
  ReviewItem,
  TestimonialItem,
  FormFieldItem,
  FormFieldType,
  NavMenuItem,
  NavSubmenuItem,
  MegaMenuItem,
  MediaCarouselItem,
  LoopCarouselItem,
  PortfolioItem,
  PriceListItem,
  PricingPlan,
  PricePlanFeature,
  PageConfig,
  SiteProduct
} from "../types";

// Programmatically opens the OS File Picker dialog (100% reliable click trigger)
export const triggerImagePicker = (callback: (url: string) => void) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,video/*,application/json,.json";
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // 1. Attempt server upload first for backend persistence
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        const serverUrl = data.url || data?.data?.url;
        if (serverUrl) {
          callback(serverUrl);
          return;
        }
      }
    } catch {
      // Backend upload endpoint unavailable or offline mode
    }

    // 2. Fallback to instant local Data URL
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        callback(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

// File upload helper converts file to Data URL
export const handleImageFileUpload = (
  e: React.ChangeEvent<HTMLInputElement>,
  callback: (url: string) => void
) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    if (ev.target?.result) {
      callback(ev.target.result as string);
    }
  };
  reader.readAsDataURL(file);
};

export const PRESET_SAMPLE_IMAGES = [
  { label: "Modern Office", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&auto=format&fit=crop&q=80" },
  { label: "Creative UX", url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80" },
  { label: "Minimalist", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80" },
  { label: "Tech Work", url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1000&auto=format&fit=crop&q=80" },
  { label: "Nature View", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80" },
  { label: "Coffee Shop", url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1000&auto=format&fit=crop&q=80" }
];

export function ImagePickerControl({
  value,
  onChange,
  label = "Image Source URL"
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [showPresets, setShowPresets] = React.useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        >
          {showPresets ? "Hide Presets" : "🖼️ Sample Gallery"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://images.unsplash.com/... or click select image"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 shadow-xs"
        />
        <button
          type="button"
          onClick={() => triggerImagePicker(onChange)}
          className="shrink-0 flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
        >
          <span>📁 Select Image</span>
        </button>
      </div>

      {showPresets && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1.5 mt-2 animate-in fade-in zoom-in-95">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Click Sample Image to Apply</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_SAMPLE_IMAGES.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChange(img.url);
                  setShowPresets(false);
                }}
                className="group relative rounded-lg overflow-hidden border border-slate-200 aspect-video hover:border-blue-500 transition cursor-pointer"
              >
                <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <span className="text-[9px] font-bold text-white px-1 text-center truncate">{img.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Universal Item Manager Wrapper Component
export function UniversalItemManager<T extends { id: string }>(props: {
  title: string;
  items: T[] | undefined;
  onUpdate: (newItems: T[]) => void;
  createDefaultItem: () => T;
  getItemHeaderLabel: (item: T, idx: number) => string;
  renderItemFields: (
    item: T,
    idx: number,
    updateItem: (updated: Partial<T>) => void
  ) => React.ReactNode;
}) {
  const { title, items, onUpdate, createDefaultItem, getItemHeaderLabel, renderItemFields } = props;
  const currentItems = items || [];

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span>⚙️</span> {title} ({currentItems.length})
        </h4>
        <button
          type="button"
          onClick={() => {
            const newItem = createDefaultItem();
            onUpdate([...currentItems, newItem]);
          }}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
        >
          <span>+ Add Item</span>
        </button>
      </div>

      {currentItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
          <p className="text-xs text-slate-500 font-medium">No items added yet</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Click "+ Add Item" to configure custom items.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {currentItems.map((item, idx) => {
            const updateItem = (updatedProps: Partial<T>) => {
              const updated = currentItems.map((it) => (it.id === item.id ? { ...it, ...updatedProps } : it));
              onUpdate(updated);
            };

            const handleMoveUp = () => {
              if (idx === 0) return;
              const copy = [...currentItems];
              const temp = copy[idx - 1];
              copy[idx - 1] = copy[idx];
              copy[idx] = temp;
              onUpdate(copy);
            };

            const handleMoveDown = () => {
              if (idx === currentItems.length - 1) return;
              const copy = [...currentItems];
              const temp = copy[idx + 1];
              copy[idx + 1] = copy[idx];
              copy[idx] = temp;
              onUpdate(copy);
            };

            const handleDuplicate = () => {
              const newId = "item_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
              const clone = { ...item, id: newId };
              const copy = [...currentItems];
              copy.splice(idx + 1, 0, clone);
              onUpdate(copy);
            };

            const handleDelete = () => {
              const updated = currentItems.filter((it) => it.id !== item.id);
              onUpdate(updated);
            };

            return (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2.5 transition hover:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 truncate max-w-[150px]">
                    #{idx + 1} {getItemHeaderLabel(item, idx)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleMoveUp}
                      disabled={idx === 0}
                      title="Move Up"
                      className="p-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={handleMoveDown}
                      disabled={idx === currentItems.length - 1}
                      title="Move Down"
                      className="p-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      title="Duplicate Item"
                      className="p-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      title="Delete Item (Safe)"
                      className="p-1 text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {renderItemFields(item, idx, updateItem)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 1. Single Image Inspector
export function ImageWidgetInspector({
  el,
  updateProp,
  updateStyle
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
  updateStyle: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
        <span>🖼️</span> Image Settings
      </h3>

      {/* Image Source & Upload */}
      <ImagePickerControl
        label="Image Source URL"
        value={el.src || ""}
        onChange={(url) => updateProp("src", url)}
      />

      {el.src && (
        <button
          type="button"
          onClick={() => updateProp("src", "")}
          className="w-full text-center rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 py-1.5 text-xs font-semibold text-red-600 transition cursor-pointer"
        >
          🗑️ Remove Image
        </button>
      )}

      {/* Alt Text & Title */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Alt Text</label>
          <input
            type="text"
            value={el.alt || ""}
            onChange={(e) => updateProp("alt", e.target.value)}
            placeholder="Description..."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Object Fit</label>
          <select
            value={el.styles?.objectFit || "cover"}
            onChange={(e) => updateStyle("objectFit", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="cover">Cover (Fill)</option>
            <option value="contain">Contain (Fit)</option>
            <option value="fill">Fill (Stretch)</option>
            <option value="auto">Auto (Natural)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// 2. Background Image Inspector
export function BackgroundImageInspector({
  el,
  updateStyle
}: {
  el: EditorElement;
  updateStyle: (key: string, val: any) => void;
}) {
  const bgImg = el.styles?.backgroundImage || "";
  const cleanUrl = bgImg.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, "");

  return (
    <div className="space-y-3 pt-2">
      <ImagePickerControl
        label="Background Image Source"
        value={cleanUrl}
        onChange={(url) => updateStyle("backgroundImage", url ? `url("${url}")` : "")}
      />

      {cleanUrl && (
        <button
          type="button"
          onClick={() => updateStyle("backgroundImage", "")}
          className="w-full text-center rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 py-1.5 text-xs font-semibold text-red-600 transition cursor-pointer"
        >
          🗑️ Remove Background Image
        </button>
      )}

      {cleanUrl && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Size</label>
            <select
              value={el.styles?.backgroundSize || "cover"}
              onChange={(e) => updateStyle("backgroundSize", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Position</label>
            <select
              value={el.styles?.backgroundPosition || "center"}
              onChange={(e) => updateStyle("backgroundPosition", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
            >
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Repeat</label>
            <select
              value={el.styles?.backgroundRepeat || "no-repeat"}
              onChange={(e) => updateStyle("backgroundRepeat", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
            >
              <option value="no-repeat">No Repeat</option>
              <option value="repeat">Repeat</option>
              <option value="repeat-x">Repeat X</option>
              <option value="repeat-y">Repeat Y</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Single Video Inspector
export function VideoWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
        <span>🎬</span> Video Settings
      </h3>

      {/* Video Source URL */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Video URL (YouTube, Vimeo, MP4)
        </label>
        <input
          type="text"
          value={el.src || ""}
          onChange={(e) => updateProp("src", e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or https://.../video.mp4"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
        />
      </div>

      {/* Poster Image */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Poster Image URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={el.videoPoster || ""}
            onChange={(e) => updateProp("videoPoster", e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          />
          <label className="shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1.5 text-xs font-bold cursor-pointer transition">
            Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageFileUpload(e, (url) => updateProp("videoPoster", url))}
            />
          </label>
        </div>
      </div>

      {/* Video Options Toggles */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.videoAutoplay || false}
            onChange={(e) => updateProp("videoAutoplay", e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          <span>Autoplay</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.videoLoop || false}
            onChange={(e) => updateProp("videoLoop", e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          <span>Loop</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.videoMuted !== false}
            onChange={(e) => updateProp("videoMuted", e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          <span>Muted</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.videoControls !== false}
            onChange={(e) => updateProp("videoControls", e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          <span>Controls</span>
        </label>
      </div>
    </div>
  );
}

// 4. Gallery Widget Inspector (F-184)
export function GalleryWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const images = el.galleryImages || el.basicGalleryImages || [];

  return (
    <div className="space-y-4">
      {/* Grid Layout & Aspect Ratio */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Grid & Image Layout
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Grid Columns
            </label>
            <select
              value={el.galleryColumns || el.basicGalleryColumns || 3}
              onChange={(e) => {
                const val = Number(e.target.value);
                updateProp("galleryColumns", val);
                updateProp("basicGalleryColumns", val);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
            >
              <option value={1}>1 Column</option>
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
              <option value={5}>5 Columns</option>
              <option value={6}>6 Columns</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Image Gap (px)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={el.galleryGap ?? el.basicGalleryGap ?? 16}
              onChange={(e) => {
                const val = Number(e.target.value);
                updateProp("galleryGap", val);
                updateProp("basicGalleryGap", val);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Aspect Ratio
            </label>
            <select
              value={el.galleryAspectRatio || "square"}
              onChange={(e) => updateProp("galleryAspectRatio", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
            >
              <option value="square">Square (1:1)</option>
              <option value="landscape">Landscape (16:9)</option>
              <option value="portrait">Portrait (3:4)</option>
              <option value="auto">Original / Auto</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Hover Interaction
            </label>
            <select
              value={el.galleryHoverEffect || "zoom"}
              onChange={(e) => updateProp("galleryHoverEffect", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
            >
              <option value="zoom">Zoom Scale</option>
              <option value="lift">Lift & Elevation</option>
              <option value="fade">Subtle Fade</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Corner Radius
            </label>
            <select
              value={el.galleryBorderRadius || "16px"}
              onChange={(e) => updateProp("galleryBorderRadius", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
            >
              <option value="0px">Square (0px)</option>
              <option value="8px">Rounded Small (8px)</option>
              <option value="16px">Rounded Large (16px)</option>
              <option value="24px">Extra Rounded (24px)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Caption Style
            </label>
            <select
              value={el.galleryCaptionPosition || "overlay"}
              onChange={(e) => updateProp("galleryCaptionPosition", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-pink-500"
            >
              <option value="overlay">Overlay on Image</option>
              <option value="below">Below Image</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
          <label className="text-[11px] font-semibold text-slate-700 cursor-pointer">
            Show Image Captions
          </label>
          <input
            type="checkbox"
            checked={el.galleryShowCaptions !== false}
            onChange={(e) => updateProp("galleryShowCaptions", e.target.checked)}
            className="accent-pink-600 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Gallery Images Manager */}
      <UniversalItemManager<GalleryImageItem>
        title={`Gallery Photos (${images.length})`}
        items={images}
        onUpdate={(newItems) => {
          updateProp("galleryImages", newItems);
          updateProp("basicGalleryImages", newItems);
        }}
        createDefaultItem={() => ({
          id: "gimg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80",
          caption: `Photo ${images.length + 1}`,
          altText: "Gallery Photo",
        })}
        getItemHeaderLabel={(item, idx) => item.caption || `Photo #${idx + 1}`}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2">
            <ImagePickerControl
              label="Photo File / Source URL"
              value={item.url}
              onChange={(url) => updateItem({ url })}
            />
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Caption Text</label>
              <input
                type="text"
                value={item.caption || ""}
                onChange={(e) => updateItem({ caption: e.target.value })}
                placeholder="Optional image caption..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alt Text</label>
              <input
                type="text"
                value={item.altText || ""}
                onChange={(e) => updateItem({ altText: e.target.value })}
                placeholder="SEO image alt description..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}

// 5. Slides Widget Inspector
export function SlidesWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const slides = el.slidesItems || [];

  return (
    <div className="space-y-3">
      {/* Slider Settings */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Height</label>
          <input
            type="text"
            value={el.slidesHeight || "450px"}
            onChange={(e) => updateProp("slidesHeight", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Transition</label>
          <select
            value={el.slidesTransition || "slide"}
            onChange={(e) => updateProp("slidesTransition", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="slide">Slide</option>
            <option value="fade">Fade</option>
          </select>
        </div>
      </div>

      <UniversalItemManager<SlideItem>
        title="Slides Manager"
        items={slides}
        onUpdate={(newItems) => updateProp("slidesItems", newItems)}
        createDefaultItem={() => ({
          id: "slide_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          title: "New Slide Heading",
          description: "Enter your compelling slide subtitle or feature description here.",
          bgImage: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80",
          bgColor: "#0f172a",
          buttonText: "Explore Now",
          buttonUrl: "#"
        })}
        getItemHeaderLabel={(item, idx) => item.title || `Slide #${idx + 1}`}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Title</label>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem({ title: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Description</label>
              <textarea
                rows={2}
                value={item.description || ""}
                onChange={(e) => updateItem({ description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Background Image</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={item.bgImage || ""}
                  onChange={(e) => updateItem({ bgImage: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => triggerImagePicker((url) => updateItem({ bgImage: url }))}
                  className="shrink-0 flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[10px] font-bold cursor-pointer transition active:scale-95"
                >
                  <span>📁 Select Image</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Button Text</label>
                <input
                  type="text"
                  value={item.buttonText || ""}
                  onChange={(e) => updateItem({ buttonText: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Button URL</label>
                <input
                  type="text"
                  value={item.buttonUrl || ""}
                  onChange={(e) => updateItem({ buttonUrl: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

// 6. Share Buttons Inspector
export function ShareButtonsInspector({
  el,
  updateProp,
  pages,
  activePageId,
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
  pages?: PageConfig[];
  activePageId?: string;
}) {
  const networks = el.shareNetworks || [];
  const shareUrlSource = el.shareUrlSource || "current-page";
  const shareUrl = el.shareUrl || "";
  const shareText = el.shareText || "";
  const shareHashtags = el.shareHashtags || "";

  const resolvedPageUrl = getCurrentResolvedPageUrl(pages, activePageId);
  const activePageObj = pages?.find((p) => p.id === activePageId || p.slug === activePageId);
  const activePageName = activePageObj?.name || "Current Page";

  // URL Safety & Validation
  const isValidUrl = isSafeShareUrl(shareUrl);
  const isHttpOrRelative = !shareUrl || shareUrl.startsWith("http://") || shareUrl.startsWith("https://") || shareUrl.startsWith("/") || shareUrl.startsWith("#");

  const handleUseCurrentPage = () => {
    updateProp("shareUrlSource", "current-page");
    updateProp("shareUrl", resolvedPageUrl);
  };

  return (
    <div className="space-y-4">
      {/* 1. DESTINATION URL & METADATA CONFIGURATION */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider">
            🔗 SHARE DESTINATION & URL
          </span>
          {shareUrlSource === "current-page" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              ⚡ Current Page
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
              🎯 Custom URL
            </span>
          )}
        </div>

        {/* URL Source Radio / Toggle */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
            URL Source Mode
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => updateProp("shareUrlSource", "current-page")}
              className={`py-1.5 px-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1 cursor-pointer ${
                shareUrlSource === "current-page"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>📄 Current Page</span>
            </button>
            <button
              type="button"
              onClick={() => updateProp("shareUrlSource", "custom")}
              className={`py-1.5 px-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1 cursor-pointer ${
                shareUrlSource === "custom"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>🌐 Custom URL</span>
            </button>
          </div>
        </div>

        {/* Current Page Mode Preview info */}
        {shareUrlSource === "current-page" && (
          <div className="rounded-lg bg-white border border-blue-100 p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span>Active Page: <strong className="text-blue-600">{activePageName}</strong></span>
              <span className="text-[10px] font-mono text-slate-400">ID: {activePageId || "home"}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 truncate bg-slate-50 p-1.5 rounded border border-slate-200/60">
              {resolvedPageUrl}
            </div>
            <p className="text-[10px] text-slate-400">
              Shares automatically update to match whatever page the user is viewing.
            </p>
          </div>
        )}

        {/* Custom URL Input Field */}
        {shareUrlSource === "custom" && (
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[10px] font-semibold text-slate-600">
                  Destination URL
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentPage}
                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  [ Use Current Page ]
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={shareUrl}
                  onChange={(e) => updateProp("shareUrl", e.target.value)}
                  placeholder="https://example.com/about or /pricing"
                  className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none transition ${
                    !isValidUrl
                      ? "border-red-400 focus:border-red-500 bg-red-50/30"
                      : "border-slate-300 focus:border-blue-500"
                  }`}
                />
                {shareUrl && (
                  <button
                    type="button"
                    onClick={() => updateProp("shareUrl", "")}
                    className="absolute right-2 text-xs text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear URL"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* URL Validation helper badges */}
            {!isValidUrl ? (
              <div className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-md p-1.5 flex items-center gap-1">
                <span>⚠️ Unsafe URL protocol (javascript:, data: are blocked).</span>
              </div>
            ) : !isHttpOrRelative && shareUrl.trim() !== "" ? (
              <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-1 flex items-center gap-1">
                <span>ℹ️ Note: Consider adding http:// or https:// for external links.</span>
              </div>
            ) : shareUrl.trim() !== "" ? (
              <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 flex items-center justify-between">
                <span>✓ Valid Destination URL</span>
                <span className="font-mono text-[9px] truncate max-w-[150px]">{shareUrl}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Share Text & Hashtags Fields */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100">
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
              Share Text / Caption
            </label>
            <input
              type="text"
              value={shareText}
              onChange={(e) => updateProp("shareText", e.target.value)}
              placeholder="Check out this page!"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
              Hashtags (Comma separated)
            </label>
            <input
              type="text"
              value={shareHashtags}
              onChange={(e) => updateProp("shareHashtags", e.target.value)}
              placeholder="ForgeStudio, WebsiteBuilder"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 2. LAYOUT & APPEARANCE */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Layout & Appearance
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Layout</label>
            <select
              value={el.shareLayout || "horizontal"}
              onChange={(e) => updateProp("shareLayout", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="horizontal">Horizontal Row</option>
              <option value="vertical">Vertical Column</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Button Style</label>
            <select
              value={el.shareButtonStyle || "brand"}
              onChange={(e) => updateProp("shareButtonStyle", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="brand">Brand Colors</option>
              <option value="solid">Solid Palette</option>
              <option value="outline">Outline Border</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alignment</label>
            <select
              value={el.shareAlignment || "left"}
              onChange={(e) => updateProp("shareAlignment", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Size</label>
            <select
              value={el.shareButtonSize || "md"}
              onChange={(e) => updateProp("shareButtonSize", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Gap (px)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={el.shareGap ?? 10}
              onChange={(e) => updateProp("shareGap", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
          <label className="text-[11px] font-semibold text-slate-700 cursor-pointer">
            Show Button Text Labels
          </label>
          <input
            type="checkbox"
            checked={el.shareShowLabels !== false}
            onChange={(e) => updateProp("shareShowLabels", e.target.checked)}
            className="accent-blue-600 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* 3. INDIVIDUAL SOCIAL NETWORKS MANAGER */}
      <UniversalItemManager<ShareNetworkItem>
        title={`Social Networks (${networks.length})`}
        items={networks}
        onUpdate={(newItems) => updateProp("shareNetworks", newItems)}
        createDefaultItem={() => ({
          id: "net_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          network: "facebook",
          actionType: "open-url",
          destinationType: "url",
          customUrl: "https://facebook.com",
          target: "_blank",
          label: "Facebook",
          urlSource: "custom"
        })}
        getItemHeaderLabel={(item) => (item.label ? `${item.network} (${item.label})` : item.network)}
        renderItemFields={(item, idx, updateItem) => {
          const isUrlDest = (item.destinationType || "url") === "url";
          const isPageDest = item.destinationType === "page";

          return (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Network</label>
                  <select
                    value={item.network}
                    onChange={(e) => {
                      const net = e.target.value as ShareNetworkType;
                      let defaultAction: ShareActionType = "open-url";
                      if (net === "copy") defaultAction = "copy";
                      else if (net === "email") defaultAction = "email";
                      else if (net === "facebook" || net === "twitter" || net === "linkedin" || net === "whatsapp" || net === "pinterest" || net === "reddit") defaultAction = "share";

                      updateItem({
                        network: net,
                        actionType: item.actionType || defaultAction,
                        label: item.label || (net.charAt(0).toUpperCase() + net.slice(1))
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="reddit">Reddit</option>
                    <option value="email">Email</option>
                    <option value="copy">Copy Link</option>
                    <option value="custom">Custom Link / Website</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Custom Label</label>
                  <input
                    type="text"
                    value={item.label || ""}
                    onChange={(e) => updateItem({ label: e.target.value })}
                    placeholder="Label..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Action Type & Target */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Action Type</label>
                  <select
                    value={item.actionType || "open-url"}
                    onChange={(e) => updateItem({ actionType: e.target.value as ShareActionType })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="open-url">Open URL / Profile</option>
                    <option value="share">Social Share Popup</option>
                    <option value="copy">Copy Link to Clipboard</option>
                    <option value="email">Send Mail (mailto:)</option>
                    <option value="custom">Custom Action</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Target Window</label>
                  <select
                    value={item.target || "_blank"}
                    onChange={(e) => updateItem({ target: e.target.value as "_blank" | "_self" })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="_blank">New Tab (_blank)</option>
                    <option value="_self">Same Tab (_self)</option>
                  </select>
                </div>
              </div>

              {/* Destination Selector: Page vs External URL */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                    Destination Mode
                  </label>
                  <select
                    value={item.destinationType || "url"}
                    onChange={(e) => updateItem({ destinationType: e.target.value as "url" | "page" })}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                  >
                    <option value="url">External URL / Custom Link</option>
                    <option value="page">Internal Website Page</option>
                  </select>
                </div>

                {isPageDest && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Select Page
                    </label>
                    <select
                      value={item.pageId || pages?.[0]?.id || ""}
                      onChange={(e) => updateItem({ pageId: e.target.value, destinationType: "page" })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                    >
                      {pages && pages.length > 0 ? (
                        pages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.slug})
                          </option>
                        ))
                      ) : (
                        <option value="">No pages available</option>
                      )}
                    </select>
                  </div>
                )}

                {isUrlDest && (
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-semibold text-slate-500">
                        Button Custom URL
                      </label>
                      <select
                        value={item.urlSource || (item.customUrl ? "custom" : "inherit")}
                        onChange={(e) => {
                          const newSource = e.target.value as "inherit" | "custom";
                          updateItem({
                            urlSource: newSource,
                            customUrl: newSource === "inherit" ? "" : item.customUrl
                          });
                        }}
                        className="text-[10px] font-medium text-slate-500 bg-transparent border-0 underline"
                      >
                        <option value="custom">Custom URL</option>
                        <option value="inherit">Inherit Widget URL</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={item.customUrl || item.buttonUrl || ""}
                      onChange={(e) => updateItem({ customUrl: e.target.value, buttonUrl: e.target.value, urlSource: "custom", destinationType: "url" })}
                      placeholder="https://facebook.com/my-page or /about"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Custom text/hashtags per button */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Custom Share Text</label>
                  <input
                    type="text"
                    value={item.shareText || ""}
                    onChange={(e) => updateItem({ shareText: e.target.value })}
                    placeholder="Override text..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Custom Hashtags</label>
                  <input
                    type="text"
                    value={item.hashtags || ""}
                    onChange={(e) => updateItem({ hashtags: e.target.value })}
                    placeholder="tag1, tag2..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!item.isDisabled}
                    onChange={(e) => updateItem({ isDisabled: !e.target.checked })}
                    className="accent-blue-600 rounded cursor-pointer"
                  />
                  <span>Enable Button</span>
                </label>
                {item.isDisabled && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    Hidden / Disabled
                  </span>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

// 7. Form Builder Inspector (F-178)
export function FormWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const fields = el.formFields || [];
  const steps = el.formSteps || [
    { id: "step_1", title: "Step 1: Contact Info" },
    { id: "step_2", title: "Step 2: Message Details" }
  ];
  const formMode = el.formMode || "simple";

  const handleAddStep = () => {
    const newStepId = "step_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
    const newSteps = [...steps, { id: newStepId, title: `Step ${steps.length + 1}: Details` }];
    updateProp("formSteps", newSteps);
  };

  const handleDeleteStep = (stepId: string) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((s) => s.id !== stepId);
    updateProp("formSteps", newSteps);
    // Reassign fields that belonged to the deleted step to the first step
    const targetStepId = newSteps[0].id;
    const updatedFields = fields.map((f) => (f.stepId === stepId ? { ...f, stepId: targetStepId } : f));
    updateProp("formFields", updatedFields);
  };

  return (
    <div className="space-y-4">
      {/* Form Mode Selector */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-2">
        <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">Form Mode</label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-blue-100/60 rounded-lg">
          <button
            type="button"
            onClick={() => updateProp("formMode", "simple")}
            className={`py-1.5 px-2 text-xs font-bold rounded-md transition ${
              formMode === "simple"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-blue-900/70 hover:text-blue-900"
            }`}
          >
            📋 Simple Form
          </button>
          <button
            type="button"
            onClick={() => {
              updateProp("formMode", "step-by-step");
              if (!el.formSteps || el.formSteps.length === 0) {
                updateProp("formSteps", steps);
              }
            }}
            className={`py-1.5 px-2 text-xs font-bold rounded-md transition ${
              formMode === "step-by-step"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-blue-900/70 hover:text-blue-900"
            }`}
          >
            🔢 Multi-Step Form
          </button>
        </div>
      </div>

      {/* Form Title & Subtitle */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Form Title</label>
          <input
            type="text"
            value={el.formTitle || ""}
            onChange={(e) => updateProp("formTitle", e.target.value)}
            placeholder="Get in Touch"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Columns</label>
          <select
            value={el.formLayoutColumns || 2}
            onChange={(e) => updateProp("formLayoutColumns", parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          >
            <option value={1}>1 Column</option>
            <option value={2}>2 Columns</option>
          </select>
        </div>
      </div>

      {/* Multi-Step Step Management */}
      {formMode === "step-by-step" && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>👣</span> Step Management ({steps.length} Steps)
            </h4>
            <button
              type="button"
              onClick={handleAddStep}
              className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
            >
              + ADD STEP
            </button>
          </div>

          <div className="space-y-2">
            {steps.map((step, sIdx) => (
              <div key={step.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-500 shrink-0 w-4">{sIdx + 1}.</span>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => {
                    const newSteps = steps.map((s) => (s.id === step.id ? { ...s, title: e.target.value } : s));
                    updateProp("formSteps", newSteps);
                  }}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 focus:bg-white outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  title="Delete Step"
                  onClick={() => handleDeleteStep(step.id)}
                  disabled={steps.length <= 1}
                  className="text-red-400 hover:text-red-600 disabled:opacity-30 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fields Builder with explicit + NEW FIELD control */}
      <UniversalItemManager<FormFieldItem>
        title="Form Fields Builder"
        items={fields}
        onUpdate={(newItems) => updateProp("formFields", newItems)}
        createDefaultItem={() => ({
          id: "field_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          type: "text",
          label: "New Field",
          placeholder: "Enter value...",
          required: false,
          width: "full",
          stepId: formMode === "step-by-step" ? (steps[0]?.id || "step_1") : undefined
        })}
        getItemHeaderLabel={(item) => {
          const stepInfo = formMode === "step-by-step" && item.stepId ? ` [Step ${steps.findIndex(s => s.id === item.stepId) + 1 || 1}]` : "";
          return `${item.label} (${item.type})${stepInfo}`;
        }}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Field Label</label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem({ label: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Field Type</label>
                <select
                  value={item.type}
                  onChange={(e) => updateItem({ type: e.target.value as FormFieldType })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium"
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="tel">Phone (Tel)</option>
                  <option value="number">Number</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select Dropdown</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="radio">Radio Buttons</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Placeholder</label>
              <input
                type="text"
                value={item.placeholder || ""}
                onChange={(e) => updateItem({ placeholder: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Step assignment for Multi-Step mode */}
            {formMode === "step-by-step" && (
              <div>
                <label className="block text-[10px] font-semibold text-indigo-600 mb-0.5">Assigned Step</label>
                <select
                  value={item.stepId || steps[0]?.id || "step_1"}
                  onChange={(e) => updateItem({ stepId: e.target.value })}
                  className="w-full rounded-lg border border-indigo-200 bg-indigo-50/50 px-2 py-1 text-xs font-semibold text-indigo-900"
                >
                  {steps.map((step, sIdx) => (
                    <option key={step.id} value={step.id}>
                      Step {sIdx + 1}: {step.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(item.type === "select" || item.type === "radio") && (
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Options (Comma separated)</label>
                <input
                  type="text"
                  value={(item.options || []).join(", ")}
                  onChange={(e) => updateItem({ options: e.target.value.split(",").map((s) => s.trim()) })}
                  placeholder="Option 1, Option 2, Option 3"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.required || false}
                  onChange={(e) => updateItem({ required: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Required Field</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 text-[10px]">Width:</span>
                <select
                  value={item.width || "full"}
                  onChange={(e) => updateItem({ width: e.target.value as "full" | "half" })}
                  className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px]"
                >
                  <option value="full">Full (100%)</option>
                  <option value="half">Half (50%)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      />

      {/* Button & Action Settings */}
      <div className="pt-2 border-t border-slate-200 space-y-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Button Settings</h4>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Submit Text</label>
            <input
              type="text"
              value={el.formSubmitText || "Send Message"}
              onChange={(e) => updateProp("formSubmitText", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Submit Color</label>
            <input
              type="color"
              value={el.formSubmitBtnBg || "#2563eb"}
              onChange={(e) => updateProp("formSubmitBtnBg", e.target.value)}
              className="h-7 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
            />
          </div>
        </div>

        {formMode === "step-by-step" && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Next Button Text</label>
              <input
                type="text"
                value={el.formNextText || "Next →"}
                onChange={(e) => updateProp("formNextText", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Back Button Text</label>
              <input
                type="text"
                value={el.formBackText || "← Back"}
                onChange={(e) => updateProp("formBackText", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 8. Reviews / Testimonials Inspector
export function ReviewsWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const reviews = el.reviewItems || el.testimonialItems || [];

  return (
    <div className="space-y-3">
      <UniversalItemManager<ReviewItem>
        title="Customer Reviews"
        items={reviews as ReviewItem[]}
        onUpdate={(newItems) => {
          updateProp("reviewItems", newItems);
          updateProp("testimonialItems", newItems.map(r => ({
            id: r.id,
            quote: r.reviewText,
            name: r.reviewerName,
            role: r.reviewerTitle || "Customer",
            avatarUrl: r.avatarUrl,
            rating: r.rating
          })));
        }}
        createDefaultItem={() => ({
          id: "rev_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          reviewerName: "Alex Morgan",
          reviewerTitle: "Verified Purchaser",
          reviewText: "Outstanding quality! Exceeded all expectations.",
          rating: 5,
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
          verified: true
        })}
        getItemHeaderLabel={(item) => `${item.reviewerName} (${item.rating}★)`}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Reviewer Name</label>
                <input
                  type="text"
                  value={item.reviewerName}
                  onChange={(e) => updateItem({ reviewerName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Rating (1 to 5 Stars)</label>
                <select
                  value={item.rating}
                  onChange={(e) => updateItem({ rating: parseInt(e.target.value, 10) })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                  <option value={3}>⭐⭐⭐ (3 Stars)</option>
                  <option value={2}>⭐⭐ (2 Stars)</option>
                  <option value={1}>⭐ (1 Star)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Review Copy</label>
              <textarea
                rows={2}
                value={item.reviewText}
                onChange={(e) => updateItem({ reviewText: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Avatar Image URL</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={item.avatarUrl || ""}
                  onChange={(e) => updateItem({ avatarUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => triggerImagePicker((url) => updateItem({ avatarUrl: url }))}
                  className="shrink-0 flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[10px] font-bold cursor-pointer transition active:scale-95"
                >
                  <span>📁 Select Image</span>
                </button>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

// 9. Video Playlist Inspector
export function VideoPlaylistInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const items = el.playlistItems || [];

  return (
    <div className="space-y-3">
      <UniversalItemManager<PlaylistItem>
        title="Video Playlist Items"
        items={items}
        onUpdate={(newItems) => updateProp("playlistItems", newItems)}
        createDefaultItem={() => ({
          id: "vid_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          title: "New Playlist Video",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&q=80",
          duration: "3:45"
        })}
        getItemHeaderLabel={(item) => item.title}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Video Title</label>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem({ title: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Video URL</label>
              <input
                type="text"
                value={item.videoUrl || item.url || ""}
                onChange={(e) => {
                  updateItem({ videoUrl: e.target.value, url: e.target.value });
                }}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Thumbnail URL</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={item.thumbnailUrl || item.thumbnail || ""}
                  onChange={(e) => updateItem({ thumbnailUrl: e.target.value, thumbnail: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => triggerImagePicker((url) => updateItem({ thumbnailUrl: url, thumbnail: url }))}
                  className="shrink-0 flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[10px] font-bold cursor-pointer transition active:scale-95"
                >
                  <span>📁 Select Image</span>
                </button>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

// 10. Nav Menu Inspector (F-180 & F-205 Dynamic)
export function NavMenuWidgetInspector({
  el,
  updateProp,
  pages,
  siteProducts,
  onCreatePage,
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
  pages?: PageConfig[];
  siteProducts?: SiteProduct[];
  onCreatePage?: (customName?: string) => PageConfig;
}) {
  const items = el.navMenuItems || [];
  const layout = el.navLayout || "horizontal";
  const alignment = el.navAlignment || "left";
  const gap = el.navGap ?? 24;

  const handleDuplicateItem = (item: NavMenuItem) => {
    const duplicated: NavMenuItem = {
      ...item,
      id: "nav_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      label: `${item.label} (Copy)`
    };
    updateProp("navMenuItems", [...items, duplicated]);
  };

  return (
    <div className="space-y-4">
      {/* Layout & Alignment */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>🧭</span> Layout & Alignment
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Layout</label>
            <select
              value={layout}
              onChange={(e) => updateProp("navLayout", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium"
            >
              <option value="horizontal">Horizontal (Row)</option>
              <option value="vertical">Vertical (Column)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alignment</label>
            <select
              value={alignment}
              onChange={(e) => updateProp("navAlignment", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              {layout === "horizontal" && <option value="between">Space Between</option>}
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-0.5">
            <label className="text-[10px] font-semibold text-slate-500">Item Spacing (Gap)</label>
            <span className="text-[10px] font-bold text-blue-600">{gap}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="64"
            value={gap}
            onChange={(e) => updateProp("navGap", parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Typography & Styling */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎨</span> Typography & Colors
        </h4>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Font Size</label>
            <input
              type="text"
              value={el.navFontSize || "14px"}
              onChange={(e) => updateProp("navFontSize", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Font Weight</label>
            <select
              value={el.navFontWeight || "600"}
              onChange={(e) => updateProp("navFontWeight", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium"
            >
              <option value="400">Normal (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi-Bold (600)</option>
              <option value="700">Bold (700)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Text Transform</label>
            <select
              value={el.navTextTransform || "none"}
              onChange={(e) => updateProp("navTextTransform", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium"
            >
              <option value="none">Normal</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>
        </div>

        {/* States Colors */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <label className="block text-[10px] font-bold text-slate-600 uppercase">Item State Colors</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="block text-[9px] text-slate-400 mb-0.5">Normal Color</span>
              <input
                type="color"
                value={el.navItemColor || "#334155"}
                onChange={(e) => updateProp("navItemColor", e.target.value)}
                className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              />
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 mb-0.5">Hover Color</span>
              <input
                type="color"
                value={el.navItemHoverColor || "#2563eb"}
                onChange={(e) => updateProp("navItemHoverColor", e.target.value)}
                className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              />
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 mb-0.5">Active Color</span>
              <input
                type="color"
                value={el.navItemActiveColor || "#2563eb"}
                onChange={(e) => updateProp("navItemActiveColor", e.target.value)}
                className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="block text-[9px] text-slate-400 mb-0.5">Normal Bg</span>
              <input
                type="color"
                value={el.navItemBg && el.navItemBg !== "transparent" ? el.navItemBg : "#ffffff"}
                onChange={(e) => updateProp("navItemBg", e.target.value)}
                className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              />
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 mb-0.5">Hover Bg</span>
              <input
                type="color"
                value={el.navItemHoverBg && !el.navItemHoverBg.startsWith("rgba") ? el.navItemHoverBg : "#f1f5f9"}
                onChange={(e) => updateProp("navItemHoverBg", e.target.value)}
                className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              />
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 mb-0.5">Active Bg</span>
              <input
                type="color"
                value={el.navItemActiveBg && !el.navItemActiveBg.startsWith("rgba") ? el.navItemActiveBg : "#eff6ff"}
                onChange={(e) => updateProp("navItemActiveBg", e.target.value)}
                className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              />
            </div>
          </div>
        </div>

        {/* Submenu Dropdown Styling */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <label className="block text-[10px] font-bold text-slate-600 uppercase">Submenu Dropdown Style</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[9px] text-slate-400 mb-0.5">Submenu Background</span>
              <input
                type="color"
                value={el.navSubmenuBg || "#ffffff"}
                onChange={(e) => updateProp("navSubmenuBg", e.target.value)}
                className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              />
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 mb-0.5">Submenu Text Color</span>
              <input
                type="color"
                value={el.navSubmenuTextColor || "#334155"}
                onChange={(e) => updateProp("navSubmenuTextColor", e.target.value)}
                className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items Manager */}
      <UniversalItemManager<NavMenuItem>
        title="Navigation Menu Items"
        items={items}
        onUpdate={(newItems) => updateProp("navMenuItems", newItems)}
        createDefaultItem={() => ({
          id: "nav_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          label: "New Link",
          url: "#",
          linkType: "url",
          target: "_self"
        })}
        getItemHeaderLabel={(item) => {
          let destInfo = "";
          if (item.destinationType === "page" || item.linkType === "page") {
            const page = pages?.find(p => p.id === item.pageId);
            destInfo = page ? ` [Page: ${page.name}]` : ` [Page: Orphaned ⚠️]`;
          } else if (item.destinationType === "product" || item.linkType === "product") {
            const prod = siteProducts?.find(p => p.id === item.productId);
            destInfo = prod ? ` [Product: ${prod.name}]` : ` [Product: Orphaned ⚠️]`;
          }
          return `${item.label}${destInfo}${item.submenu && item.submenu.length > 0 ? ` (${item.submenu.length} sub-items)` : ""}`;
        }}
        renderItemFields={(item, idx, updateItem) => {
          const activeDest = item.destinationType || (item.linkType === "page" ? "page" : item.linkType === "product" ? "product" : "url");

          return (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Link Label</label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem({ label: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Destination Type</label>
                  <select
                    value={activeDest}
                    onChange={(e) => {
                      const typeVal = e.target.value as "url" | "page" | "product";
                      updateItem({
                        destinationType: typeVal,
                        linkType: typeVal === "url" ? "url" : typeVal
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="url">Custom URL / Anchor</option>
                    <option value="page">📄 Site Page</option>
                    <option value="product">🛍️ Site Product</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Destination Inputs */}
              {activeDest === "url" && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Destination URL / Anchor</label>
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => updateItem({ url: e.target.value })}
                    placeholder="/page or #section or https://..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              )}

              {activeDest === "page" && (
                <div className="space-y-1 rounded-xl border border-blue-100 bg-blue-50/50 p-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-blue-900 uppercase">Target Page</label>
                    {onCreatePage && (
                      <button
                        type="button"
                        onClick={() => {
                          const created = onCreatePage();
                          updateItem({
                            pageId: created.id,
                            label: item.label === "New Link" ? created.name : item.label,
                            url: created.slug
                          });
                        }}
                        className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        + Create New Page
                      </button>
                    )}
                  </div>
                  <select
                    value={item.pageId || ""}
                    onChange={(e) => {
                      const selectedP = pages?.find(p => p.id === e.target.value);
                      updateItem({
                        pageId: e.target.value,
                        url: selectedP ? selectedP.slug : item.url,
                        label: item.label === "New Link" && selectedP ? selectedP.name : item.label
                      });
                    }}
                    className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="">-- Select Page --</option>
                    {(pages || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.slug}){p.isHome ? " [Home]" : ""}
                      </option>
                    ))}
                  </select>
                  {item.pageId && !pages?.some(p => p.id === item.pageId) && (
                    <span className="block text-[10px] font-bold text-amber-600 bg-amber-50 p-1 rounded border border-amber-200 mt-1">
                      ⚠️ Referenced page no longer exists. Select another or recreate.
                    </span>
                  )}
                </div>
              )}

              {activeDest === "product" && (
                <div className="space-y-1 rounded-xl border border-purple-100 bg-purple-50/50 p-2">
                  <label className="block text-[10px] font-bold text-purple-900 uppercase">Target Product</label>
                  <select
                    value={item.productId || ""}
                    onChange={(e) => {
                      const selectedProd = siteProducts?.find(p => p.id === e.target.value);
                      updateItem({
                        productId: e.target.value,
                        url: selectedProd ? (selectedProd.url || `#product-${selectedProd.id}`) : item.url,
                        label: item.label === "New Link" && selectedProd ? selectedProd.name : item.label
                      });
                    }}
                    className="w-full rounded-lg border border-purple-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="">-- Select Product --</option>
                    {(siteProducts || []).map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.price})
                      </option>
                    ))}
                  </select>
                  {item.productId && !siteProducts?.some(p => p.id === item.productId) && (
                    <span className="block text-[10px] font-bold text-amber-600 bg-amber-50 p-1 rounded border border-amber-200 mt-1">
                      ⚠️ Referenced product no longer exists.
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.target === "_blank"}
                    onChange={(e) => updateItem({ target: e.target.checked ? "_blank" : "_self" })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Open in new tab</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleDuplicateItem(item)}
                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  Duplicate
                </button>
              </div>

              {/* Submenu Management */}
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Submenu Dropdown
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentSub = item.submenu || [];
                      const newSubItem: NavSubmenuItem = {
                        id: "sub_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
                        label: `Sub Item ${currentSub.length + 1}`,
                        url: "#"
                      };
                      updateItem({ submenu: [...currentSub, newSubItem] });
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer"
                  >
                    + ADD SUBMENU ITEM
                  </button>
                </div>

                {item.submenu && item.submenu.length > 0 ? (
                  <div className="space-y-1.5 pl-2 border-l-2 border-blue-200">
                    {item.submenu.map((sub) => (
                      <div key={sub.id} className="flex flex-col gap-1 bg-slate-50 p-2 rounded-md border border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={sub.label}
                            onChange={(e) => {
                              const newSub = item.submenu!.map((s) => (s.id === sub.id ? { ...s, label: e.target.value } : s));
                              updateItem({ submenu: newSub });
                            }}
                            placeholder="Sub Label"
                            className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium"
                          />
                          <select
                            value={sub.destinationType || (sub.pageId ? "page" : sub.productId ? "product" : "url")}
                            onChange={(e) => {
                              const val = e.target.value as "url" | "page" | "product";
                              const newSub = item.submenu!.map((s) => (s.id === sub.id ? { ...s, destinationType: val } : s));
                              updateItem({ submenu: newSub });
                            }}
                            className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-semibold"
                          >
                            <option value="url">URL</option>
                            <option value="page">Page</option>
                            <option value="product">Product</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const newSub = item.submenu!.filter((s) => s.id !== sub.id);
                              updateItem({ submenu: newSub.length > 0 ? newSub : undefined });
                            }}
                            className="text-red-400 hover:text-red-600 text-xs px-1"
                            title="Delete Submenu Item"
                          >
                            ✕
                          </button>
                        </div>
                        {sub.destinationType === "page" ? (
                          <select
                            value={sub.pageId || ""}
                            onChange={(e) => {
                              const selectedP = pages?.find(p => p.id === e.target.value);
                              const newSub = item.submenu!.map((s) => (s.id === sub.id ? { ...s, pageId: e.target.value, url: selectedP?.slug || s.url } : s));
                              updateItem({ submenu: newSub });
                            }}
                            className="w-full rounded border border-blue-200 bg-blue-50/40 px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            <option value="">-- Select Page --</option>
                            {(pages || []).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        ) : sub.destinationType === "product" ? (
                          <select
                            value={sub.productId || ""}
                            onChange={(e) => {
                              const selectedProd = siteProducts?.find(p => p.id === e.target.value);
                              const newSub = item.submenu!.map((s) => (s.id === sub.id ? { ...s, productId: e.target.value, url: selectedProd?.url || s.url } : s));
                              updateItem({ submenu: newSub });
                            }}
                            className="w-full rounded border border-purple-200 bg-purple-50/40 px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            <option value="">-- Select Product --</option>
                            {(siteProducts || []).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={sub.url}
                            onChange={(e) => {
                              const newSub = item.submenu!.map((s) => (s.id === sub.id ? { ...s, url: e.target.value } : s));
                              updateItem({ submenu: newSub });
                            }}
                            placeholder="Sub URL"
                            className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-mono text-slate-700"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">No submenu items attached.</p>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

// 11. Countdown Inspector
export function CountdownWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
        <span>⏱️</span> Countdown Timer Configuration
      </h3>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Target Launch Date & Time
        </label>
        <input
          type="datetime-local"
          value={el.countdownTargetDate || "2026-12-31T23:59"}
          onChange={(e) => updateProp("countdownTargetDate", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Expiration Message
        </label>
        <input
          type="text"
          value={el.countdownExpiredMessage || "Special Offer Has Ended!"}
          onChange={(e) => updateProp("countdownExpiredMessage", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}

// 12. Lottie Inspector
export function LottieWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-pink-600 flex items-center gap-1.5">
        <span>🎨</span> Lottie Vector Animation
      </h3>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Animation JSON URL
        </label>
        <input
          type="text"
          value={el.lottieUrl || ""}
          onChange={(e) => updateProp("lottieUrl", e.target.value)}
          placeholder="https://assets.lottiefiles.com/.../data.json"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.lottieAutoplay !== false}
            onChange={(e) => updateProp("lottieAutoplay", e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          <span>Autoplay</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.lottieLoop !== false}
            onChange={(e) => updateProp("lottieLoop", e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          <span>Loop</span>
        </label>
      </div>
    </div>
  );
}

// 13. Code Highlight Inspector
export function CodeHighlightWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
        <span>💻</span> Syntax Code Highlight
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
          <select
            value={el.codeLanguage || "typescript"}
            onChange={(e) => updateProp("codeLanguage", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          >
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="python">Python</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Theme</label>
          <select
            value={el.codeTheme || "dark"}
            onChange={(e) => updateProp("codeTheme", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          >
            <option value="dark">Dark Theme</option>
            <option value="dracula">Dracula</option>
            <option value="light">Light Theme</option>
            <option value="github">GitHub Theme</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Code Snippet Content</label>
        <textarea
          rows={6}
          value={el.codeSnippet || ""}
          onChange={(e) => updateProp("codeSnippet", e.target.value)}
          className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-[#1e1e1e] text-slate-200 p-3 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="// Paste code here..."
        />
      </div>
    </div>
  );
}

// ==========================================
// UNIVERSAL ICON CONTROLS & INSPECTOR
// ==========================================

export function UniversalIconControls({
  el,
  updateProp,
  onOpenIconPicker,
  showContainerControls = false,
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
  updateStyle?: (key: string, val: any) => void;
  onOpenIconPicker?: () => void;
  showContainerControls?: boolean;
}) {
  const currentIconName = el.iconName || el.icon || "Star";
  const iconSize = el.iconSize || 24;
  const iconColor = el.iconColor || el.styles?.color || "#2563eb";
  const iconGap = el.iconGap ?? el.iconSpacing ?? 8;
  const iconPosition = el.iconPosition || "left";
  const iconRotate = el.iconRotate || 0;
  const iconFlipH = Boolean(el.iconFlipH);
  const iconFlipV = Boolean(el.iconFlipV);
  const iconStrokeWidth = el.iconStrokeWidth || 2;
  const iconBgColor = el.iconBgColor || "#eff6ff";
  const iconBorderRadius = el.iconBorderRadius || "8px";
  const iconPadding = el.iconPadding || 8;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      {/* Icon Picker Trigger */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎨</span> Icon Selector
        </label>
        <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate max-w-[110px]">
          {currentIconName}
        </span>
      </div>

      <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 shrink-0">
          <IconRenderer
            iconName={currentIconName}
            size={Math.min(iconSize, 32)}
            color={iconColor}
            rotate={iconRotate}
            flipH={iconFlipH}
            flipV={iconFlipV}
            strokeWidth={iconStrokeWidth}
          />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenIconPicker}
              className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>✨</span> Change Icon
            </button>
            {(el.iconName || el.icon) && (
              <button
                type="button"
                onClick={() => {
                  updateProp("iconName", "");
                  updateProp("icon", "");
                }}
                title="Remove Icon"
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Select vector icon from 100+ organized categories.
          </p>
        </div>
      </div>

      {/* Icon Position */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
          Icon Position
        </label>
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(["left", "right", "top", "bottom"] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => updateProp("iconPosition", pos)}
              className={`rounded py-1 text-[11px] font-bold capitalize transition cursor-pointer ${
                iconPosition === pos ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Icon Size & Spacing (Gap) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size (px)</label>
            <button
              type="button"
              onClick={() => updateProp("iconSize", 24)}
              className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>
          <input
            type="number"
            min={10}
            max={120}
            value={iconSize}
            onChange={(e) => updateProp("iconSize", Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Spacing (px)</label>
            <button
              type="button"
              onClick={() => {
                updateProp("iconGap", 8);
                updateProp("iconSpacing", 8);
              }}
              className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>
          <input
            type="number"
            min={0}
            max={64}
            value={iconGap}
            onChange={(e) => {
              const val = Number(e.target.value);
              updateProp("iconGap", val);
              updateProp("iconSpacing", val);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Icon Color */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Icon Color</label>
          <button
            type="button"
            onClick={() => updateProp("iconColor", "#2563eb")}
            className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Reset Color
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={iconColor.startsWith("#") ? iconColor : "#2563eb"}
            onChange={(e) => updateProp("iconColor", e.target.value)}
            className="h-7 w-9 rounded border border-slate-300 bg-white p-0.5 cursor-pointer"
          />
          <input
            type="text"
            value={iconColor}
            onChange={(e) => updateProp("iconColor", e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Rotation & Flips */}
      <div className="pt-2 border-t border-slate-200/80 space-y-2">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Rotation & Flip Transforms
        </label>
        <div className="grid grid-cols-5 gap-1">
          {[0, 45, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => updateProp("iconRotate", deg)}
              className={`rounded py-1 text-[10px] font-bold transition cursor-pointer ${
                iconRotate === deg ? "bg-blue-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => updateProp("iconFlipH", !iconFlipH)}
            className={`rounded-lg border px-2 py-1 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              iconFlipH ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>↔️</span> Flip Horiz
          </button>
          <button
            type="button"
            onClick={() => updateProp("iconFlipV", !iconFlipV)}
            className={`rounded-lg border px-2 py-1 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              iconFlipV ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>↕️</span> Flip Vert
          </button>
        </div>
      </div>

      {/* Stroke Width */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
          Stroke Width
        </label>
        <div className="grid grid-cols-5 gap-1">
          {[1, 1.5, 2, 2.5, 3].map((sw) => (
            <button
              key={sw}
              type="button"
              onClick={() => updateProp("iconStrokeWidth", sw)}
              className={`rounded py-1 text-[10px] font-bold transition cursor-pointer ${
                iconStrokeWidth === sw ? "bg-blue-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {sw}px
            </button>
          ))}
        </div>
      </div>

      {/* Container controls */}
      {showContainerControls && (
        <div className="pt-2 border-t border-slate-200/80 space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Icon Container Styling
          </label>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Container Background</label>
            <input
              type="color"
              value={iconBgColor.startsWith("#") ? iconBgColor : "#eff6ff"}
              onChange={(e) => updateProp("iconBgColor", e.target.value)}
              className="h-7 w-full rounded border border-slate-300 bg-white p-0.5 cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Border Radius</label>
              <input
                type="text"
                value={iconBorderRadius}
                onChange={(e) => updateProp("iconBorderRadius", e.target.value)}
                placeholder="8px"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Padding (px)</label>
              <input
                type="number"
                value={iconPadding}
                onChange={(e) => updateProp("iconPadding", Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Library Inspector
export function IconLibraryWidgetInspector({
  el,
  updateProp,
  updateStyle,
  onOpenIconPicker,
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
  updateStyle?: (key: string, val: any) => void;
  onOpenIconPicker?: () => void;
}) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
        <span>🎨</span> Icon Library Configuration
      </h3>

      <UniversalIconControls
        el={el}
        updateProp={updateProp}
        updateStyle={updateStyle}
        onOpenIconPicker={onOpenIconPicker}
        showContainerControls={true}
      />
    </div>
  );
}

// 14. Button Widget Inspector
export function ButtonWidgetInspector({
  el,
  updateProp,
  updateStyle,
  pages,
  activePageId,
  onCreatePage,
  siteProducts,
  onOpenIconPicker,
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
  updateStyle?: (key: string, val: any) => void;
  pages?: PageConfig[];
  activePageId?: string;
  onCreatePage?: (customName?: string) => PageConfig;
  siteProducts?: SiteProduct[];
  onOpenIconPicker?: () => void;
}) {
  const currentButtonColor = el.styles?.backgroundColor || el.buttonBg || "#2563eb";
  const currentContainerBg = el.containerBg || "transparent";
  const currentTextColor = el.styles?.color || el.buttonColor || "#ffffff";

  // Destination mode inference
  const activeDest = el.destinationType || el.linkType || (el.pageId ? "page" : "url");

  // Linked Page Status
  const pageStatus = getLinkedPageStatus(el, pages);
  const resolvedHref = resolveButtonHref(el, pages);

  // Independent Button Color (Button Fill) ONLY
  const handleButtonColorChange = (color: string) => {
    updateProp("buttonBg", color);
    if (updateStyle) {
      updateStyle("backgroundColor", color);
    }
  };

  // Independent Container Background Color ONLY
  const handleContainerBgChange = (bg: string) => {
    updateProp("containerBg", bg);
  };

  // Independent Text Color ONLY
  const handleTextColorChange = (text: string) => {
    updateProp("buttonColor", text);
    if (updateStyle) {
      updateStyle("color", text);
    }
  };

  // Preset helper
  const applyPreset = (buttonColor: string, textColor: string) => {
    handleButtonColorChange(buttonColor);
    handleTextColorChange(textColor);
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
        <span>🔘</span> Button Configuration
      </h3>

      {/* Button Label */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Button Label</label>
        <input
          type="text"
          value={el.content || el.buttonText || ""}
          onChange={(e) => {
            updateProp("content", e.target.value);
            updateProp("buttonText", e.target.value);
          }}
          placeholder="Click Me"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
        />
      </div>

      {/* Universal Icon Controls */}
      <UniversalIconControls
        el={el}
        updateProp={updateProp}
        updateStyle={updateStyle}
        onOpenIconPicker={onOpenIconPicker}
        showContainerControls={false}
      />

      {/* Link / Navigation Controls */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <span>🔗</span> Destination Link
          </label>
          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]" title={resolvedHref}>
            {resolvedHref}
          </span>
        </div>

        {/* Link Type Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Link Destination Type
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                const defaultPage = pages?.find((p) => p.isHome || p.id === "home") || pages?.[0];
                updateProp("destinationType", "page");
                updateProp("linkType", "page");
                if (defaultPage) {
                  updateProp("pageId", defaultPage.id);
                  updateProp("href", defaultPage.slug);
                  updateProp("linkUrl", defaultPage.slug);
                }
              }}
              className={`rounded py-1 px-2 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                activeDest === "page"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>📄</span> Internal Page
            </button>
            <button
              type="button"
              onClick={() => {
                updateProp("destinationType", "url");
                updateProp("linkType", "url");
              }}
              className={`rounded py-1 px-2 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                activeDest === "url"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🌐</span> Custom URL
            </button>
          </div>
        </div>

        {/* INTERNAL PAGE MODE */}
        {activeDest === "page" && (
          <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-blue-900 uppercase">Target Page</label>
              {onCreatePage && (
                <button
                  type="button"
                  onClick={() => {
                    const created = onCreatePage();
                    updateProp("pageId", created.id);
                    updateProp("href", created.slug);
                    updateProp("linkUrl", created.slug);
                  }}
                  className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  + Create New Page
                </button>
              )}
            </div>

            <select
              value={el.pageId || ""}
              onChange={(e) => {
                const selectedP = pages?.find((p) => p.id === e.target.value);
                updateProp("pageId", e.target.value);
                updateProp("destinationType", "page");
                updateProp("linkType", "page");
                if (selectedP) {
                  updateProp("href", selectedP.slug);
                  updateProp("linkUrl", selectedP.slug);
                }
              }}
              className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">-- Select Project Page --</option>
              {(pages || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug}){p.isHome ? " [Home]" : ""}
                </option>
              ))}
            </select>

            {/* Warning Alert if referenced page was deleted */}
            {el.pageId && !pageStatus.pageExists && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] font-medium text-amber-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span>⚠️</span> Linked page no longer exists
                </div>
                <p className="text-[10px] leading-tight text-amber-700">
                  The referenced page has been deleted. Please select another available page or switch to a custom URL.
                </p>
              </div>
            )}

            {pageStatus.pageExists && pageStatus.pageName && (
              <div className="flex items-center justify-between text-[10px] text-blue-700 bg-blue-100/60 px-2 py-1 rounded font-medium">
                <span>Route: <strong className="font-mono">{resolvedHref}</strong></span>
                <span className="text-[9px] bg-blue-200 px-1.5 py-0.5 rounded font-bold uppercase">Dynamic</span>
              </div>
            )}
          </div>
        )}

        {/* CUSTOM URL MODE */}
        {activeDest === "url" && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Custom Link URL</label>
              <button
                type="button"
                onClick={() => {
                  const currPage = getCurrentResolvedPageUrl(pages, activePageId);
                  updateProp("href", currPage);
                  updateProp("linkUrl", currPage);
                }}
                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Use Current Page
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={el.href || el.linkUrl || ""}
                onChange={(e) => {
                  updateProp("href", e.target.value);
                  updateProp("linkUrl", e.target.value);
                }}
                placeholder="https://example.com or /about or #section"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
              {(el.href || el.linkUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    updateProp("href", "");
                    updateProp("linkUrl", "");
                  }}
                  title="Clear URL"
                  className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="text-[10px] text-slate-400">
              Enter absolute URL (<code className="font-mono">https://...</code>), relative path (<code className="font-mono">/about</code>), anchor (<code className="font-mono">#contact</code>), or action (<code className="font-mono">popup:open(id)</code>).
            </div>
          </div>
        )}

        {/* Target & Link Attributes */}
        <div className="pt-2 border-t border-slate-200/60 space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={el.target === "_blank"}
              onChange={(e) => updateProp("target", e.target.checked ? "_blank" : "_self")}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Open link in new tab (<code className="text-[10px] font-mono text-slate-500">target="_blank"</code>)</span>
          </label>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">
                Rel Attributes
              </label>
              <input
                type="text"
                value={el.rel || ""}
                onChange={(e) => updateProp("rel", e.target.value)}
                placeholder="noopener noreferrer"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">
                Icon Position
              </label>
              <select
                value={el.iconPosition || "left"}
                onChange={(e) => updateProp("iconPosition", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="left">Left of Text</option>
                <option value="right">Right of Text</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={Boolean(el.download)}
              onChange={(e) => updateProp("download", e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Trigger file download (<code className="text-[10px] font-mono text-slate-500">download</code> attribute)</span>
          </label>
        </div>
      </div>

      {/* Independent Manual Color Controls */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-700">Button & Background Colors</label>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Button Color ONLY */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Button Fill Color
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={currentButtonColor.startsWith("#") ? currentButtonColor : "#2563eb"}
                onChange={(e) => handleButtonColorChange(e.target.value)}
                className="h-7 w-7 rounded border border-slate-300 cursor-pointer p-0 bg-transparent shrink-0"
              />
              <input
                type="text"
                value={currentButtonColor}
                onChange={(e) => handleButtonColorChange(e.target.value)}
                placeholder="#2563eb"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Background Color ONLY */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Container Bg
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={currentContainerBg.startsWith("#") ? currentContainerBg : "#ffffff"}
                onChange={(e) => handleContainerBgChange(e.target.value)}
                className="h-7 w-7 rounded border border-slate-300 cursor-pointer p-0 bg-transparent shrink-0"
              />
              <input
                type="text"
                value={currentContainerBg}
                onChange={(e) => handleContainerBgChange(e.target.value)}
                placeholder="transparent"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Text Color */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Text Color
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={currentTextColor.startsWith("#") ? currentTextColor : "#ffffff"}
              onChange={(e) => handleTextColorChange(e.target.value)}
              className="h-7 w-7 rounded border border-slate-300 cursor-pointer p-0 bg-transparent shrink-0"
            />
            <input
              type="text"
              value={currentTextColor}
              onChange={(e) => handleTextColorChange(e.target.value)}
              placeholder="#ffffff"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Color Presets */}
        <div className="pt-1">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Color Presets</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset("#2563eb", "#ffffff")}
              className="py-1 px-2 rounded-lg bg-blue-600 text-white text-[10px] font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              Primary Blue
            </button>
            <button
              type="button"
              onClick={() => applyPreset("#0f172a", "#ffffff")}
              className="py-1 px-2 rounded-lg bg-slate-900 text-white text-[10px] font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              Dark Slate
            </button>
            <button
              type="button"
              onClick={() => applyPreset("#059669", "#ffffff")}
              className="py-1 px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              Emerald Green
            </button>
            <button
              type="button"
              onClick={() => applyPreset("#d97706", "#ffffff")}
              className="py-1 px-2 rounded-lg bg-amber-600 text-white text-[10px] font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              Sunset Amber
            </button>
            <button
              type="button"
              onClick={() => applyPreset("#dc2626", "#ffffff")}
              className="py-1 px-2 rounded-lg bg-red-600 text-white text-[10px] font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              Crimson Red
            </button>
            <button
              type="button"
              onClick={() => applyPreset("#7c3aed", "#ffffff")}
              className="py-1 px-2 rounded-lg bg-purple-600 text-white text-[10px] font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              Royal Violet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 15. Portfolio Inspector
export function PortfolioWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const items = el.portfolioItems || [];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Columns</label>
        <select
          value={el.portfolioColumns || 3}
          onChange={(e) => updateProp("portfolioColumns", parseInt(e.target.value, 10))}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
        >
          <option value={2}>2 Columns</option>
          <option value={3}>3 Columns</option>
          <option value={4}>4 Columns</option>
        </select>
      </div>

      <UniversalItemManager<PortfolioItem>
        title="Portfolio Items"
        items={items}
        onUpdate={(newItems) => updateProp("portfolioItems", newItems)}
        createDefaultItem={() => ({
          id: "port_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          title: "New Project",
          category: "Branding",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
          url: "#",
          description: "Project showcase details..."
        })}
        getItemHeaderLabel={(item) => `${item.title} (${item.category || "General"})`}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Project Title</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem({ title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Category</label>
                <input
                  type="text"
                  value={item.category || ""}
                  onChange={(e) => updateItem({ category: e.target.value })}
                  placeholder="Design, Web, Tech..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Image URL</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={item.image || ""}
                  onChange={(e) => updateItem({ image: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => triggerImagePicker((url) => updateItem({ image: url }))}
                  className="shrink-0 flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[10px] font-bold cursor-pointer transition active:scale-95"
                >
                  <span>📁 Select Image</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Description</label>
              <textarea
                value={item.description || ""}
                onChange={(e) => updateItem({ description: e.target.value })}
                rows={2}
                placeholder="Project showcase details..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Project URL</label>
              <input
                type="text"
                value={item.url || ""}
                onChange={(e) => updateItem({ url: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}

// 16. Login Inspector
export function LoginWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
        <span>🔐</span> Login Widget Settings
      </h3>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Card Title</label>
        <input
          type="text"
          value={el.loginTitle || "Welcome Back"}
          onChange={(e) => updateProp("loginTitle", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
        <input
          type="text"
          value={el.loginSubtitle || "Sign in to your account..."}
          onChange={(e) => updateProp("loginSubtitle", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Label</label>
          <input
            type="text"
            value={el.loginEmailLabel || "Email Address"}
            onChange={(e) => updateProp("loginEmailLabel", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Password Label</label>
          <input
            type="text"
            value={el.loginPasswordLabel || "Password"}
            onChange={(e) => updateProp("loginPasswordLabel", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Submit Button Text</label>
        <input
          type="text"
          value={el.loginButtonText || "Sign In"}
          onChange={(e) => updateProp("loginButtonText", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
        />
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.loginShowRememberMe !== false}
            onChange={(e) => updateProp("loginShowRememberMe", e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Show "Remember me" Checkbox</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.loginShowForgotPassword !== false}
            onChange={(e) => updateProp("loginShowForgotPassword", e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Show "Forgot password" Link</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={el.loginShowSocialButtons !== false}
            onChange={(e) => updateProp("loginShowSocialButtons", e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Show Social Login Buttons</span>
        </label>
      </div>

      {el.loginShowForgotPassword !== false && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Forgot Password Text</label>
            <input
              type="text"
              value={el.loginForgotPasswordText || "Forgot password?"}
              onChange={(e) => updateProp("loginForgotPasswordText", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Forgot Password URL</label>
            <input
              type="text"
              value={el.loginForgotPasswordUrl || "#"}
              onChange={(e) => updateProp("loginForgotPasswordUrl", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// 17. Animated Text Inspector
export function AnimatedTextWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
        <span>✨</span> Animated Text Settings
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Animation Style</label>
          <select
            value={el.animatedStyle || "typed"}
            onChange={(e) => updateProp("animatedStyle", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          >
            <option value="typed">Typing Effect</option>
            <option value="rotate">Rotating Flip</option>
            <option value="fade">Fade In/Out</option>
            <option value="slide">Slide Up</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix Text</label>
          <input
            type="text"
            value={el.animatedPrefix || "We Build "}
            onChange={(e) => updateProp("animatedPrefix", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Rotating Words (Comma Separated)</label>
        <input
          type="text"
          value={(el.animatedWords || ["Websites", "Applications", "Experiences"]).join(", ")}
          onChange={(e) => updateProp("animatedWords", e.target.value.split(",").map(s => s.trim()))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
        />
      </div>
    </div>
  );
}

// 18. Price Table Inspector
export function PriceTableWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const plans: PricingPlan[] = (el.pricingPlans && el.pricingPlans.length > 0)
    ? el.pricingPlans
    : (el.pricePlans && el.pricePlans.length > 0)
      ? el.pricePlans
      : [
          {
            id: "plan_1",
            name: "Starter",
            price: "19",
            currency: "$",
            period: "/ month",
            description: "Essential tools for personal projects & freelancers.",
            isPopular: false,
            isRecommended: false,
            showBadge: false,
            buttonText: "Start Free Trial",
            buttonUrl: "#",
            buttonAlignment: "full",
            features: [
              { id: "f1", text: "5 Projects included", included: true },
              { id: "f2", text: "10GB SSD Storage", included: true },
              { id: "f3", text: "Basic Analytics", included: true },
              { id: "f4", text: "Custom Domain", included: false },
              { id: "f5", text: "24/7 Dedicated Support", included: false },
            ],
          },
          {
            id: "plan_2",
            name: "Professional",
            price: "49",
            currency: "$",
            period: "/ month",
            description: "Best for growing teams & expanding SaaS startups.",
            isPopular: true,
            isRecommended: true,
            badgeText: "MOST POPULAR",
            showBadge: true,
            buttonText: "Get Pro Now",
            buttonUrl: "#",
            buttonAlignment: "full",
            features: [
              { id: "f1", text: "Unlimited Projects", included: true },
              { id: "f2", text: "100GB SSD Storage", included: true },
              { id: "f3", text: "Advanced Analytics & Reports", included: true },
              { id: "f4", text: "Custom Domain & SSL", included: true },
              { id: "f5", text: "Priority Support", included: true },
            ],
          },
        ];

  const [expandedPlanId, setExpandedPlanId] = React.useState<string | null>(plans[0]?.id || null);

  const savePlans = (newPlans: PricingPlan[]) => {
    updateProp("pricingPlans", newPlans);
    updateProp("pricePlans", newPlans);
  };

  const handleAddPlan = () => {
    const newId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPlan: PricingPlan = {
      id: newId,
      name: `Plan ${plans.length + 1}`,
      price: "29",
      currency: "$",
      period: "/ month",
      description: "Custom pricing plan description.",
      isPopular: false,
      isRecommended: false,
      badgeText: "POPULAR",
      showBadge: false,
      buttonText: "Choose Plan",
      buttonUrl: "#",
      buttonAlignment: "full",
      features: [
        { id: `f_${Date.now()}_1`, text: "Feature 1", included: true },
        { id: `f_${Date.now()}_2`, text: "Feature 2", included: true },
        { id: `f_${Date.now()}_3`, text: "Feature 3", included: false },
      ],
    };
    const updated = [...plans, newPlan];
    savePlans(updated);
    setExpandedPlanId(newId);
  };

  const handleUpdatePlan = (idx: number, patch: Partial<PricingPlan>) => {
    const copy = [...plans];
    copy[idx] = { ...copy[idx], ...patch };
    savePlans(copy);
  };

  const handleDeletePlan = (idx: number) => {
    const updated = plans.filter((_, i) => i !== idx);
    savePlans(updated);
    if (expandedPlanId === plans[idx]?.id) {
      setExpandedPlanId(updated[0]?.id || null);
    }
  };

  const handleDuplicatePlan = (idx: number) => {
    const source = plans[idx];
    const newId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const copy: PricingPlan = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      features: (source.features || []).map((f) => ({
        ...f,
        id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })),
    };
    const updated = [...plans];
    updated.splice(idx + 1, 0, copy);
    savePlans(updated);
    setExpandedPlanId(newId);
  };

  const handleMovePlan = (idx: number, direction: "up" | "down") => {
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === plans.length - 1)) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...plans];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);
    savePlans(updated);
  };

  return (
    <div className="space-y-4">
      {/* 1. Layout & Alignment */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Grid & Card Layout
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Columns</label>
            <select
              value={el.pricingColumns || 3}
              onChange={(e) => updateProp("pricingColumns", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value={1}>1 Column</option>
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Gap Spacing (px)</label>
            <input
              type="number"
              min={8}
              max={64}
              value={el.pricingGap ?? 24}
              onChange={(e) => updateProp("pricingGap", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Text Alignment</label>
          <select
            value={el.pricingAlignment || "center"}
            onChange={(e) => updateProp("pricingAlignment", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="left">Left Align</option>
            <option value="center">Center Align</option>
            <option value="right">Right Align</option>
          </select>
        </div>
      </div>

      {/* 2. Colors & Corner Radius */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Card & Accent Styling
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Card Background</label>
            <input
              type="color"
              value={el.pricingCardBg || "#ffffff"}
              onChange={(e) => updateProp("pricingCardBg", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Card Border</label>
            <input
              type="color"
              value={el.pricingCardBorder || "#e2e8f0"}
              onChange={(e) => updateProp("pricingCardBorder", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Highlight Ring / Badge</label>
            <input
              type="color"
              value={el.pricingHighlightColor || "#2563eb"}
              onChange={(e) => updateProp("pricingHighlightColor", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Border Radius</label>
            <select
              value={el.pricingCardRadius || "24px"}
              onChange={(e) => updateProp("pricingCardRadius", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="8px">Small (8px)</option>
              <option value="12px">Medium (12px)</option>
              <option value="16px">Large (16px)</option>
              <option value="24px">Extra Large (24px)</option>
              <option value="32px">Full Pill (32px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. CTA Button Styling */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          CTA Button Styling
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Button Background</label>
            <input
              type="color"
              value={el.pricingBtnBg || "#2563eb"}
              onChange={(e) => updateProp("pricingBtnBg", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Button Text Color</label>
            <input
              type="color"
              value={el.pricingBtnColor || "#ffffff"}
              onChange={(e) => updateProp("pricingBtnColor", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Button Hover Bg</label>
            <input
              type="color"
              value={el.pricingBtnHoverBg || "#1d4ed8"}
              onChange={(e) => updateProp("pricingBtnHoverBg", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Button Hover Text</label>
            <input
              type="color"
              value={el.pricingBtnHoverColor || "#ffffff"}
              onChange={(e) => updateProp("pricingBtnHoverColor", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>
        </div>
      </div>

      {/* 4. Plans List Manager */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Pricing Plans ({plans.length})
          </span>
          <button
            type="button"
            onClick={handleAddPlan}
            className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-700 transition cursor-pointer active:scale-95 shadow-xs"
          >
            + Add Plan
          </button>
        </div>

        <div className="space-y-2.5">
          {plans.map((plan, planIdx) => {
            const isExpanded = expandedPlanId === plan.id;
            const isHighlight = Boolean(plan.isPopular || plan.isRecommended);

            return (
              <div
                key={plan.id}
                className={`rounded-xl border transition-all duration-200 bg-white ${
                  isHighlight ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"
                }`}
              >
                {/* Accordion Header */}
                <div
                  className="flex items-center justify-between p-2.5 cursor-pointer select-none bg-slate-50/70 hover:bg-slate-100/80 rounded-t-xl"
                  onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {plan.name || "Untitled Plan"}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                      {plan.currency || "$"}{plan.price}
                    </span>
                    {isHighlight && (
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title="Move Up"
                      disabled={planIdx === 0}
                      onClick={() => handleMovePlan(planIdx, "up")}
                      className="h-6 w-6 rounded border border-slate-200 bg-white text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      title="Move Down"
                      disabled={planIdx === plans.length - 1}
                      onClick={() => handleMovePlan(planIdx, "down")}
                      className="h-6 w-6 rounded border border-slate-200 bg-white text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      title="Duplicate Plan"
                      onClick={() => handleDuplicatePlan(planIdx)}
                      className="h-6 w-6 rounded border border-slate-200 bg-white text-[10px] text-blue-600 hover:bg-blue-50 cursor-pointer"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      title="Delete Plan"
                      onClick={() => handleDeletePlan(planIdx)}
                      className="h-6 w-6 rounded border border-red-200 bg-red-50 text-[10px] text-red-600 hover:bg-red-100 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="p-3 border-t border-slate-100 space-y-3">
                    {/* Name & Highlight */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Plan Name</label>
                        <input
                          type="text"
                          value={plan.name}
                          onChange={(e) => handleUpdatePlan(planIdx, { name: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-center pt-3">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-amber-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(plan.isPopular || plan.isRecommended)}
                            onChange={(e) =>
                              handleUpdatePlan(planIdx, {
                                isPopular: e.target.checked,
                                isRecommended: e.target.checked,
                                showBadge: e.target.checked ? true : plan.showBadge,
                              })
                            }
                            className="accent-amber-500 rounded"
                          />
                          <span>Recommended Plan</span>
                        </label>
                      </div>
                    </div>

                    {/* Price, Currency, Period */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-400 mb-0.5">Currency</label>
                        <input
                          type="text"
                          value={plan.currency ?? "$"}
                          onChange={(e) => handleUpdatePlan(planIdx, { currency: e.target.value })}
                          placeholder="$"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-400 mb-0.5">Price</label>
                        <input
                          type="text"
                          value={plan.price}
                          onChange={(e) => handleUpdatePlan(planIdx, { price: e.target.value })}
                          placeholder="29"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-400 mb-0.5">Period</label>
                        <input
                          type="text"
                          value={plan.period}
                          onChange={(e) => handleUpdatePlan(planIdx, { period: e.target.value })}
                          placeholder="/ month"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-400 mb-0.5">Description</label>
                      <input
                        type="text"
                        value={plan.description || ""}
                        onChange={(e) => handleUpdatePlan(planIdx, { description: e.target.value })}
                        placeholder="Plan subtitle or description..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Badge Controls */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer pt-3">
                        <input
                          type="checkbox"
                          checked={plan.showBadge !== false && Boolean(plan.badgeText || plan.isPopular)}
                          onChange={(e) => handleUpdatePlan(planIdx, { showBadge: e.target.checked })}
                          className="accent-blue-600 rounded"
                        />
                        <span>Display Badge</span>
                      </label>
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-400 mb-0.5">Badge Text</label>
                        <input
                          type="text"
                          value={plan.badgeText || "MOST POPULAR"}
                          onChange={(e) => handleUpdatePlan(planIdx, { badgeText: e.target.value })}
                          placeholder="e.g. MOST POPULAR"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-blue-700 outline-none focus:border-blue-500 uppercase"
                        />
                      </div>
                    </div>

                    {/* CTA Button Settings */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">CTA Button Settings</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={plan.buttonText}
                          onChange={(e) => handleUpdatePlan(planIdx, { buttonText: e.target.value })}
                          placeholder="Button Text..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={plan.buttonUrl}
                          onChange={(e) => handleUpdatePlan(planIdx, { buttonUrl: e.target.value })}
                          placeholder="URL Link..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-600 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Features Manager */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                          Features ({(plan.features || []).length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const currentFeats = plan.features || [];
                            const newFeat: PricePlanFeature = {
                              id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                              text: `New Feature`,
                              included: true,
                            };
                            handleUpdatePlan(planIdx, { features: [...currentFeats, newFeat] });
                          }}
                          className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          + Add Feature
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {(plan.features || []).map((feat, featIdx) => (
                          <div key={feat.id} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                            {/* Toggle included */}
                            <button
                              type="button"
                              title={feat.included ? "Mark as Excluded" : "Mark as Included"}
                              onClick={() => {
                                const copyFeats = [...(plan.features || [])];
                                copyFeats[featIdx] = { ...copyFeats[featIdx], included: !copyFeats[featIdx].included };
                                handleUpdatePlan(planIdx, { features: copyFeats });
                              }}
                              className={`h-5 w-5 rounded text-[10px] font-extrabold shrink-0 flex items-center justify-center cursor-pointer transition ${
                                feat.included ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-200 text-slate-500 border border-slate-300"
                              }`}
                            >
                              {feat.included ? "✓" : "✕"}
                            </button>

                            {/* Feature Text */}
                            <input
                              type="text"
                              value={feat.text}
                              onChange={(e) => {
                                const copyFeats = [...(plan.features || [])];
                                copyFeats[featIdx] = { ...copyFeats[featIdx], text: e.target.value };
                                handleUpdatePlan(planIdx, { features: copyFeats });
                              }}
                              className="w-full text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 outline-none focus:border-blue-500"
                            />

                            {/* Move Up/Down */}
                            <button
                              type="button"
                              disabled={featIdx === 0}
                              onClick={() => {
                                const copyFeats = [...(plan.features || [])];
                                const [m] = copyFeats.splice(featIdx, 1);
                                copyFeats.splice(featIdx - 1, 0, m);
                                handleUpdatePlan(planIdx, { features: copyFeats });
                              }}
                              className="h-5 w-5 shrink-0 rounded border border-slate-200 bg-white text-[9px] text-slate-600 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                            >
                              ▲
                            </button>

                            <button
                              type="button"
                              disabled={featIdx === (plan.features || []).length - 1}
                              onClick={() => {
                                const copyFeats = [...(plan.features || [])];
                                const [m] = copyFeats.splice(featIdx, 1);
                                copyFeats.splice(featIdx + 1, 0, m);
                                handleUpdatePlan(planIdx, { features: copyFeats });
                              }}
                              className="h-5 w-5 shrink-0 rounded border border-slate-200 bg-white text-[9px] text-slate-600 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                            >
                              ▼
                            </button>

                            {/* Delete Feature */}
                            <button
                              type="button"
                              onClick={() => {
                                const copyFeats = (plan.features || []).filter((_, i) => i !== featIdx);
                                handleUpdatePlan(planIdx, { features: copyFeats });
                              }}
                              className="h-5 w-5 shrink-0 rounded border border-red-200 bg-red-50 text-[10px] text-red-600 hover:bg-red-100 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 19. Price List Inspector (F-183)
export function PriceListWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const items = el.priceListItems || [];

  return (
    <div className="space-y-4">
      {/* Layout & Separator Settings */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Layout & Leader Settings
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Item Spacing (Gap)
            </label>
            <input
              type="number"
              min={8}
              max={60}
              value={el.priceListGap ?? 20}
              onChange={(e) => updateProp("priceListGap", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Leader Line Style
            </label>
            <select
              value={el.priceListSeparatorStyle || "dotted"}
              onChange={(e) => updateProp("priceListSeparatorStyle", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="dotted">Dotted Leader (...) </option>
              <option value="dashed">Dashed Line (---)</option>
              <option value="solid">Solid Line (___)</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        {/* Thumbnail toggle & size */}
        <div className="pt-2 border-t border-slate-200/60 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-700 cursor-pointer">
              Show Media / Thumbnails
            </label>
            <input
              type="checkbox"
              checked={el.priceListShowImages !== false}
              onChange={(e) => updateProp("priceListShowImages", e.target.checked)}
              className="accent-teal-600 rounded cursor-pointer"
            />
          </div>

          {el.priceListShowImages !== false && (
            <div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-0.5">
                <span>Thumbnail Size</span>
                <span>{el.priceListImageSize || 48}px</span>
              </div>
              <input
                type="range"
                min={32}
                max={96}
                value={el.priceListImageSize || 48}
                onChange={(e) => updateProp("priceListImageSize", Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Colors & Alignment */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Title Color
            </label>
            <input
              type="color"
              value={el.priceListTitleColor || "#0f172a"}
              onChange={(e) => updateProp("priceListTitleColor", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Price Color
            </label>
            <input
              type="color"
              value={el.priceListPriceColor || "#2563eb"}
              onChange={(e) => updateProp("priceListPriceColor", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Price Pill Bg
            </label>
            <input
              type="color"
              value={el.priceListPriceBg || "#eff6ff"}
              onChange={(e) => updateProp("priceListPriceBg", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>
        </div>
      </div>

      {/* Item Manager */}
      <UniversalItemManager<PriceListItem>
        title={`Services & Menu Items (${items.length})`}
        items={items}
        onUpdate={(newItems) => updateProp("priceListItems", newItems)}
        createDefaultItem={() => ({
          id: "pli_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          name: `New Service Item ${items.length + 1}`,
          title: `New Service Item ${items.length + 1}`,
          price: "$25.00",
          description: "Description of product or service offering.",
          imageUrl: "",
          icon: "✨",
        })}
        getItemHeaderLabel={(item) => `${item.title || item.name} (${item.price})`}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Item Name</label>
                <input
                  type="text"
                  value={item.title || item.name || ""}
                  onChange={(e) => updateItem({ title: e.target.value, name: e.target.value })}
                  placeholder="e.g. Signature Espresso"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Price Display</label>
                <input
                  type="text"
                  value={item.price}
                  onChange={(e) => updateItem({ price: e.target.value })}
                  placeholder="e.g. $4.50 or From $20"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Description</label>
              <textarea
                rows={2}
                value={item.description || ""}
                onChange={(e) => updateItem({ description: e.target.value })}
                placeholder="Item description copy..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Icon / Emoji</label>
                <input
                  type="text"
                  value={item.icon || ""}
                  onChange={(e) => updateItem({ icon: e.target.value })}
                  placeholder="e.g. ☕ or ✂️"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Image Position</label>
                <select
                  value={item.imagePos || "left"}
                  onChange={(e) => updateItem({ imagePos: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium"
                >
                  <option value="left">Left Side</option>
                  <option value="right">Right Side</option>
                </select>
              </div>
            </div>

            <ImagePickerControl
              label="Thumbnail Image"
              value={item.imageUrl || ""}
              onChange={(url) => updateItem({ imageUrl: url })}
            />
          </div>
        )}
      />
    </div>
  );
}

// 20. Flip Box Inspector (F-185)
export function FlipBoxWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Card Configuration */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Flip Animation & Card Layout
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Flip Direction
            </label>
            <select
              value={el.flipDirection || "flip-right"}
              onChange={(e) => updateProp("flipDirection", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value="flip-right">Flip Right →</option>
              <option value="flip-left">Flip Left ←</option>
              <option value="flip-up">Flip Up ↑</option>
              <option value="flip-down">Flip Down ↓</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Flip Speed
            </label>
            <select
              value={el.flipDuration || "0.6s"}
              onChange={(e) => updateProp("flipDuration", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value="0.3s">Fast (0.3s)</option>
              <option value="0.6s">Normal (0.6s)</option>
              <option value="1.0s">Slow (1.0s)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Card Height
            </label>
            <input
              type="text"
              value={el.flipCardHeight || "320px"}
              onChange={(e) => updateProp("flipCardHeight", e.target.value)}
              placeholder="e.g. 320px"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Corner Radius
            </label>
            <input
              type="text"
              value={el.flipBorderRadius || "20px"}
              onChange={(e) => updateProp("flipBorderRadius", e.target.value)}
              placeholder="e.g. 20px"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* Manual Flip Inspector Mode */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 bg-indigo-50/60 -mx-3 -mb-3 p-3 rounded-b-xl border-indigo-100">
          <div>
            <span className="block text-xs font-bold text-indigo-900">Inspect Back Side</span>
            <span className="block text-[10px] text-indigo-600">Keep card flipped open in editor canvas</span>
          </div>
          <button
            type="button"
            onClick={() => updateProp("flipIsFlippedManual", !el.flipIsFlippedManual)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              el.flipIsFlippedManual
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            }`}
          >
            {el.flipIsFlippedManual ? "Showing Back 🔄" : "Show Front 👁️"}
          </button>
        </div>
      </div>

      {/* Front Side Manager */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
          <span>FRONT SIDE CONTENT</span>
        </span>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Title</label>
          <input
            type="text"
            value={el.flipFrontTitle || ""}
            onChange={(e) => updateProp("flipFrontTitle", e.target.value)}
            placeholder="Front Card Title..."
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Description</label>
          <textarea
            rows={2}
            value={el.flipFrontDescription || ""}
            onChange={(e) => updateProp("flipFrontDescription", e.target.value)}
            placeholder="Front Card Description..."
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Icon / Emoji</label>
            <input
              type="text"
              value={el.flipFrontIcon || ""}
              onChange={(e) => updateProp("flipFrontIcon", e.target.value)}
              placeholder="e.g. 🚀"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Text Color</label>
            <input
              type="color"
              value={el.flipFrontTextColor || "#ffffff"}
              onChange={(e) => updateProp("flipFrontTextColor", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Background (Color / CSS Gradient)</label>
          <input
            type="text"
            value={el.flipFrontBg || ""}
            onChange={(e) => updateProp("flipFrontBg", e.target.value)}
            placeholder="linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono text-slate-700"
          />
        </div>

        <ImagePickerControl
          label="Front Image (Optional)"
          value={el.flipFrontImage || ""}
          onChange={(url) => updateProp("flipFrontImage", url)}
        />
      </div>

      {/* Back Side Manager */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
          <span>BACK SIDE CONTENT</span>
        </span>

        <div>
          <label className="block text-[10px] font-semibold text-indigo-700 mb-0.5">Title</label>
          <input
            type="text"
            value={el.flipBackTitle || ""}
            onChange={(e) => updateProp("flipBackTitle", e.target.value)}
            placeholder="Back Card Title..."
            className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-indigo-700 mb-0.5">Description</label>
          <textarea
            rows={2}
            value={el.flipBackDescription || ""}
            onChange={(e) => updateProp("flipBackDescription", e.target.value)}
            placeholder="Back Card Description..."
            className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs text-slate-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-indigo-700 mb-0.5">Text Color</label>
            <input
              type="color"
              value={el.flipBackTextColor || "#ffffff"}
              onChange={(e) => updateProp("flipBackTextColor", e.target.value)}
              className="h-7 w-full cursor-pointer rounded-lg border border-indigo-200 bg-white p-0.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-indigo-700 mb-0.5">Background (CSS / Color)</label>
            <input
              type="text"
              value={el.flipBackBg || ""}
              onChange={(e) => updateProp("flipBackBg", e.target.value)}
              placeholder="linear-gradient(...)"
              className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-700"
            />
          </div>
        </div>

        {/* CTA Button Controls */}
        <div className="pt-2 border-t border-indigo-200/60 space-y-2">
          <span className="block text-[10px] font-bold text-indigo-900 uppercase">CTA Button & Link</span>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-indigo-700 mb-0.5">Button Text</label>
              <input
                type="text"
                value={el.flipBackBtnText || ""}
                onChange={(e) => updateProp("flipBackBtnText", e.target.value)}
                placeholder="e.g. Get Started Now"
                className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-indigo-700 mb-0.5">Link URL</label>
              <input
                type="text"
                value={el.flipBackBtnUrl || "#"}
                onChange={(e) => updateProp("flipBackBtnUrl", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-indigo-700 mb-0.5">Button Background</label>
              <input
                type="color"
                value={el.flipBackBtnBg || "#ffffff"}
                onChange={(e) => updateProp("flipBackBtnBg", e.target.value)}
                className="h-7 w-full cursor-pointer rounded-lg border border-indigo-200 bg-white p-0.5"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-indigo-700 mb-0.5">Button Text Color</label>
              <input
                type="color"
                value={el.flipBackBtnTextColor || "#4f46e5"}
                onChange={(e) => updateProp("flipBackBtnTextColor", e.target.value)}
                className="h-7 w-full cursor-pointer rounded-lg border border-indigo-200 bg-white p-0.5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 21. Call to Action (CTA) Inspector (F-186)
export function CTAWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Layout & Container Styling */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Layout & Container Style
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Content Alignment
            </label>
            <select
              value={el.ctaLayout || "centered"}
              onChange={(e) => updateProp("ctaLayout", e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
            >
              <option value="centered">Centered Stack</option>
              <option value="left-aligned">Left Aligned</option>
              <option value="split">Split Row (Title Left, CTA Right)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Card Border Radius
            </label>
            <select
              value={el.ctaCardBorderRadius || "24px"}
              onChange={(e) => updateProp("ctaCardBorderRadius", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
            >
              <option value="0px">Square (0px)</option>
              <option value="12px">Rounded (12px)</option>
              <option value="24px">Curved Large (24px)</option>
              <option value="36px">Pill / Soft (36px)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Card Background
            </label>
            <input
              type="text"
              value={el.ctaCardBg || "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"}
              onChange={(e) => updateProp("ctaCardBg", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-800 outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Text Color
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.ctaTextColor || "#ffffff"}
                onChange={(e) => updateProp("ctaTextColor", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.ctaTextColor || "#ffffff"}
                onChange={(e) => updateProp("ctaTextColor", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Heading & Content */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Heading & Media Content
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Icon / Emoji
            </label>
            <input
              type="text"
              value={el.ctaIcon || "⚡"}
              onChange={(e) => updateProp("ctaIcon", e.target.value)}
              placeholder="⚡, 🚀, 💡..."
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <ImagePickerControl
              label="Optional Image"
              value={el.ctaImage || ""}
              onChange={(url) => updateProp("ctaImage", url)}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
            Heading
          </label>
          <input
            type="text"
            value={el.ctaHeading !== undefined ? el.ctaHeading : "Boost Your Conversions Today"}
            onChange={(e) => updateProp("ctaHeading", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
            Description
          </label>
          <textarea
            rows={2}
            value={el.ctaDescription !== undefined ? el.ctaDescription : (el.ctaDesc || "Start your 14-day free trial. Cancel anytime.")}
            onChange={(e) => {
              updateProp("ctaDescription", e.target.value);
              updateProp("ctaDesc", e.target.value);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Button Customization */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Button Customization
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Button Text
            </label>
            <input
              type="text"
              value={el.ctaButtonText !== undefined ? el.ctaButtonText : "Claim Your Free Trial →"}
              onChange={(e) => updateProp("ctaButtonText", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Button Link URL
            </label>
            <input
              type="text"
              value={el.ctaButtonUrl || "#"}
              onChange={(e) => updateProp("ctaButtonUrl", e.target.value)}
              placeholder="#"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-800 outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Button Background
            </label>
            <input
              type="text"
              value={el.ctaButtonBg || "linear-gradient(135deg, #e11d48 0%, #be123c 100%)"}
              onChange={(e) => updateProp("ctaButtonBg", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-800 outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Button Radius
            </label>
            <select
              value={el.ctaButtonBorderRadius || "12px"}
              onChange={(e) => updateProp("ctaButtonBorderRadius", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
            >
              <option value="0px">Square (0px)</option>
              <option value="8px">Rounded Small (8px)</option>
              <option value="12px">Rounded Medium (12px)</option>
              <option value="9999px">Pill / Capsule</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
            Button Text Color
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={el.ctaButtonTextColor || "#ffffff"}
              onChange={(e) => updateProp("ctaButtonTextColor", e.target.value)}
              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
            />
            <input
              type="text"
              value={el.ctaButtonTextColor || "#ffffff"}
              onChange={(e) => updateProp("ctaButtonTextColor", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 22. Media Carousel Inspector (F-187)
export function MediaCarouselWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const items = el.mediaCarouselItems || [];

  return (
    <div className="space-y-4">
      {/* SECTION 1: ITEMS MANAGEMENT */}
      <UniversalItemManager<MediaCarouselItem>
        title="Carousel Media Items"
        items={items}
        onUpdate={(newItems) => updateProp("mediaCarouselItems", newItems)}
        createDefaultItem={() => ({
          id: "med_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          type: "image",
          url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
          title: "New Media Slide",
          caption: "Slide caption text...",
          altText: "Media Image",
        })}
        getItemHeaderLabel={(item) => (item.title || (item.type === "video" ? "Video Slide" : "Image Slide"))}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Media Type</label>
                <select
                  value={item.type || "image"}
                  onChange={(e) => updateItem({ type: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                >
                  <option value="image">📷 Image</option>
                  <option value="video">🎬 Video</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Title</label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateItem({ title: e.target.value })}
                  placeholder="Slide Title..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            <ImagePickerControl
              label={item.type === "video" ? "Thumbnail / Poster Image" : "Image URL"}
              value={item.url || ""}
              onChange={(url) => updateItem({ url })}
            />

            {item.type === "video" && (
              <div>
                <label className="block text-[10px] font-semibold text-cyan-700 mb-0.5">Video Source URL (YouTube / Vimeo / MP4)</label>
                <input
                  type="text"
                  value={item.videoUrl || ""}
                  onChange={(e) => updateItem({ videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-lg border border-cyan-200 bg-cyan-50/50 px-2 py-1 text-xs font-mono text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Caption</label>
              <input
                type="text"
                value={item.caption || ""}
                onChange={(e) => updateItem({ caption: e.target.value })}
                placeholder="Caption text..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
              />
            </div>
          </div>
        )}
      />

      {/* SECTION 2: NAVIGATION & AUTOPLAY */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Playback & Controls
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Autoplay
            </label>
            <input
              type="checkbox"
              checked={el.mediaCarouselAutoplay !== false}
              onChange={(e) => updateProp("mediaCarouselAutoplay", e.target.checked)}
              className="accent-cyan-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Infinite Loop
            </label>
            <input
              type="checkbox"
              checked={el.mediaCarouselLoop !== false}
              onChange={(e) => updateProp("mediaCarouselLoop", e.target.checked)}
              className="accent-cyan-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
            Autoplay Speed (ms)
          </label>
          <input
            type="number"
            min={1000}
            max={10000}
            step={500}
            value={el.mediaCarouselAutoplaySpeed || 3500}
            onChange={(e) => updateProp("mediaCarouselAutoplaySpeed", Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Nav Arrows
            </label>
            <input
              type="checkbox"
              checked={el.mediaCarouselShowNav !== false}
              onChange={(e) => updateProp("mediaCarouselShowNav", e.target.checked)}
              className="accent-cyan-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Pagination Dots
            </label>
            <input
              type="checkbox"
              checked={el.mediaCarouselShowDots !== false}
              onChange={(e) => updateProp("mediaCarouselShowDots", e.target.checked)}
              className="accent-cyan-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: LAYOUT & SIZING */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Layout & Sizing
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Slides Per View
            </label>
            <select
              value={el.mediaCarouselSlidesPerView || 3}
              onChange={(e) => updateProp("mediaCarouselSlidesPerView", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500"
            >
              <option value={1}>1 Slide</option>
              <option value={2}>2 Slides</option>
              <option value={3}>3 Slides</option>
              <option value={4}>4 Slides</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Slide Gap (px)
            </label>
            <input
              type="number"
              min={0}
              max={40}
              value={el.mediaCarouselGap ?? 16}
              onChange={(e) => updateProp("mediaCarouselGap", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Aspect Ratio
            </label>
            <select
              value={el.mediaCarouselAspectRatio || "landscape"}
              onChange={(e) => updateProp("mediaCarouselAspectRatio", e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500"
            >
              <option value="landscape">Landscape (16:9)</option>
              <option value="square">Square (1:1)</option>
              <option value="portrait">Portrait (3:4)</option>
              <option value="video">Ultrawide (21:9)</option>
              <option value="auto">Auto Height</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Border Radius
            </label>
            <select
              value={el.mediaCarouselBorderRadius || "16px"}
              onChange={(e) => updateProp("mediaCarouselBorderRadius", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500"
            >
              <option value="0px">Square (0px)</option>
              <option value="8px">Rounded Small (8px)</option>
              <option value="16px">Rounded Large (16px)</option>
              <option value="24px">Extra Curved (24px)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
            Media Fit (Object Fit)
          </label>
          <select
            value={el.mediaCarouselImageSizing || "cover"}
            onChange={(e) => updateProp("mediaCarouselImageSizing", e.target.value as any)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500"
          >
            <option value="cover">Cover (Crop to fill)</option>
            <option value="contain">Contain (Fit inside)</option>
            <option value="fill">Fill (Stretch)</option>
          </select>
        </div>
      </div>

      {/* SECTION 4: STYLING & TRANSITIONS */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Transitions & Styling
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Transition Effect
            </label>
            <select
              value={el.mediaCarouselTransition || "slide"}
              onChange={(e) => updateProp("mediaCarouselTransition", e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500"
            >
              <option value="slide">Slide</option>
              <option value="fade">Fade</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Transition Speed (ms)
            </label>
            <input
              type="number"
              min={200}
              max={2000}
              step={100}
              value={el.mediaCarouselTransitionSpeed || 500}
              onChange={(e) => updateProp("mediaCarouselTransitionSpeed", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
            Card Background Color
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={el.mediaCarouselCardBg || "#0f172a"}
              onChange={(e) => updateProp("mediaCarouselCardBg", e.target.value)}
              className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
            />
            <input
              type="text"
              value={el.mediaCarouselCardBg || "#0f172a"}
              onChange={(e) => updateProp("mediaCarouselCardBg", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 23. Testimonial Carousel Inspector (F-188)
export function TestimonialCarouselWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const items = el.testimonialItems || [];

  return (
    <div className="space-y-4">
      {/* SECTION 1: ITEMS MANAGEMENT */}
      <UniversalItemManager<TestimonialItem>
        title="Testimonial Items"
        items={items}
        onUpdate={(newItems) => updateProp("testimonialItems", newItems)}
        createDefaultItem={() => ({
          id: "test_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          quote: "Outstanding experience! The results exceeded our expectations.",
          name: "Alex Morgan",
          role: "Creative Director",
          avatarUrl: "",
          rating: 5,
        })}
        getItemHeaderLabel={(item) => item.name || "Testimonial Card"}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Quote Text</label>
              <textarea
                rows={2}
                value={item.quote || ""}
                onChange={(e) => updateItem({ quote: e.target.value })}
                placeholder="Client feedback quote..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Customer Name</label>
                <input
                  type="text"
                  value={item.name || ""}
                  onChange={(e) => updateItem({ name: e.target.value })}
                  placeholder="Full Name..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Role / Company</label>
                <input
                  type="text"
                  value={item.role || ""}
                  onChange={(e) => updateItem({ role: e.target.value })}
                  placeholder="Job Title..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Rating (Stars)</label>
                <select
                  value={item.rating ?? 5}
                  onChange={(e) => updateItem({ rating: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                >
                  <option value={5}>5 Stars (★★★★★)</option>
                  <option value={4}>4 Stars (★★★★☆)</option>
                  <option value={3}>3 Stars (★★★☆☆)</option>
                  <option value={2}>2 Stars (★★☆☆☆)</option>
                  <option value={1}>1 Star (★☆☆☆☆)</option>
                </select>
              </div>

              <ImagePickerControl
                label="Avatar Image"
                value={item.avatarUrl || ""}
                onChange={(url) => updateItem({ avatarUrl: url })}
              />
            </div>
          </div>
        )}
      />

      {/* SECTION 2: CAROUSEL LAYOUT & PLAYBACK */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Carousel Controls & Layout
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Slides Per View
            </label>
            <select
              value={el.testimonialSlidesPerView || 2}
              onChange={(e) => updateProp("testimonialSlidesPerView", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value={1}>1 Testimonial</option>
              <option value={2}>2 Testimonials</option>
              <option value={3}>3 Testimonials</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Card Spacing (px)
            </label>
            <input
              type="number"
              min={0}
              max={40}
              value={el.testimonialGap ?? 20}
              onChange={(e) => updateProp("testimonialGap", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Autoplay
            </label>
            <input
              type="checkbox"
              checked={el.testimonialAutoplay !== false}
              onChange={(e) => updateProp("testimonialAutoplay", e.target.checked)}
              className="accent-emerald-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Infinite Loop
            </label>
            <input
              type="checkbox"
              checked={el.testimonialLoop !== false}
              onChange={(e) => updateProp("testimonialLoop", e.target.checked)}
              className="accent-emerald-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Nav Arrows
            </label>
            <input
              type="checkbox"
              checked={el.testimonialShowNav !== false}
              onChange={(e) => updateProp("testimonialShowNav", e.target.checked)}
              className="accent-emerald-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Pagination Dots
            </label>
            <input
              type="checkbox"
              checked={el.testimonialShowDots !== false}
              onChange={(e) => updateProp("testimonialShowDots", e.target.checked)}
              className="accent-emerald-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: STYLING & COLORS */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Styling & Colors
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Card Background
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.testimonialCardBg || "#ffffff"}
                onChange={(e) => updateProp("testimonialCardBg", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.testimonialCardBg || "#ffffff"}
                onChange={(e) => updateProp("testimonialCardBg", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Border Radius
            </label>
            <select
              value={el.testimonialCardBorderRadius || "16px"}
              onChange={(e) => updateProp("testimonialCardBorderRadius", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="0px">Square (0px)</option>
              <option value="8px">Rounded Small (8px)</option>
              <option value="16px">Rounded Large (16px)</option>
              <option value="24px">Extra Curved (24px)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Star Rating Color
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.testimonialStarColor || "#f59e0b"}
                onChange={(e) => updateProp("testimonialStarColor", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.testimonialStarColor || "#f59e0b"}
                onChange={(e) => updateProp("testimonialStarColor", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Text Color
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.testimonialTextColor || "#1e293b"}
                onChange={(e) => updateProp("testimonialTextColor", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.testimonialTextColor || "#1e293b"}
                onChange={(e) => updateProp("testimonialTextColor", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 23. Nested Carousel Inspector (F-189)
export function NestedCarouselWidgetInspector({
  el,
  updateProp,
  setSelectedId
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
  setSelectedId?: (id: string) => void;
}) {
  const children = el.children || [];

  return (
    <div className="space-y-4">
      {/* Carousel Settings */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Carousel Controls & Layout
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Slides Per View
            </label>
            <select
              value={el.nestedCarouselSlidesPerView || 1}
              onChange={(e) => updateProp("nestedCarouselSlidesPerView", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value={1}>1 Slide</option>
              <option value={2}>2 Slides</option>
              <option value={3}>3 Slides</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Card Gap (px)
            </label>
            <input
              type="number"
              value={el.nestedCarouselGap ?? 20}
              onChange={(e) => updateProp("nestedCarouselGap", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Border Radius
            </label>
            <select
              value={el.nestedCarouselBorderRadius || "16px"}
              onChange={(e) => updateProp("nestedCarouselBorderRadius", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value="0px">Square (0px)</option>
              <option value="8px">Rounded (8px)</option>
              <option value="16px">Large (16px)</option>
              <option value="24px">X-Large (24px)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Autoplay Speed (ms)
            </label>
            <input
              type="number"
              step={500}
              min={1000}
              value={el.nestedCarouselAutoplaySpeed || 5000}
              onChange={(e) => updateProp("nestedCarouselAutoplaySpeed", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Autoplay
            </label>
            <input
              type="checkbox"
              checked={el.nestedCarouselAutoplay !== false}
              onChange={(e) => updateProp("nestedCarouselAutoplay", e.target.checked)}
              className="accent-indigo-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Infinite Loop
            </label>
            <input
              type="checkbox"
              checked={el.nestedCarouselLoop !== false}
              onChange={(e) => updateProp("nestedCarouselLoop", e.target.checked)}
              className="accent-indigo-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Nav Arrows
            </label>
            <input
              type="checkbox"
              checked={el.nestedCarouselShowNav !== false}
              onChange={(e) => updateProp("nestedCarouselShowNav", e.target.checked)}
              className="accent-indigo-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Pagination Dots
            </label>
            <input
              type="checkbox"
              checked={el.nestedCarouselShowDots !== false}
              onChange={(e) => updateProp("nestedCarouselShowDots", e.target.checked)}
              className="accent-indigo-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Slide Containers Manager */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Slide Containers ({children.length})
          </span>

          <button
            type="button"
            onClick={() => {
              const genId = "cont_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
              const newSlide: EditorElement = {
                id: genId,
                type: "container",
                content: `Slide ${children.length + 1} Container`,
                layout: { direction: "column", justifyContent: "center", alignItems: "center", gap: 12 },
                styles: {
                  width: "100%",
                  backgroundColor: "#ffffff",
                  paddingTop: "32px",
                  paddingRight: "32px",
                  paddingBottom: "32px",
                  paddingLeft: "32px",
                  borderRadius: "16px",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "#e2e8f0",
                },
                children: [
                  {
                    id: "head_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
                    type: "heading",
                    content: `New Slide Container #${children.length + 1}`,
                    styles: { fontSize: "24px", fontWeight: "700", color: "#0f172a", textAlign: "center" },
                  },
                  {
                    id: "txt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
                    type: "text",
                    content: "Drop any elements or edit this container slide.",
                    styles: { fontSize: "14px", color: "#64748b", textAlign: "center", marginTop: "6px" },
                  },
                ],
              };
              updateProp("children", [...children, newSlide]);
            }}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 transition cursor-pointer"
          >
            + Add Slide
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {children.map((slide, sIdx) => (
            <div
              key={slide.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-50 font-bold text-indigo-700 text-[10px]">
                  #{sIdx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedId && setSelectedId(slide.id)}
                  className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline text-left truncate max-w-[120px]"
                  title="Click to select & edit slide container"
                >
                  {slide.content || `Slide #${sIdx + 1}`}
                </button>
                <span className="text-[10px] text-slate-400">({(slide.children || []).length} items)</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId && setSelectedId(slide.id)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                  title="Select Slide Container"
                >
                  Edit ✏️
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (children.length <= 1) return;
                    const copy = children.filter((_, idx) => idx !== sIdx);
                    updateProp("children", copy);
                  }}
                  disabled={children.length <= 1}
                  className="rounded p-1 text-[10px] font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  title="Delete Slide"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 24. Loop Carousel Inspector (F-190)
export function LoopCarouselWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const items = el.loopCarouselItems || [];

  return (
    <div className="space-y-4">
      {/* SECTION 1: ITEMS MANAGEMENT */}
      <UniversalItemManager<LoopCarouselItem>
        title="Loop Carousel Cards"
        items={items}
        onUpdate={(newItems) => updateProp("loopCarouselItems", newItems)}
        createDefaultItem={() => ({
          id: "item_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          title: `New Card Item #${items.length + 1}`,
          description: "Add details for this loop carousel slide.",
          badge: "FEATURE",
          buttonText: "Learn More",
          linkUrl: "#",
        })}
        getItemHeaderLabel={(item) => item.title || "Card Slide"}
        renderItemFields={(item, idx, updateItem) => (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Title</label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateItem({ title: e.target.value })}
                  placeholder="Card title..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Badge / Tag</label>
                <input
                  type="text"
                  value={item.badge || ""}
                  onChange={(e) => updateItem({ badge: e.target.value })}
                  placeholder="e.g. NEW, PRO"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Description</label>
              <textarea
                rows={2}
                value={item.description || ""}
                onChange={(e) => updateItem({ description: e.target.value })}
                placeholder="Card details..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <ImagePickerControl
                label="Card Image"
                value={item.imageUrl || ""}
                onChange={(url) => updateItem({ imageUrl: url })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Button Label</label>
                <input
                  type="text"
                  value={item.buttonText || ""}
                  onChange={(e) => updateItem({ buttonText: e.target.value })}
                  placeholder="Learn More..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Link URL</label>
                <input
                  type="text"
                  value={item.linkUrl || "#"}
                  onChange={(e) => updateItem({ linkUrl: e.target.value })}
                  placeholder="#"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      />

      {/* SECTION 2: CONTROLS & LAYOUT */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Carousel Controls & Layout
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Transition Effect
            </label>
            <select
              value={el.loopCarouselTransition || "slide"}
              onChange={(e) => updateProp("loopCarouselTransition", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
            >
              <option value="slide">Slide Track</option>
              <option value="fade">Cross Fade</option>
              <option value="continuous">Continuous Ticker</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Slides Per View
            </label>
            <select
              value={el.loopCarouselSlidesPerView || 3}
              onChange={(e) => updateProp("loopCarouselSlidesPerView", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
            >
              <option value={1}>1 Slide</option>
              <option value={2}>2 Slides</option>
              <option value={3}>3 Slides</option>
              <option value={4}>4 Slides</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Card Gap (px)
            </label>
            <input
              type="number"
              value={el.loopCarouselGap ?? 20}
              onChange={(e) => updateProp("loopCarouselGap", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Autoplay Speed (ms)
            </label>
            <input
              type="number"
              step={500}
              min={1000}
              value={el.loopCarouselAutoplaySpeed || 3500}
              onChange={(e) => updateProp("loopCarouselAutoplaySpeed", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Card Background
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.loopCarouselCardBg || "#ffffff"}
                onChange={(e) => updateProp("loopCarouselCardBg", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.loopCarouselCardBg || "#ffffff"}
                onChange={(e) => updateProp("loopCarouselCardBg", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Border Radius
            </label>
            <select
              value={el.loopCarouselBorderRadius || "16px"}
              onChange={(e) => updateProp("loopCarouselBorderRadius", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
            >
              <option value="0px">Square (0px)</option>
              <option value="8px">Rounded (8px)</option>
              <option value="16px">Large (16px)</option>
              <option value="24px">X-Large (24px)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Autoplay
            </label>
            <input
              type="checkbox"
              checked={el.loopCarouselAutoplay !== false}
              onChange={(e) => updateProp("loopCarouselAutoplay", e.target.checked)}
              className="accent-purple-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Infinite Loop
            </label>
            <input
              type="checkbox"
              checked={el.loopCarouselLoop !== false}
              onChange={(e) => updateProp("loopCarouselLoop", e.target.checked)}
              className="accent-purple-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Nav Arrows
            </label>
            <input
              type="checkbox"
              checked={el.loopCarouselShowNav !== false}
              onChange={(e) => updateProp("loopCarouselShowNav", e.target.checked)}
              className="accent-purple-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-700 cursor-pointer">
              Pagination Dots
            </label>
            <input
              type="checkbox"
              checked={el.loopCarouselShowDots !== false}
              onChange={(e) => updateProp("loopCarouselShowDots", e.target.checked)}
              className="accent-purple-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 25. Table of Contents Inspector (F-191)
export function TOCWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Settings & Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Table of Contents Settings
        </span>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
            Header Title
          </label>
          <input
            type="text"
            value={el.tocTitle !== undefined ? el.tocTitle : "Table of Contents"}
            onChange={(e) => updateProp("tocTitle", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
          <label className="text-[11px] font-semibold text-slate-700 cursor-pointer">Show Title Header</label>
          <input
            type="checkbox"
            checked={el.tocShowTitle !== false}
            onChange={(e) => updateProp("tocShowTitle", e.target.checked)}
            className="accent-teal-600 rounded cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Marker Style
            </label>
            <select
              value={el.tocMarkerStyle || "bullet"}
              onChange={(e) => updateProp("tocMarkerStyle", e.target.value as "none" | "bullet" | "number" | "line" | "badge")}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="bullet">Bullet Dots</option>
              <option value="number">Numbers (1, 2, 3)</option>
              <option value="line">Accent Line</option>
              <option value="badge">Tag Badge (H1, H2)</option>
              <option value="none">Plain Text</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Alignment
            </label>
            <select
              value={el.tocAlignment || "left"}
              onChange={(e) => updateProp("tocAlignment", e.target.value as "left" | "center" | "right")}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Indent / Level (px)
            </label>
            <input
              type="number"
              value={el.tocIndentPerLevel ?? 14}
              onChange={(e) => updateProp("tocIndentPerLevel", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Item Gap (px)
            </label>
            <input
              type="number"
              value={el.tocItemGap ?? 8}
              onChange={(e) => updateProp("tocItemGap", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Included Heading Levels */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
          Included Heading Tags
        </span>
        <div className="grid grid-cols-3 gap-2">
          {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((lvl) => {
            const currentIncluded = el.tocIncludedLevels || ["h1", "h2", "h3", "h4", "h5", "h6"];
            const isChecked = currentIncluded.includes(lvl);
            return (
              <label key={lvl} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    let nextLevels: ("h1" | "h2" | "h3" | "h4" | "h5" | "h6")[];
                    if (e.target.checked) {
                      nextLevels = [...currentIncluded, lvl];
                    } else {
                      nextLevels = currentIncluded.filter((l) => l !== lvl);
                    }
                    updateProp("tocIncludedLevels", nextLevels);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
                <span className="uppercase">{lvl}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Colors & Appearance */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Color Customization
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Card Background</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.tocCardBg || "#f8fafc"}
                onChange={(e) => updateProp("tocCardBg", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.tocCardBg || "#f8fafc"}
                onChange={(e) => updateProp("tocCardBg", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Border Color</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.tocBorderColor || "#e2e8f0"}
                onChange={(e) => updateProp("tocBorderColor", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.tocBorderColor || "#e2e8f0"}
                onChange={(e) => updateProp("tocBorderColor", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Text Color</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.tocTextColor || "#334155"}
                onChange={(e) => updateProp("tocTextColor", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.tocTextColor || "#334155"}
                onChange={(e) => updateProp("tocTextColor", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Accent / Marker</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.tocHoverColor || "#2563eb"}
                onChange={(e) => updateProp("tocHoverColor", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={el.tocHoverColor || "#2563eb"}
                onChange={(e) => updateProp("tocHoverColor", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 24. Facebook Widgets Inspector (Page, Button, Embed, Comments Unified)
export function FacebookWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const mode = el.facebookMode || (
    el.type === "facebook-button" ? "button" :
    el.type === "facebook-embed" ? "embed" :
    el.type === "facebook-comments" ? "comments" : "page"
  );

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
        <span>📘</span> Facebook Widget Integration
      </h3>

      {/* Mode Selector Tabs */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Facebook Mode</label>
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => updateProp("facebookMode", "page")}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg transition ${
              mode === "page" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            📄 Page Feed
          </button>
          <button
            type="button"
            onClick={() => updateProp("facebookMode", "button")}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg transition ${
              mode === "button" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            👍 Like / Share
          </button>
          <button
            type="button"
            onClick={() => updateProp("facebookMode", "embed")}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg transition ${
              mode === "embed" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            📌 Post Embed
          </button>
          <button
            type="button"
            onClick={() => updateProp("facebookMode", "comments")}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg transition ${
              mode === "comments" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            💬 Comments
          </button>
        </div>
      </div>

      {/* MODE 1: PAGE FEED */}
      {mode === "page" && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Facebook Page URL</label>
            <input
              type="text"
              value={el.facebookPageUrl || el.facebookUrl || "https://facebook.com/facebook"}
              onChange={(e) => {
                updateProp("facebookPageUrl", e.target.value);
                updateProp("facebookUrl", e.target.value);
              }}
              placeholder="https://facebook.com/your-page"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tabs to Display</label>
            <input
              type="text"
              value={el.facebookTabs || "timeline"}
              onChange={(e) => updateProp("facebookTabs", e.target.value)}
              placeholder="e.g. timeline, events, messages"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Width (px)</label>
              <input
                type="number"
                value={el.facebookWidth || 340}
                onChange={(e) => updateProp("facebookWidth", parseInt(e.target.value, 10) || 340)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Height (px)</label>
              <input
                type="number"
                value={el.facebookHeight || 500}
                onChange={(e) => updateProp("facebookHeight", parseInt(e.target.value, 10) || 500)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={el.facebookSmallHeader ?? false}
                onChange={(e) => updateProp("facebookSmallHeader", e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Use Small Header
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={el.facebookHideCover ?? false}
                onChange={(e) => updateProp("facebookHideCover", e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Hide Cover Photo
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={el.facebookShowFacepile ?? true}
                onChange={(e) => updateProp("facebookShowFacepile", e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Show Friend's Faces (Facepile)
            </label>
          </div>
        </div>
      )}

      {/* MODE 2: LIKE / SHARE BUTTON */}
      {mode === "button" && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target URL</label>
            <input
              type="text"
              value={el.fbButtonUrl || el.facebookUrl || "https://facebook.com"}
              onChange={(e) => {
                updateProp("fbButtonUrl", e.target.value);
                updateProp("facebookUrl", e.target.value);
              }}
              placeholder="https://facebook.com/your-page"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Button Action</label>
            <select
              value={el.fbButtonAction || "like"}
              onChange={(e) => updateProp("fbButtonAction", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
            >
              <option value="like">👍 Like & Share</option>
              <option value="share">🔗 Share Only</option>
              <option value="follow">➕ Follow Page</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Button Label Text</label>
            <input
              type="text"
              value={el.fbButtonLabel || "Like Page"}
              onChange={(e) => updateProp("fbButtonLabel", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Button Size</label>
              <select
                value={el.fbButtonSize || "md"}
                onChange={(e) => updateProp("fbButtonSize", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alignment</label>
              <select
                value={el.fbButtonAlignment || "left"}
                onChange={(e) => updateProp("fbButtonAlignment", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: POST EMBED */}
      {mode === "embed" && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Facebook Post or Video URL</label>
            <input
              type="text"
              value={el.fbEmbedUrl || el.facebookUrl || "https://www.facebook.com/20531316728/posts/10154009968286729/"}
              onChange={(e) => {
                updateProp("fbEmbedUrl", e.target.value);
                updateProp("facebookUrl", e.target.value);
              }}
              placeholder="https://facebook.com/username/posts/123456"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Embed Width</label>
              <input
                type="text"
                value={el.fbEmbedWidth || "100%"}
                onChange={(e) => updateProp("fbEmbedWidth", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Embed Height</label>
              <input
                type="text"
                value={el.fbEmbedHeight || "450px"}
                onChange={(e) => updateProp("fbEmbedHeight", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: COMMENTS BOX */}
      {mode === "comments" && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Page URL for Discussion</label>
            <input
              type="text"
              value={el.fbCommentsUrl || el.facebookUrl || "https://facebook.com"}
              onChange={(e) => {
                updateProp("fbCommentsUrl", e.target.value);
                updateProp("facebookUrl", e.target.value);
              }}
              placeholder="https://yourwebsite.com/page"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Comments Shown</label>
              <input
                type="number"
                value={el.fbCommentsNumPosts || 5}
                onChange={(e) => updateProp("fbCommentsNumPosts", parseInt(e.target.value, 10) || 5)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Box Width</label>
              <input
                type="text"
                value={el.fbCommentsWidth || "100%"}
                onChange={(e) => updateProp("fbCommentsWidth", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 25. Blockquote Inspector
export function BlockquoteWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
        <span>💬</span> Blockquote Settings
      </h3>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Quote Text</label>
        <textarea
          rows={3}
          value={el.quoteText || el.content || "Creativity is intelligence having fun."}
          onChange={(e) => {
            updateProp("quoteText", e.target.value);
            updateProp("content", e.target.value);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Author Name</label>
          <input
            type="text"
            value={el.quoteAuthor || "Albert Einstein"}
            onChange={(e) => updateProp("quoteAuthor", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Citation / Source</label>
          <input
            type="text"
            value={el.quoteCitation || "Theoretical Physicist"}
            onChange={(e) => updateProp("quoteCitation", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          />
        </div>
      </div>
    </div>
  );
}

// 26. Payment Widgets Inspector (PayPal & Stripe)
export function PaymentWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
        <span>💳</span> Payment Gateway Configuration ({el.type === "paypal" ? "PayPal" : "Stripe"})
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Amount</label>
          <input
            type="text"
            value={el.paymentAmount || "49.00"}
            onChange={(e) => updateProp("paymentAmount", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
          <select
            value={el.paymentCurrency || "USD"}
            onChange={(e) => updateProp("paymentCurrency", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="INR">INR (₹)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Item / Product Title</label>
        <input
          type="text"
          value={el.paymentProductTitle || "Digital Access Pass"}
          onChange={(e) => updateProp("paymentProductTitle", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Button Label</label>
        <input
          type="text"
          value={el.paymentButtonText || `Pay Now with ${el.type === "paypal" ? "PayPal" : "Stripe"}`}
          onChange={(e) => updateProp("paymentButtonText", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
        />
      </div>
    </div>
  );
}

// 27. WooCommerce Widget Inspector (Dynamic & Data-Bound)
export function WooCommerceWidgetInspector({
  el,
  updateProp,
  siteProducts,
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
  siteProducts?: SiteProduct[];
}) {
  const currentImg = el.src || el.productImage || (el.type === "wc-product-images" ? el.content : "") || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600";
  const productSource = el.productSource || (el.productId ? "site" : "manual");
  const connectedProduct = siteProducts?.find(p => p.id === el.productId);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateProp("src", url);
      updateProp("productImage", url);
      updateProp("content", url);
    }
  };

  return (
    <div className="space-y-3.5 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
        <span>🛍️</span> WooCommerce Product Connection
      </h3>

      {/* Product Connection Mode */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 space-y-2.5">
        <label className="block text-[10px] font-bold text-purple-900 uppercase tracking-wider">
          Data Source Mode
        </label>
        <select
          value={productSource}
          onChange={(e) => {
            const mode = e.target.value as "site" | "manual";
            updateProp("productSource", mode);
          }}
          className="w-full rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-purple-900 outline-none"
        >
          <option value="site">🔗 Connected Store Product (Dynamic)</option>
          <option value="manual">✏️ Custom / Static Override Data</option>
        </select>

        {productSource === "site" && (
          <div className="space-y-2 pt-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase">
              Select Connected Product
            </label>
            <select
              value={el.productId || ""}
              onChange={(e) => {
                const prodId = e.target.value;
                updateProp("productId", prodId);
                const prod = siteProducts?.find(p => p.id === prodId);
                if (prod) {
                  if (prod.image) {
                    updateProp("src", prod.image);
                    updateProp("productImage", prod.image);
                  }
                  updateProp("wooProductTitle", prod.name);
                  updateProp("wooPrice", prod.price);
                  if (prod.rating) updateProp("wooRating", prod.rating);
                }
              }}
              className="w-full rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="">-- Choose Product --</option>
              {(siteProducts || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price})
                </option>
              ))}
            </select>

            {connectedProduct ? (
              <div className="flex items-center gap-2 bg-purple-100/70 p-2 rounded-lg border border-purple-200 text-xs">
                <span className="text-emerald-600 font-extrabold text-sm">✓</span>
                <div>
                  <span className="font-bold text-purple-900 block">{connectedProduct.name}</span>
                  <span className="text-[10px] text-purple-700">{connectedProduct.price} • Rating: {connectedProduct.rating || 5}★</span>
                </div>
              </div>
            ) : el.productId ? (
              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] font-bold text-amber-700">
                ⚠️ Connected product ID "{el.productId}" no longer exists in store catalog.
              </div>
            ) : (
              <p className="text-[10px] text-purple-600 italic">Select a product from the list above to bind widget data dynamically.</p>
            )}
          </div>
        )}
      </div>

      {/* Manual Product Image Uploader */}
      <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 space-y-2.5">
        <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center justify-between">
          <span>🖼️ Product Image</span>
          <span className="text-[10px] text-purple-600 font-normal">Local File or URL</span>
        </label>

        {/* Thumbnail Preview */}
        {currentImg && (
          <div className="relative group w-full h-24 rounded-lg overflow-hidden border border-purple-200 bg-white">
            <img src={currentImg} alt="Product Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <label className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-800 rounded-md shadow cursor-pointer hover:bg-slate-100">
                Change Image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
              </label>
            </div>
          </div>
        )}

        {/* File Upload Button */}
        <div>
          <label className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-purple-300 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition">
            <span>📁 Upload / Select Local Image File</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
          </label>
        </div>

        {/* Remote URL Input */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Or Enter Product Image URL</label>
          <input
            type="text"
            value={el.src || el.productImage || ""}
            onChange={(e) => {
              const val = e.target.value;
              updateProp("src", val);
              updateProp("productImage", val);
              updateProp("content", val);
            }}
            placeholder="https://example.com/product-image.jpg"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Product Title / Text Content</label>
        <input
          type="text"
          value={el.content && !el.content.startsWith("http") && !el.content.startsWith("blob:") ? el.content : (el.wooProductTitle || "Premium Wireless Headphones")}
          onChange={(e) => {
            updateProp("wooProductTitle", e.target.value);
            if (el.type !== "wc-product-images") {
              updateProp("content", e.target.value);
            }
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Price / Content</label>
          <input
            type="text"
            value={el.wooPrice || "$199.99"}
            onChange={(e) => {
              updateProp("wooPrice", e.target.value);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Rating</label>
          <select
            value={el.wooRating || 5}
            onChange={(e) => updateProp("wooRating", parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
          >
            <option value={5}>5 Stars</option>
            <option value={4}>4 Stars</option>
            <option value={3}>3 Stars</option>
            <option value={2}>2 Stars</option>
            <option value={1}>1 Star</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// 28. Audio Playlist Inspector - Manual Audio File & Track Manager
export function AudioPlaylistInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const tracks = el.audioPlaylistTracks && el.audioPlaylistTracks.length > 0
    ? el.audioPlaylistTracks
    : [
        { id: "tr-1", title: "01. Ambient Solar Echoes", artist: "ForgeStudio Soundscapes", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", duration: "06:12" },
        { id: "tr-2", title: "02. Deep Focus Flow", artist: "Acoustic Frequency Labs", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", duration: "07:05" },
        { id: "tr-3", title: "03. Midnight Synthesizer", artist: "Cybernetic Wave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", duration: "05:48" }
      ];

  return (
    <div className="space-y-4">
      {/* Player Styling Options */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎨</span> Player Styling
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Card Background</label>
            <input
              type="color"
              value={el.audioPlaylistCardBg || "#0f172a"}
              onChange={(e) => updateProp("audioPlaylistCardBg", e.target.value)}
              className="h-8 w-full cursor-pointer rounded border border-slate-300 bg-white p-0.5"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Accent Color</label>
            <input
              type="color"
              value={el.audioPlaylistAccentColor || "#38bdf8"}
              onChange={(e) => updateProp("audioPlaylistAccentColor", e.target.value)}
              className="h-8 w-full cursor-pointer rounded border border-slate-300 bg-white p-0.5"
            />
          </div>
        </div>
      </div>

      {/* Manual Audio Track Manager */}
      <UniversalItemManager<{ id: string; title: string; artist?: string; url: string; duration?: string }>
        title="Audio Playlist Tracks (Manual Add)"
        items={tracks}
        onUpdate={(newTracks) => updateProp("audioPlaylistTracks", newTracks)}
        createDefaultItem={() => ({
          id: "audio_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          title: "New Custom Audio Track",
          artist: "Artist / Composer",
          url: "",
          duration: "03:30"
        })}
        getItemHeaderLabel={(track) => track.title || "Untitled Audio Track"}
        renderItemFields={(track, _idx, updateTrack) => (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Track Title</label>
              <input
                type="text"
                value={track.title}
                onChange={(e) => updateTrack({ title: e.target.value })}
                placeholder="e.g. Podcast Episode #1"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Artist / Author</label>
              <input
                type="text"
                value={track.artist || ""}
                onChange={(e) => updateTrack({ artist: e.target.value })}
                placeholder="e.g. Studio Recording"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Audio File / Stream URL</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={track.url || ""}
                  onChange={(e) => updateTrack({ url: e.target.value })}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    triggerImagePicker((uploadedUrl) => {
                      updateTrack({ url: uploadedUrl });
                    });
                  }}
                  className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition cursor-pointer flex items-center gap-1"
                >
                  📁 Select Audio
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Supports local audio file upload (.mp3, .wav, .aac, .ogg) or HTTP stream URL.</p>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Duration String</label>
              <input
                type="text"
                value={track.duration || "03:30"}
                onChange={(e) => updateTrack({ duration: e.target.value })}
                placeholder="e.g. 04:15"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}

// 29. PayPal Widget Inspector (F-200 / F-217)
export function PayPalWidgetInspector({
  el,
  updateProp
}: {
  el: EditorElement;
  updateProp: (key: string, val: any) => void;
}) {
  const currentItemImg = el.paypalItemImage || el.productImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600";

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateProp("paypalItemImage", url);
      updateProp("productImage", url);
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
        <span>💳</span> PayPal Express Checkout Integration
      </h3>

      {/* 1. Environment & Mode */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2.5">
        <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center justify-between">
          <span>⚡ Environment & Sandbox</span>
          <span className="text-[10px] text-amber-700 font-bold">{el.paypalEnv === "live" ? "🔴 LIVE PRODUCTION" : "🟡 SANDBOX DEV"}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateProp("paypalEnv", "sandbox")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
              el.paypalEnv !== "live"
                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            🟡 Sandbox (Test Mode)
          </button>
          <button
            type="button"
            onClick={() => updateProp("paypalEnv", "live")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
              el.paypalEnv === "live"
                ? "bg-red-600 text-white border-red-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            🔴 Live (Production)
          </button>
        </div>
      </div>

      {/* 2. Product & Item Setup */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">📦 Product & Item Pricing</h4>

        {/* Manual Product Image Setup */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Manual Product Image</label>
          <div className="flex items-center gap-2 mb-2">
            {currentItemImg && (
              <img src={currentItemImg} alt="Item Preview" className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" />
            )}
            <label className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-100 cursor-pointer transition">
              <span>📁 Upload Local Image File</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} />
            </label>
          </div>
          <input
            type="text"
            value={el.paypalItemImage || ""}
            onChange={(e) => {
              updateProp("paypalItemImage", e.target.value);
              updateProp("productImage", e.target.value);
            }}
            placeholder="Or enter remote image URL (https://...)"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Button Display Text</label>
          <input
            type="text"
            value={el.paypalText || "Pay Now with PayPal"}
            onChange={(e) => updateProp("paypalText", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Product / Item Name</label>
          <input
            type="text"
            value={el.paypalItemName || "Digital Product"}
            onChange={(e) => updateProp("paypalItemName", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Item Description</label>
          <input
            type="text"
            value={el.paypalItemDescription || ""}
            onChange={(e) => updateProp("paypalItemDescription", e.target.value)}
            placeholder="Short product description..."
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Amount</label>
            <input
              type="text"
              value={el.paypalAmount || "19.99"}
              onChange={(e) => updateProp("paypalAmount", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-800 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Currency</label>
            <select
              value={el.paypalCurrency || "USD"}
              onChange={(e) => updateProp("paypalCurrency", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Qty</label>
            <input
              type="number"
              min={1}
              value={el.paypalQuantity || 1}
              onChange={(e) => updateProp("paypalQuantity", Math.max(1, parseInt(e.target.value || "1", 10)))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Button Styling */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">🎨 Button Styling</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Shape</label>
            <select
              value={el.paypalButtonShape || "pill"}
              onChange={(e) => updateProp("paypalButtonShape", e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="pill">Pill (Rounded)</option>
              <option value="rect">Rectangle</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Size</label>
            <select
              value={el.paypalButtonSize || "md"}
              onChange={(e) => updateProp("paypalButtonSize", e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alignment</label>
            <select
              value={el.paypalAlignment || "left"}
              onChange={(e) => updateProp("paypalAlignment", e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Background</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={el.paypalBgColor || "#FFC439"}
                onChange={(e) => updateProp("paypalBgColor", e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0.5 shrink-0"
              />
              <input
                type="text"
                value={el.paypalBgColor || "#FFC439"}
                onChange={(e) => updateProp("paypalBgColor", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Post-Payment Behavior */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">🔔 Success & Cancellation Actions</h4>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Success Action</label>
          <select
            value={el.paypalSuccessAction || "message"}
            onChange={(e) => updateProp("paypalSuccessAction", e.target.value as any)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
          >
            <option value="message">Display Success Card in Page</option>
            <option value="redirect">Redirect to Thank You Page</option>
          </select>
        </div>

        {el.paypalSuccessAction === "redirect" ? (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Redirect URL</label>
            <input
              type="text"
              value={el.paypalSuccessRedirectUrl || ""}
              onChange={(e) => updateProp("paypalSuccessRedirectUrl", e.target.value)}
              placeholder="https://example.com/thank-you"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Success Message</label>
            <input
              type="text"
              value={el.paypalSuccessMessage || "🎉 Payment received! Thank you for your order."}
              onChange={(e) => updateProp("paypalSuccessMessage", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

