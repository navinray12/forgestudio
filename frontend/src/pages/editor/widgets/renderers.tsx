
import PopupManagerModal from "./components/PopupManagerModal";
import PopupRuntimePreview from "./components/PopupRuntimePreview";
import DeveloperModal from "./components/DeveloperModal";
import SaveTemplateDialog from "../../features/templates/components/SaveTemplateDialog";
import ReplaceTemplateDialog from "../../features/templates/components/ReplaceTemplateDialog";
import ImportWebsiteKitDialog from "../../features/templates/components/ImportWebsiteKitDialog";
import RevisionHistoryPanel from "../../features/revision-history/components/RevisionHistoryPanel";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Monitor, Smartphone, Tablet, Undo, Redo, Save, Eye, Settings, Plus, Trash2, Copy,
  ChevronDown, ChevronRight, Layers, Type, Image as ImageIcon, Box, Grid, Flex,
  Sliders, Palette, FileText, Globe, Code, Play, Check, X, Move, Lock, Unlock,
  HelpCircle, ExternalLink, RefreshCw, Database, Server, Cpu, HardDrive, Key,
  Mail, MessageSquare, Phone, User, Calendar, MapPin, Search, Star, Share2,
  AlertCircle, Info, Download, Upload, Zap, Shield, Sparkles, Layout, Compass,
  Terminal, ShieldCheck, StickyNote, FormInput, Link as LinkIcon, Navigation, ArrowRight, Menu
} from "lucide-react";

// ==========================================
// Types & Interfaces
// ==========================================


import {
  ElementType,
  EditorElement,
  ElementStyles,
  ContainerLayout,
  DeviceMode,
  SlideItem,
  FormFieldItem,
  NavMenuItem,
  NavSubmenuItem,
  PricingPlan,
  PriceListItem,
  GalleryImageItem,
  TestimonialItem,
  ReviewItem,
  LoopCarouselItem,
  PlaylistItem,
  MediaCarouselItem,
  ImageCarouselItem,
  ShareNetworkType,
  PostItem
} from "../types";
import {
  resolveImageUrl,
  getEffectiveStyle,
  getMergedStyles,
  getMergedLayout
} from "../utils";
import { PRESET_SECTION_TEMPLATES } from "../defaults";

// ==========================================
// CANVAS WIDGET RUNTIME RENDERERS
// ==========================================

export const SlidesWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items = el.slidesItems && el.slidesItems.length > 0 ? el.slidesItems : [];
  const [currentIdx, setCurrentIdx] = useState(el.slidesActiveIndex ?? 0);

  useEffect(() => {
    if (el.slidesActiveIndex !== undefined && el.slidesActiveIndex >= 0 && el.slidesActiveIndex < items.length) {
      setCurrentIdx(el.slidesActiveIndex);
    }
  }, [el.slidesActiveIndex, items.length]);

  const autoplay = el.slidesAutoplay !== false;
  const intervalTime = el.slidesAutoplayInterval || 4000;
  const transition = el.slidesTransition || "slide";
  const height = el.slidesHeight || "450px";
  const align = el.slidesAlignment || "center";
  const showArrows = el.slidesShowArrows !== false;
  const showDots = el.slidesShowDots !== false;

  useEffect(() => {
    if (!autoplay || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % items.length);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [autoplay, items.length, intervalTime]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % items.length);
  };

  const handleDotClick = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIdx(idx);
  };

  const flexAlignClass = align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start text-left";
  const buttonJustifyClass = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
        <p className="text-sm font-bold text-slate-600">No Slides Created</p>
        <p className="text-xs text-slate-400 mt-1">Use the right properties panel to add slide items.</p>
      </div>
    );
  }

  const validIndex = Math.max(0, Math.min(currentIdx, items.length - 1));
  const currentSlide = items[validIndex] || items[0];

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-lg transition-all select-none"
      style={{
        width: "100%",
        height: height,
        backgroundColor: currentSlide.bgColor || "#0f172a",
        boxSizing: "border-box",
      }}
    >
      {/* Slide Background Image & Overlay */}
      {items.map((slide, idx) => {
        const isActive = idx === validIndex;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              isActive ? "opacity-100 z-10 translate-x-0 pointer-events-auto" : transition === "fade" ? "opacity-0 z-0 pointer-events-none" : "opacity-0 z-0 translate-x-8 pointer-events-none"
            }`}
            style={{
              backgroundImage: slide.bgImage ? `url(${slide.bgImage})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: slide.bgColor || "#0f172a",
            }}
          >
            {/* Dark Gradient Overlay for optimal contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />

            {/* Slide Content */}
            <div className={`relative z-20 flex h-full flex-col justify-center px-8 sm:px-14 py-10 ${flexAlignClass}`}>
              <div className="max-w-2xl">
                <h2
                  className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md"
                  style={{ fontFamily: mergedStyles.fontFamily }}
                >
                  {slide.title}
                </h2>

                {slide.description && (
                  <p
                    className="mt-3 text-xs sm:text-base text-slate-200 leading-relaxed font-normal drop-shadow-xs max-w-xl"
                    style={{ fontFamily: mergedStyles.fontFamily }}
                  >
                    {slide.description}
                  </p>
                )}

                {slide.buttonText && (
                  <div className={`mt-6 flex items-center ${buttonJustifyClass}`}>
                    <a
                      href={slide.buttonUrl || "#"}
                      onClick={(e) => {
                        if (!isPreview) e.preventDefault();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-slate-900 shadow-xl transition-all duration-300 hover:bg-slate-100 hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <span>{slide.buttonText}</span>
                      <svg className="h-4 w-4 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      {showArrows && items.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-3 top-1/2 z-40 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/80 hover:scale-110 active:scale-95 shadow-lg border border-white/20 cursor-pointer"
            title="Previous Slide"
          >
            <svg className="h-5 w-5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-3 top-1/2 z-40 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/80 hover:scale-110 active:scale-95 shadow-lg border border-white/20 cursor-pointer"
            title="Next Slide"
          >
            <svg className="h-5 w-5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Navigation Dots Indicator */}
      {showDots && items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1.5 border border-white/10">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => handleDotClick(idx, e)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === validIndex ? "w-7 bg-white" : "w-2.5 bg-white/40 hover:bg-white/80"
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FormWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const fields = el.formFields || [];
  const columns = el.formLayoutColumns || 2;
  const gap = el.formFieldGap !== undefined ? el.formFieldGap : 16;
  const showLabels = el.formShowLabels !== false;
  const title = el.formTitle || "Get in Touch";
  const subtitle = el.formSubtitle || "Fill out the form below and our team will get back to you within 24 hours.";
  const submitText = el.formSubmitText || "Send Message";
  const successMsg = el.formSubmitSuccessMsg || "Thank you! Your message has been sent successfully.";
  const btnBg = el.formSubmitBtnBg || "#2563eb";
  const btnColor = el.formSubmitBtnColor || "#ffffff";
  const btnFullWidth = el.formSubmitBtnFullWidth !== false;
  const cardBg = el.formCardBg || "#ffffff";
  const cardBorder = el.formCardBorder || "#f1f5f9";

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitted(true);
  };

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center bg-slate-50/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-3">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <p className="text-base font-bold text-slate-700">Empty Form Widget</p>
        <p className="text-xs text-slate-400 mt-1">Use the properties panel on the right to add form fields.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        className="rounded-3xl border p-8 sm:p-12 text-center shadow-xl backdrop-blur-md transition-all duration-500 animate-in fade-in zoom-in-95"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
        }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-inner">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Submission Received!</h3>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">{successMsg}</p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-200 active:scale-95 cursor-pointer shadow-xs"
        >
          <span>Send Another Response</span>
          <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-3xl p-6 sm:p-10 shadow-xl border transition-all duration-300"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        boxSizing: "border-box",
      }}
    >
      {/* Form Header Title & Subtitle */}
      {(title || subtitle) && (
        <div className="mb-8">
          {title && (
            <h3
              className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight"
              style={{ fontFamily: mergedStyles.fontFamily }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className="mt-2 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed max-w-xl"
              style={{ fontFamily: mergedStyles.fontFamily }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Grid Fields */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2"
        style={{
          gap: `${gap}px`,
        }}
      >
        {fields.map((field) => {
          const isHalf = columns === 2 && field.width === "half";
          const colClass = isHalf ? "sm:col-span-1 col-span-1" : "sm:col-span-2 col-span-1";

          return (
            <div key={field.id} className={`${colClass} flex flex-col`}>
              {showLabels && (
                <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">
                  {field.label}
                  {field.required && <span className="text-red-500 font-extrabold ml-1">*</span>}
                </label>
              )}

              {/* Field Inputs */}
              {field.type === "textarea" ? (
                <textarea
                  rows={4}
                  required={field.required}
                  placeholder={field.placeholder || ""}
                  value={formData[field.id] || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300"
                />
              ) : field.type === "select" ? (
                <div className="relative">
                  <select
                    required={field.required}
                    value={formData[field.id] || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none transition duration-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300 cursor-pointer"
                  >
                    <option value="">{field.placeholder || "Select an option..."}</option>
                    {(field.options || []).map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5 text-xs font-medium text-slate-700 cursor-pointer transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    required={field.required}
                    checked={!!formData[field.id]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.checked }))}
                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>{field.placeholder || field.label}</span>
                </label>
              ) : field.type === "radio" ? (
                <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5">
                  {(field.options || ["Option 1", "Option 2"]).map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 text-xs font-medium text-slate-700 cursor-pointer transition hover:text-slate-900">
                      <input
                        type="radio"
                        name={`radio_${field.id}`}
                        required={field.required}
                        value={opt}
                        checked={formData[field.id] === opt}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : field.type === "tel" ? (
                <PhoneInput
                  id={`field_${field.id}`}
                  required={field.required}
                  value={formData[field.id] || ""}
                  onChange={(val) => setFormData((prev) => ({ ...prev, [field.id]: val.fullNumber }))}
                />
              ) : (
                <div className="relative flex items-center">
                  <input
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder || ""}
                    value={formData[field.id] || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300"
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Submit Button with Hover Arrow Animation */}
        <div className="col-span-1 sm:col-span-2 pt-4">
          <button
            type="submit"
            className={`group inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-xs sm:text-sm font-extrabold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
              btnFullWidth ? "w-full" : "w-auto"
            }`}
            style={{
              backgroundColor: btnBg,
              color: btnColor,
            }}
          >
            <span>{submitText}</span>
            <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
};

export const LoginWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const title = el.loginTitle || "Welcome Back";
  const subtitle = el.loginSubtitle || "Sign in to your account to access your workspace.";
  const emailLabel = el.loginEmailLabel || "Email Address";
  const emailPlaceholder = el.loginEmailPlaceholder || "name@example.com";
  const passwordLabel = el.loginPasswordLabel || "Password";
  const passwordPlaceholder = el.loginPasswordPlaceholder || "••••••••";
  const showRemember = el.loginShowRememberMe !== false;
  const showForgot = el.loginShowForgotPassword !== false;
  const forgotText = el.loginForgotPasswordText || "Forgot password?";
  const forgotUrl = el.loginForgotPasswordUrl || "#";
  const buttonText = el.loginButtonText || "Sign In";
  const buttonBg = el.loginButtonBg || "#2563eb";
  const buttonColor = el.loginButtonColor || "#ffffff";
  const cardBg = el.loginCardBg || "#ffffff";
  const cardBorder = el.loginCardBorder || "#f1f5f9";
  const showSocial = el.loginShowSocialButtons !== false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoggedIn(true);
  };

  if (loggedIn) {
    return (
      <div
        className="w-full max-w-md mx-auto rounded-3xl border p-8 sm:p-10 text-center shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
        }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4 shadow-inner">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Welcome Back!</h3>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          You have successfully logged in as <span className="font-bold text-slate-800">{email || "user@example.com"}</span>.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoggedIn(false);
            setEmail("");
            setPassword("");
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-200 active:scale-95 cursor-pointer shadow-xs"
        >
          <span>Sign Out / Reset</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md mx-auto rounded-3xl p-6 sm:p-10 shadow-xl border transition-all duration-300"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-xs">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>
        <h3
          className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
          style={{ fontFamily: mergedStyles.fontFamily }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="mt-2 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed"
            style={{ fontFamily: mergedStyles.fontFamily }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Social Login Options */}
      {showSocial && (
        <div className="space-y-3 mb-6">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3 px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 active:scale-98 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Or sign in with email
            </span>
          </div>
        </div>
      )}

      {/* Form Inputs */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">
            {emailLabel}
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-slate-400 pointer-events-none">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <input
              type="email"
              required
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-11 pr-4 py-3 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">
            {passwordLabel}
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-slate-400 pointer-events-none">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder={passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-11 pr-11 py-3 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        {(showRemember || showForgot) && (
          <div className="flex items-center justify-between pt-1 text-xs">
            {showRemember ? (
              <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
            ) : <div />}

            {showForgot && (
              <a
                href={forgotUrl}
                onClick={(e) => e.preventDefault()}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                {forgotText}
              </a>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="group flex w-full items-center justify-center gap-2.5 rounded-2xl px-8 py-3.5 text-xs sm:text-sm font-extrabold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: buttonBg,
              color: buttonColor,
            }}
          >
            <span>{buttonText}</span>
            <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export const NavMenuWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items: NavMenuItem[] = el.navMenuItems && el.navMenuItems.length > 0 ? el.navMenuItems : [
    { id: "1", label: "Home", url: "/", isActive: true },
    { id: "2", label: "About", url: "/about" },
    {
      id: "3",
      label: "Services",
      url: "/services",
      submenu: [
        { id: "s1", label: "Web Design", url: "/services/web-design" },
        { id: "s2", label: "App Development", url: "/services/app-dev" },
        { id: "s3", label: "SEO & Growth", url: "/services/seo" },
      ],
    },
    { id: "4", label: "Pricing", url: "/pricing" },
    { id: "5", label: "Contact", url: "/contact" },
  ];

  const isVertical = el.navLayout === "vertical";
  const alignment = el.navAlignment || "left";
  const gap = el.navGap ?? 24;
  const itemColor = el.navItemColor || "#334155";
  const itemHoverColor = el.navItemHoverColor || "#2563eb";
  const itemActiveColor = el.navItemActiveColor || "#2563eb";
  const itemBg = el.navItemBg || "transparent";
  const itemHoverBg = el.navItemHoverBg || "rgba(241, 245, 249, 0.8)";
  const itemActiveBg = el.navItemActiveBg || "rgba(239, 246, 255, 1)";
  const fontSize = el.navFontSize || "14px";
  const fontWeight = el.navFontWeight || "600";

  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(
    items.find((i) => i.isActive)?.id || null
  );

  let justifyClass = "justify-start";
  if (alignment === "center") justifyClass = "justify-center";
  else if (alignment === "right") justifyClass = "justify-end";
  else if (alignment === "between") justifyClass = "justify-between";

  return (
    <nav
      className="w-full transition-all"
      style={{
        boxSizing: "border-box",
      }}
    >
      <ul
        className={`flex ${isVertical ? "flex-col items-stretch" : `flex-row items-center ${justifyClass}`} wrap`}
        style={{
          gap: `${gap}px`,
        }}
      >
        {items.map((item) => {
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isItemHovered = hoveredItemId === item.id;
          const isOpen = openSubmenuId === item.id || isItemHovered;
          const isItemActive = item.isActive || activeItemId === item.id;

          const currentBg = isItemActive
            ? itemActiveBg
            : isItemHovered
            ? itemHoverBg
            : itemBg;

          const currentColor = isItemActive
            ? itemActiveColor
            : isItemHovered
            ? itemHoverColor
            : itemColor;

          return (
            <li
              key={item.id}
              className="relative group list-none"
              onMouseEnter={() => {
                setHoveredItemId(item.id);
                if (hasSubmenu) setOpenSubmenuId(item.id);
              }}
              onMouseLeave={() => {
                setHoveredItemId(null);
                setOpenSubmenuId(null);
              }}
            >
              <a
                href={item.url || "#"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveItemId(item.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all duration-200 cursor-pointer select-none"
                style={{
                  backgroundColor: currentBg,
                  color: currentColor,
                  fontSize: fontSize,
                  fontWeight: fontWeight,
                  fontFamily: mergedStyles.fontFamily,
                }}
              >
                <span>{item.label}</span>
                {hasSubmenu && (
                  <svg
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                )}
              </a>

              {/* Submenu Dropdown */}
              {hasSubmenu && (
                <div
                  className={`z-50 min-w-[200px] rounded-2xl border border-slate-100 bg-white/95 p-2 shadow-xl backdrop-blur-md transition-all duration-200 ${
                    isVertical
                      ? "static mt-1 ml-4"
                      : "absolute left-0 top-full mt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-1"
                  } ${isOpen && !isVertical ? "opacity-100 visible translate-y-0" : ""}`}
                >
                  <div className="flex flex-col gap-0.5">
                    {item.submenu!.map((subItem) => (
                      <a
                        key={subItem.id}
                        href={subItem.url || "#"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition duration-150 cursor-pointer block"
                        style={{ fontFamily: mergedStyles.fontFamily }}
                      >
                        {subItem.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export const AnimatedHeadlineWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const prefix = el.headlinePrefix ?? "Build Websites That Are";
  const words = el.headlineAnimatedTexts && el.headlineAnimatedTexts.length > 0
    ? el.headlineAnimatedTexts
    : ["Stunning", "Blazing Fast", "Ultra Flexible", "Powerful"];
  const suffix = el.headlineSuffix ?? "With ForgeStudio";
  const animType = el.headlineAnimationType || "typing";
  const speed = el.headlineAnimationSpeed || 2500;
  const highlightColor = el.headlineHighlightColor || "#2563eb";
  const highlightBg = el.headlineHighlightBg || "rgba(239, 246, 255, 1)";
  const Tag = (el.headlineTag || "h2") as "h1" | "h2" | "h3" | "h4" | "p";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [animateState, setAnimateState] = useState(true);

  // Typewriter effect logic
  useEffect(() => {
    if (animType !== "typing") return;

    const currentFullWord = words[currentIndex % words.length];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayText === currentFullWord) {
      timer = setTimeout(() => setIsDeleting(true), speed * 0.6);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentIndex((prev) => (prev + 1) % words.length);
    } else {
      const typeSpeed = isDeleting ? 40 : 80;
      timer = setTimeout(() => {
        setDisplayText((prev) =>
          isDeleting
            ? currentFullWord.substring(0, prev.length - 1)
            : currentFullWord.substring(0, prev.length + 1)
        );
      }, typeSpeed);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIndex, words, animType, speed]);

  // Non-typing word switching timer
  useEffect(() => {
    if (animType === "typing") return;

    const interval = setInterval(() => {
      setAnimateState(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setAnimateState(true);
      }, 250);
    }, speed);

    return () => clearInterval(interval);
  }, [words, animType, speed]);

  const currentWord = words[currentIndex % words.length];

  // Helper styles for non-typing animations
  let animStyles: React.CSSProperties = {};
  const animClass = "transition-all duration-300 inline-block";

  if (animType === "fade") {
    animStyles = {
      opacity: animateState ? 1 : 0,
      transform: animateState ? "scale(1)" : "scale(0.98)",
    };
  } else if (animType === "slide-up") {
    animStyles = {
      opacity: animateState ? 1 : 0,
      transform: animateState ? "translateY(0px)" : "translateY(12px)",
    };
  } else if (animType === "zoom") {
    animStyles = {
      opacity: animateState ? 1 : 0,
      transform: animateState ? "scale(1)" : "scale(0.75)",
    };
  } else if (animType === "flip") {
    animStyles = {
      opacity: animateState ? 1 : 0,
      transform: animateState ? "rotateX(0deg)" : "rotateX(90deg)",
      transformOrigin: "center center",
    };
  } else if (animType === "highlight") {
    animStyles = {
      backgroundColor: highlightBg,
      color: highlightColor,
      borderRadius: "0.5rem",
      paddingLeft: "0.5rem",
      paddingRight: "0.5rem",
      boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.15)",
    };
  }

  return (
    <Tag
      className="w-full break-words tracking-tight leading-tight select-none"
      style={{
        fontFamily: mergedStyles.fontFamily,
        fontSize: mergedStyles.fontSize || "32px",
        fontWeight: mergedStyles.fontWeight || "800",
        color: mergedStyles.color || "#0f172a",
        textAlign: mergedStyles.textAlign || "center",
      }}
    >
      {prefix && <span className="mr-2">{prefix}</span>}

      {animType === "typing" ? (
        <span
          className="inline-block rounded-md px-1.5 py-0.5"
          style={{
            color: highlightColor,
            backgroundColor: highlightBg,
          }}
        >
          {displayText}
          <span className="animate-pulse font-mono ml-0.5">|</span>
        </span>
      ) : (
        <span
          className={animClass}
          style={{
            color: animType !== "highlight" ? highlightColor : undefined,
            ...animStyles,
          }}
        >
          {currentWord}
        </span>
      )}

      {suffix && <span className="ml-2">{suffix}</span>}
    </Tag>
  );
};

export const PriceTableWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const plans = el.pricingPlans && el.pricingPlans.length > 0
    ? el.pricingPlans
    : [
        {
          id: "1",
          name: "Starter",
          price: "$19",
          period: "/ month",
          description: "Essential tools for personal projects & freelancers.",
          isPopular: false,
          buttonText: "Get Started",
          buttonUrl: "#",
          features: [
            { id: "f1", text: "5 Projects included", included: true },
            { id: "f2", text: "10GB SSD Storage", included: true },
            { id: "f3", text: "Basic Analytics", included: true },
            { id: "f4", text: "Custom Domain", included: false },
            { id: "f5", text: "24/7 Dedicated Support", included: false },
          ],
        },
        {
          id: "2",
          name: "Professional",
          price: "$49",
          period: "/ month",
          description: "Best for growing teams & expanding SaaS startups.",
          isPopular: true,
          badgeText: "MOST POPULAR",
          buttonText: "Start Free Trial",
          buttonUrl: "#",
          features: [
            { id: "f1", text: "Unlimited Projects", included: true },
            { id: "f2", text: "100GB SSD Storage", included: true },
            { id: "f3", text: "Advanced Analytics & Reports", included: true },
            { id: "f4", text: "Custom Domain & SSL", included: true },
            { id: "f5", text: "Priority Support", included: true },
          ],
        },
        {
          id: "3",
          name: "Enterprise",
          price: "$99",
          period: "/ month",
          description: "Advanced security, custom SLA, and dedicated scale.",
          isPopular: false,
          buttonText: "Contact Sales",
          buttonUrl: "#",
          features: [
            { id: "f1", text: "Unlimited Everything", included: true },
            { id: "f2", text: "1TB High Speed Storage", included: true },
            { id: "f3", text: "Custom Analytics & Export", included: true },
            { id: "f4", text: "Multi-Region Cloud Hosting", included: true },
            { id: "f5", text: "24/7 Dedicated Account Manager", included: true },
          ],
        },
      ];

  const cols = el.pricingColumns || 3;
  const gap = el.pricingGap ?? 24;
  const cardBg = el.pricingCardBg || "#ffffff";
  const cardBorder = el.pricingCardBorder || "#e2e8f0";
  const highlightColor = el.pricingHighlightColor || "#2563eb";
  const btnBg = el.pricingBtnBg || "#2563eb";
  const btnColor = el.pricingBtnColor || "#ffffff";

  let gridColsClass = "grid-cols-1 md:grid-cols-3";
  if (cols === 1) gridColsClass = "grid-cols-1";
  else if (cols === 2) gridColsClass = "grid-cols-1 md:grid-cols-2";
  else if (cols === 3) gridColsClass = "grid-cols-1 md:grid-cols-3";
  else if (cols === 4) gridColsClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div
      className={`grid w-full ${gridColsClass}`}
      style={{
        gap: `${gap}px`,
        fontFamily: mergedStyles.fontFamily,
      }}
    >
      {plans.map((plan) => {
        const isHighlight = Boolean(plan.isPopular);

        return (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-300 ${
              isHighlight
                ? "shadow-2xl ring-2 scale-[1.02] z-10"
                : "shadow-md hover:shadow-lg border"
            }`}
            style={{
              backgroundColor: cardBg,
              borderColor: isHighlight ? highlightColor : cardBorder,
            }}
          >
            {/* Optional Popular/Custom Badge */}
            {(isHighlight || plan.badgeText) && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span
                  className="inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md"
                  style={{ backgroundColor: highlightColor }}
                >
                  {plan.badgeText || "MOST POPULAR"}
                </span>
              </div>
            )}

            <div>
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                {plan.description && (
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Price Display */}
              <div className="mb-6 flex items-baseline gap-1 border-b border-slate-100 pb-6">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-xs font-medium text-slate-500">{plan.period}</span>
                )}
              </div>

              {/* Feature List */}
              <ul className="mb-8 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat.id} className="flex items-center gap-2.5 text-xs">
                    {feat.included ? (
                      <div
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: isHighlight ? `${highlightColor}15` : "#ecfdf5",
                          color: isHighlight ? highlightColor : "#059669",
                        }}
                      >
                        ✓
                      </div>
                    ) : (
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
                        ✕
                      </div>
                    )}
                    <span
                      className={
                        feat.included
                          ? "font-medium text-slate-700"
                          : "text-slate-400 line-through"
                      }
                    >
                      {feat.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Call To Action Button */}
            <a
              href={plan.buttonUrl || "#"}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
              className="w-full rounded-2xl py-3 text-center text-xs font-bold transition-all duration-200 cursor-pointer block select-none shadow-sm hover:shadow"
              style={{
                backgroundColor: isHighlight ? highlightColor : btnBg,
                color: btnColor,
              }}
            >
              {plan.buttonText || "Get Started"}
            </a>
          </div>
        );
      })}
    </div>
  );
};

export const PriceListWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items = el.priceListItems && el.priceListItems.length > 0
    ? el.priceListItems
    : [
        {
          id: "1",
          name: "Signature Espresso Blend",
          price: "$4.50",
          description: "Freshly roasted double shot arabica blend with velvety microfoam.",
          imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&auto=format&fit=crop&q=80",
        },
        {
          id: "2",
          name: "Haircut & Precision Styling",
          price: "$35.00",
          description: "Precision scissor cut, wash, scalp massage, and hot towel finish.",
          imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=80",
        },
        {
          id: "3",
          name: "Web Design & UX Sprint",
          price: "$499.00",
          description: "Custom responsive website design with SEO optimization & CMS integration.",
          imageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=150&auto=format&fit=crop&q=80",
        },
        {
          id: "4",
          name: "Organic Facial Treatment",
          price: "$85.00",
          description: "Deep cleansing facial treatment with organic botanicals & anti-aging serum.",
          imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=150&auto=format&fit=crop&q=80",
        },
      ];

  const gap = el.priceListGap ?? 20;
  const showImages = el.priceListShowImages !== false;
  const imgSize = el.priceListImageSize || 48;
  const separatorStyle = el.priceListSeparatorStyle || "dotted";
  const titleColor = el.priceListTitleColor || "#0f172a";
  const priceColor = el.priceListPriceColor || "#2563eb";
  const priceBg = el.priceListPriceBg || "#eff6ff";

  return (
    <div
      className="w-full flex flex-col"
      style={{
        gap: `${gap}px`,
        fontFamily: mergedStyles.fontFamily,
      }}
    >
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3.5 group">
          {/* Optional Thumbnail Image */}
          {showImages && (
            <div
              className="relative shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 shadow-xs"
              style={{ width: `${imgSize}px`, height: `${imgSize}px` }}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400 bg-slate-100">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Details & Price Header */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="font-bold text-sm sm:text-base tracking-tight shrink-0"
                style={{ color: titleColor }}
              >
                {item.name}
              </span>

              {/* Separator / Leader Line */}
              {separatorStyle !== "none" && (
                <div
                  className="flex-1 mx-1.5 self-center"
                  style={{
                    borderBottomWidth: "1px",
                    borderBottomStyle: separatorStyle,
                    borderColor: "#cbd5e1",
                  }}
                />
              )}

              {/* Price Pill */}
              <span
                className="inline-block shrink-0 font-extrabold text-xs sm:text-sm px-2.5 py-0.5 rounded-full tracking-tight shadow-2xs"
                style={{
                  color: priceColor,
                  backgroundColor: priceBg,
                }}
              >
                {item.price}
              </span>
            </div>

            {/* Description */}
            {item.description && (
              <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export const GalleryWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const [activeLightboxImg, setActiveLightboxImg] = useState<GalleryImageItem | null>(null);

  const images = el.galleryImages && el.galleryImages.length > 0
    ? el.galleryImages
    : [
        {
          id: "1",
          url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80",
          caption: "Modern Minimalist Architecture",
          altText: "Modern Architecture",
        },
        {
          id: "2",
          url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80",
          caption: "Scandinavian Living Space",
          altText: "Interior Living Room",
        },
        {
          id: "3",
          url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80",
          caption: "Bright Collaborative Workspace",
          altText: "Office Workspace",
        },
        {
          id: "4",
          url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80",
          caption: "Glass Highrise Skyscraper",
          altText: "City Skyscraper",
        },
        {
          id: "5",
          url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
          caption: "Serene Alpine Lake Reflection",
          altText: "Alpine Nature Landscape",
        },
        {
          id: "6",
          url: "https://images.unsplash.com/photo-1545241047-6083a3684587?w=600&auto=format&fit=crop&q=80",
          caption: "Botanical Plant Oasis",
          altText: "Green Botanical Decor",
        },
      ];

  const cols = el.galleryColumns || 3;
  const gap = el.galleryGap ?? 16;
  const aspectRatio = el.galleryAspectRatio || "square";
  const showCaptions = el.galleryShowCaptions !== false;
  const captionPosition = el.galleryCaptionPosition || "overlay";
  const hoverEffect = el.galleryHoverEffect || "zoom";
  const borderRadius = el.galleryBorderRadius || "16px";

  let aspectClass = "aspect-square";
  if (aspectRatio === "landscape") aspectClass = "aspect-video";
  else if (aspectRatio === "portrait") aspectClass = "aspect-[3/4]";
  else if (aspectRatio === "auto") aspectClass = "aspect-auto";

  let gridColsClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
  if (cols === 1) gridColsClass = "grid-cols-1";
  else if (cols === 2) gridColsClass = "grid-cols-1 sm:grid-cols-2";
  else if (cols === 3) gridColsClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
  else if (cols === 4) gridColsClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
  else if (cols === 5) gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-5";
  else if (cols === 6) gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-6";

  let hoverClass = "";
  if (hoverEffect === "zoom") hoverClass = "hover:scale-105";
  else if (hoverEffect === "fade") hoverClass = "hover:opacity-80";
  else if (hoverEffect === "lift") hoverClass = "hover:-translate-y-1 hover:shadow-xl";

  return (
    <>
      <div
        className={`grid w-full ${gridColsClass}`}
        style={{
          gap: `${gap}px`,
          fontFamily: mergedStyles.fontFamily,
        }}
      >
        {images.map((img) => (
          <div
            key={img.id}
            className="flex flex-col group cursor-pointer"
            onClick={() => setActiveLightboxImg(img)}
          >
            <div
              className={`relative w-full overflow-hidden bg-slate-100 border border-slate-200/60 shadow-xs transition-all duration-300 ${aspectClass} ${hoverClass}`}
              style={{ borderRadius }}
            >
              <img
                src={img.url}
                alt={img.altText || img.caption || "Gallery Image"}
                className="h-full w-full object-cover transition-transform duration-300"
              />

              {/* Lightbox Zoom Icon on Hover */}
              <div className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-xs">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </div>

              {/* Overlay Caption */}
              {showCaptions && captionPosition === "overlay" && img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-3 text-white transition-opacity duration-300 opacity-90 group-hover:opacity-100">
                  <p className="text-xs font-semibold tracking-wide drop-shadow-sm leading-tight">
                    {img.caption}
                  </p>
                </div>
              )}
            </div>

            {/* Below Caption */}
            {showCaptions && captionPosition === "below" && img.caption && (
              <p className="mt-1.5 text-xs font-medium text-slate-600 leading-snug">
                {img.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveLightboxImg(null)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900 cursor-pointer"
            >
              ✕
            </button>
            <img
              src={activeLightboxImg.url}
              alt={activeLightboxImg.altText || activeLightboxImg.caption || "Gallery Modal Image"}
              className="max-h-[75vh] w-full object-contain bg-slate-900"
            />
            {activeLightboxImg.caption && (
              <div className="bg-slate-900 p-4 text-center text-white">
                <p className="text-sm font-semibold tracking-wide">{activeLightboxImg.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const FlipBoxWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const [isFlippedState, setIsFlippedState] = useState(false);

  const direction = el.flipDirection || "flip-right";
  const duration = el.flipDuration || "0.6s";
  const height = el.flipCardHeight || "320px";
  const borderRadius = el.flipBorderRadius || "20px";

  const frontTitle = el.flipFrontTitle !== undefined ? el.flipFrontTitle : "Interactive Solutions";
  const frontDesc = el.flipFrontDescription !== undefined ? el.flipFrontDescription : "Hover or tap to flip card and explore custom features.";
  const frontBg = el.flipFrontBg || "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";
  const frontTextColor = el.flipFrontTextColor || "#ffffff";
  const frontIcon = el.flipFrontIcon || "🚀";
  const frontImage = el.flipFrontImage || "";

  const backTitle = el.flipBackTitle !== undefined ? el.flipBackTitle : "Ready to Start?";
  const backDesc = el.flipBackDescription !== undefined ? el.flipBackDescription : "Join thousands of creators building high-converting websites.";
  const backBg = el.flipBackBg || "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)";
  const backTextColor = el.flipBackTextColor || "#ffffff";
  const backBtnText = el.flipBackBtnText !== undefined ? el.flipBackBtnText : "Get Started Now";
  const backBtnUrl = el.flipBackBtnUrl || "#";
  const backBtnBg = el.flipBackBtnBg || "#ffffff";
  const backBtnTextColor = el.flipBackBtnTextColor || "#4f46e5";

  const isFlippedManual = el.flipIsFlippedManual;
  const showBack = isFlippedManual || isFlippedState;

  // Compute rotation styles based on flip direction
  let frontRotate = "rotateY(0deg)";
  let backRotate = "rotateY(180deg)";
  let flippedTransform = "rotateY(180deg)";

  if (direction === "flip-left") {
    backRotate = "rotateY(-180deg)";
    flippedTransform = "rotateY(-180deg)";
  } else if (direction === "flip-up") {
    backRotate = "rotateX(-180deg)";
    flippedTransform = "rotateX(-180deg)";
  } else if (direction === "flip-down") {
    backRotate = "rotateX(180deg)";
    flippedTransform = "rotateX(180deg)";
  }

  return (
    <div
      className="group relative w-full cursor-pointer"
      style={{
        height,
        perspective: "1000px",
        fontFamily: mergedStyles.fontFamily,
      }}
      onMouseEnter={() => !isFlippedManual && setIsFlippedState(true)}
      onMouseLeave={() => !isFlippedManual && setIsFlippedState(false)}
    >
      <div
        className="relative h-full w-full shadow-lg transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transitionDuration: duration,
          transform: showBack ? flippedTransform : "none",
          borderRadius,
        }}
      >
        {/* FRONT CARD */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center shadow-md overflow-hidden"
          style={{
            background: frontBg,
            color: frontTextColor,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: frontRotate,
            borderRadius,
          }}
        >
          {frontImage ? (
            <img src={frontImage} alt={frontTitle} className="h-16 w-16 mb-4 object-cover rounded-full shadow-sm" />
          ) : (
            frontIcon && <div className="text-4xl mb-4 drop-shadow-sm">{frontIcon}</div>
          )}

          {frontTitle && (
            <h3 className="text-xl font-bold tracking-tight mb-2 leading-tight">
              {frontTitle}
            </h3>
          )}

          {frontDesc && (
            <p className="text-xs opacity-90 leading-relaxed max-w-xs">
              {frontDesc}
            </p>
          )}

          <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold opacity-75">
            <span>Hover to reveal</span>
            <span>→</span>
          </div>
        </div>

        {/* BACK CARD */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center shadow-md overflow-hidden"
          style={{
            background: backBg,
            color: backTextColor,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: backRotate,
            borderRadius,
          }}
        >
          {backTitle && (
            <h3 className="text-xl font-bold tracking-tight mb-2 leading-tight">
              {backTitle}
            </h3>
          )}

          {backDesc && (
            <p className="text-xs opacity-90 leading-relaxed max-w-xs mb-5">
              {backDesc}
            </p>
          )}

          {backBtnText && (
            <a
              href={backBtnUrl}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs font-bold shadow-md transition hover:scale-105 active:scale-95"
              style={{
                backgroundColor: backBtnBg,
                color: backBtnTextColor,
              }}
            >
              {backBtnText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export const CtaWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const heading = el.ctaHeading !== undefined ? el.ctaHeading : "Boost Your Conversions Today";
  const description = el.ctaDescription !== undefined ? el.ctaDescription : "Start your 14-day free trial. No credit card required. Cancel anytime.";
  const buttonText = el.ctaButtonText !== undefined ? el.ctaButtonText : "Claim Your Free Trial →";
  const buttonUrl = el.ctaButtonUrl || "#";
  const buttonBg = el.ctaButtonBg || "linear-gradient(135deg, #e11d48 0%, #be123c 100%)";
  const buttonTextColor = el.ctaButtonTextColor || "#ffffff";
  const buttonBorderRadius = el.ctaButtonBorderRadius || "12px";
  const icon = el.ctaIcon || "⚡";
  const image = el.ctaImage || "";
  const layout = el.ctaLayout || "centered";
  const cardBg = el.ctaCardBg || "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
  const cardBorderColor = el.ctaCardBorderColor || "rgba(255, 255, 255, 0.1)";
  const cardBorderRadius = el.ctaCardBorderRadius || "24px";
  const textColor = el.ctaTextColor || "#ffffff";

  if (layout === "split") {
    return (
      <div
        className="w-full p-6 sm:p-8 md:p-10 shadow-xl transition-all border relative overflow-hidden"
        style={{
          background: cardBg,
          borderColor: cardBorderColor,
          borderRadius: cardBorderRadius,
          color: textColor,
          fontFamily: mergedStyles.fontFamily,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            {image ? (
              <img src={image} alt="CTA" className="h-12 w-12 object-cover rounded-lg mb-3 shadow-xs" />
            ) : (
              icon && <div className="text-3xl mb-2">{icon}</div>
            )}

            {heading && (
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                {heading}
              </h2>
            )}

            {description && (
              <p className="text-sm opacity-85 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {buttonText && (
            <div className="shrink-0">
              <a
                href={buttonUrl}
                onClick={(e) => {
                  if (!isPreview) e.preventDefault();
                }}
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer text-center"
                style={{
                  background: buttonBg,
                  color: buttonTextColor,
                  borderRadius: buttonBorderRadius,
                }}
              >
                {buttonText}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (layout === "left-aligned") {
    return (
      <div
        className="w-full p-6 sm:p-8 md:p-10 shadow-xl transition-all border relative overflow-hidden text-left"
        style={{
          background: cardBg,
          borderColor: cardBorderColor,
          borderRadius: cardBorderRadius,
          color: textColor,
          fontFamily: mergedStyles.fontFamily,
        }}
      >
        <div className="space-y-3 max-w-2xl relative z-10">
          {image ? (
            <img src={image} alt="CTA" className="h-14 w-14 object-cover rounded-lg shadow-xs" />
          ) : (
            icon && <div className="text-4xl">{icon}</div>
          )}

          {heading && (
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {heading}
            </h2>
          )}

          {description && (
            <p className="text-sm opacity-85 leading-relaxed">
              {description}
            </p>
          )}

          {buttonText && (
            <div className="pt-2">
              <a
                href={buttonUrl}
                onClick={(e) => {
                  if (!isPreview) e.preventDefault();
                }}
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                style={{
                  background: buttonBg,
                  color: buttonTextColor,
                  borderRadius: buttonBorderRadius,
                }}
              >
                {buttonText}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Centered Default Layout
  return (
    <div
      className="w-full p-6 sm:p-8 md:p-10 shadow-xl transition-all border relative overflow-hidden text-center flex flex-col items-center justify-center"
      style={{
        background: cardBg,
        borderColor: cardBorderColor,
        borderRadius: cardBorderRadius,
        color: textColor,
        fontFamily: mergedStyles.fontFamily,
      }}
    >
      <div className="space-y-3 max-w-xl relative z-10 flex flex-col items-center">
        {image ? (
          <img src={image} alt="CTA" className="h-16 w-16 object-cover rounded-full shadow-xs mb-1" />
        ) : (
          icon && <div className="text-4xl mb-1">{icon}</div>
        )}

        {heading && (
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {heading}
          </h2>
        )}

        {description && (
          <p className="text-sm opacity-85 leading-relaxed max-w-md">
            {description}
          </p>
        )}

        {buttonText && (
          <div className="pt-3">
            <a
              href={buttonUrl}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
              className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: buttonBg,
                color: buttonTextColor,
                borderRadius: buttonBorderRadius,
              }}
            >
              {buttonText}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export const getEmbedVideoUrl = (url: string = "") => {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }
  return url;
};

export const MediaCarouselWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items = el.mediaCarouselItems || [];
  const rawSlidesPerView = el.mediaCarouselSlidesPerView || 3;
  const gap = el.mediaCarouselGap ?? 16;
  const autoplay = el.mediaCarouselAutoplay !== false;
  const autoplaySpeed = el.mediaCarouselAutoplaySpeed || 3500;
  const loop = el.mediaCarouselLoop !== false;
  const showNav = el.mediaCarouselShowNav !== false;
  const showDots = el.mediaCarouselShowDots !== false;
  const aspectRatio = el.mediaCarouselAspectRatio || "landscape";
  const borderRadius = el.mediaCarouselBorderRadius || "16px";
  const transition = el.mediaCarouselTransition || "slide";
  const transitionSpeed = el.mediaCarouselTransitionSpeed || 500;
  const imageSizing = el.mediaCarouselImageSizing || "cover";
  const cardBg = el.mediaCarouselCardBg || "#0f172a";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedLightboxMedia, setSelectedLightboxMedia] = useState<MediaCarouselItem | null>(null);

  // Responsive slides per view calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const [effectiveSlidesPerView, setEffectiveSlidesPerView] = useState<number>(rawSlidesPerView);

  useEffect(() => {
    const updateResponsiveSlides = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      if (width < 640) {
        setEffectiveSlidesPerView(1);
      } else if (width < 1024) {
        setEffectiveSlidesPerView(Math.min(rawSlidesPerView, 2));
      } else {
        setEffectiveSlidesPerView(rawSlidesPerView);
      }
    };

    updateResponsiveSlides();
    window.addEventListener("resize", updateResponsiveSlides);
    return () => window.removeEventListener("resize", updateResponsiveSlides);
  }, [rawSlidesPerView]);

  // Drag / Swipe State
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [draggedFar, setDraggedFar] = useState(false);

  const maxIndex = Math.max(0, items.length - effectiveSlidesPerView);

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return loop ? 0 : prev;
      }
      return prev + 1;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return loop ? maxIndex : 0;
      }
      return prev - 1;
    });
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
    setIsMouseDown(true);
    setDraggedFar(false);
    setDragOffset(0);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || !isMouseDown) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - touchStartX;
    setDragOffset(diff);
    if (Math.abs(diff) > 8) {
      setDraggedFar(true);
    }
  };

  const handleDragEnd = () => {
    if (touchStartX === null) return;
    if (dragOffset < -40) {
      handleNext();
    } else if (dragOffset > 40) {
      handlePrev();
    }
    setTouchStartX(null);
    setIsMouseDown(false);
    setDragOffset(0);
  };

  useEffect(() => {
    if (!autoplay || isHovered || isMouseDown || maxIndex === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, autoplaySpeed);
    return () => clearInterval(timer);
  }, [autoplay, isHovered, isMouseDown, maxIndex, autoplaySpeed, loop]);

  const aspectStyleMap: Record<string, string> = {
    square: "aspect-square",
    landscape: "aspect-16/9",
    portrait: "aspect-3/4",
    video: "aspect-21/9",
    auto: "h-64",
  };

  // Empty State
  if (!items || items.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 text-center"
        style={{
          marginTop: mergedStyles.marginTop,
          marginBottom: mergedStyles.marginBottom,
        }}
      >
        <div className="h-12 w-12 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xl mb-3 shadow-xs">
          🎡
        </div>
        <h4 className="text-sm font-bold text-slate-800">Media Carousel</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          No media items added yet. Use "+ Add Image" or "+ Add Video" in the Inspector Panel to populate your carousel.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="w-full relative group overflow-hidden select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          if (isMouseDown) handleDragEnd();
        }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{
          fontFamily: mergedStyles.fontFamily,
          marginTop: mergedStyles.marginTop,
          marginBottom: mergedStyles.marginBottom,
          cursor: isMouseDown ? "grabbing" : "grab",
        }}
      >
        {/* Track Container */}
        <div className="overflow-hidden w-full py-2">
          {transition === "fade" ? (
            <div className="relative w-full overflow-hidden" style={{ borderRadius }}>
              {items.map((item, idx) => {
                const isVideo = item.type === "video" || !!item.videoUrl;
                const isSelected = idx === currentIndex;
                return (
                  <div
                    key={item.id}
                    className={`w-full transition-all duration-500 ${
                      isSelected ? "relative opacity-100 z-10" : "absolute inset-0 opacity-0 z-0 pointer-events-none"
                    }`}
                    onClick={(e) => {
                      if (draggedFar) {
                        e.stopPropagation();
                        return;
                      }
                      setSelectedLightboxMedia(item);
                    }}
                  >
                    <div className={`w-full overflow-hidden relative shadow-lg ${aspectStyleMap[aspectRatio] || "aspect-16/9"}`} style={{ backgroundColor: cardBg, borderRadius }}>
                      <img
                        src={item.url || item.posterUrl || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800"}
                        alt={item.altText || item.title || "Carousel Media"}
                        className="w-full h-full pointer-events-none"
                        style={{ objectFit: imageSizing as any }}
                        loading="lazy"
                      />

                      {/* Top Type Badge */}
                      <div className="absolute top-3 left-3 z-10">
                        {isVideo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-900/80 px-2.5 py-1 text-[10px] font-bold text-cyan-200 backdrop-blur shadow-sm border border-cyan-400/30">
                            <span>🎬</span> VIDEO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-900/80 px-2.5 py-1 text-[10px] font-bold text-indigo-200 backdrop-blur shadow-sm border border-indigo-400/30">
                            <span>📷</span> IMAGE
                          </span>
                        )}
                      </div>

                      {/* Video Play Overlay */}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                          <div className="h-12 w-12 rounded-full bg-cyan-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition border border-white/40">
                            <span className="text-lg pl-0.5">▶</span>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-white">
                        {item.title && <h5 className="text-sm font-bold text-white drop-shadow">{item.title}</h5>}
                        {item.caption && <p className="text-xs font-normal text-slate-200 drop-shadow line-clamp-2 mt-0.5">{item.caption}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={`flex ${isMouseDown ? "transition-none" : "transition-transform ease-out"}`}
              style={{
                gap: `${gap}px`,
                transitionDuration: `${transitionSpeed}ms`,
                transform: `translateX(calc(-${currentIndex * (100 / effectiveSlidesPerView)}% - ${currentIndex * (gap / effectiveSlidesPerView)}px + ${dragOffset}px))`,
              }}
            >
              {items.map((item) => {
                const isVideo = item.type === "video" || !!item.videoUrl;
                return (
                  <div
                    key={item.id}
                    className="shrink-0 group/card relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                    style={{
                      width: `calc((100% - ${(effectiveSlidesPerView - 1) * gap}px) / ${effectiveSlidesPerView})`,
                      borderRadius,
                      backgroundColor: cardBg,
                    }}
                    onClick={(e) => {
                      if (draggedFar) {
                        e.stopPropagation();
                        return;
                      }
                      setSelectedLightboxMedia(item);
                    }}
                  >
                    <div className={`w-full overflow-hidden relative ${aspectStyleMap[aspectRatio] || "aspect-16/9"}`}>
                      <img
                        src={item.url || item.posterUrl || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800"}
                        alt={item.altText || item.title || "Carousel Media"}
                        className="w-full h-full transition-transform duration-500 group-hover/card:scale-105 pointer-events-none"
                        style={{ objectFit: imageSizing as any }}
                        loading="lazy"
                      />

                      {/* Top Type Badge */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        {isVideo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/85 px-2 py-0.5 text-[9px] font-bold text-cyan-300 backdrop-blur shadow-xs border border-cyan-500/30">
                            <span>🎬</span> VIDEO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2 py-0.5 text-[9px] font-bold text-slate-200 backdrop-blur shadow-xs border border-slate-700/40">
                            <span>📷</span> IMAGE
                          </span>
                        )}
                      </div>

                      {/* Video Play Overlay */}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover/card:bg-black/45 transition duration-300">
                          <div className="h-10 w-10 rounded-full bg-cyan-600/90 text-white flex items-center justify-center shadow-lg transform group-hover/card:scale-110 transition border border-white/50">
                            <span className="text-sm pl-0.5">▶</span>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-85 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-white">
                        {item.title && (
                          <h5 className="text-xs font-bold text-white drop-shadow line-clamp-1">{item.title}</h5>
                        )}
                        {item.caption && (
                          <p className="text-[11px] font-medium text-slate-200 drop-shadow line-clamp-2 mt-0.5">{item.caption}</p>
                        )}
                        <span className="text-[9px] text-cyan-300 font-semibold mt-1 flex items-center gap-1">
                          <span>{isVideo ? "🎬 Click to Watch Video" : "🔍 Click to View Image"}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {showNav && maxIndex > 0 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              disabled={!loop && currentIndex === 0}
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-all z-20 cursor-pointer ${
                !loop && currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
              }`}
              title="Previous Slide"
            >
              <span className="text-base font-bold">‹</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              disabled={!loop && currentIndex >= maxIndex}
              className={`absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-all z-20 cursor-pointer ${
                !loop && currentIndex >= maxIndex ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
              }`}
              title="Next Slide"
            >
              <span className="text-base font-bold">›</span>
            </button>
          </>
        )}

        {/* Dots Pagination */}
        {showDots && maxIndex > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx ? "w-6 bg-cyan-600" : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Video Player Modal */}
      {selectedLightboxMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedLightboxMedia(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl p-4 border border-slate-700 shadow-2xl flex flex-col items-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedLightboxMedia(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-xl font-bold bg-slate-800/80 rounded-full h-8 w-8 flex items-center justify-center transition cursor-pointer z-10"
              title="Close modal"
            >
              ✕
            </button>

            {/* Media Display Area */}
            <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-black min-h-[300px]">
              {(selectedLightboxMedia.type === "video" || !!selectedLightboxMedia.videoUrl) ? (
                <div className="w-full aspect-16/9 relative">
                  <iframe
                    src={getEmbedVideoUrl(selectedLightboxMedia.videoUrl || selectedLightboxMedia.url)}
                    title={selectedLightboxMedia.title || "Video Player"}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={selectedLightboxMedia.url}
                  alt={selectedLightboxMedia.altText || selectedLightboxMedia.title || "Enlarged view"}
                  className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
              )}
            </div>

            {/* Title & Caption */}
            {(selectedLightboxMedia.title || selectedLightboxMedia.caption) && (
              <div className="mt-3 w-full text-center px-4">
                {selectedLightboxMedia.title && (
                  <h4 className="text-base font-bold text-white">{selectedLightboxMedia.title}</h4>
                )}
                {selectedLightboxMedia.caption && (
                  <p className="mt-1 text-xs text-slate-300 font-normal">{selectedLightboxMedia.caption}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const TestimonialCarouselWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items: TestimonialItem[] = el.testimonialItems && el.testimonialItems.length > 0
    ? el.testimonialItems
    : [
        {
          id: "1",
          quote: "ForgeStudio transformed how we launch client sites. What used to take weeks now takes hours with incredible quality!",
          name: "Sarah Jenkins",
          role: "VP of Product, TechScale Inc.",
          avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
          rating: 5,
        },
        {
          id: "2",
          quote: "The visual editor and element customization options are second to none. Our conversion rates increased by 42%.",
          name: "Marcus Vance",
          role: "Founder & CEO, GrowthFlow",
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
          rating: 5,
        },
        {
          id: "3",
          quote: "Extremely intuitive UI, lightning-fast rendering, and fantastic pre-built components. A absolute game changer!",
          name: "Elena Rostova",
          role: "Head of Design, Studio Craft",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          rating: 5,
        },
      ];

  const slidesPerView = el.testimonialSlidesPerView || 2;
  const gap = el.testimonialGap ?? 20;
  const autoplay = el.testimonialAutoplay !== false;
  const autoplaySpeed = el.testimonialAutoplaySpeed || 4000;
  const loop = el.testimonialLoop !== false;
  const showNav = el.testimonialShowNav !== false;
  const showDots = el.testimonialShowDots !== false;
  const cardBg = el.testimonialCardBg || "#ffffff";
  const borderRadius = el.testimonialCardBorderRadius || "16px";
  const textColor = el.testimonialTextColor || "#1e293b";
  const starColor = el.testimonialStarColor || "#f59e0b";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Drag / Swipe State
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const maxIndex = Math.max(0, items.length - slidesPerView);

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return loop ? 0 : prev;
      }
      return prev + 1;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return loop ? maxIndex : 0;
      }
      return prev - 1;
    });
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
    setIsMouseDown(true);
    setDragOffset(0);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || !isMouseDown) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - touchStartX;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (touchStartX === null) return;
    if (dragOffset < -40) {
      handleNext();
    } else if (dragOffset > 40) {
      handlePrev();
    }
    setTouchStartX(null);
    setIsMouseDown(false);
    setDragOffset(0);
  };

  useEffect(() => {
    if (!autoplay || isHovered || isMouseDown || maxIndex === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, autoplaySpeed);
    return () => clearInterval(timer);
  }, [autoplay, isHovered, isMouseDown, maxIndex, autoplaySpeed, loop]);

  return (
    <div
      className="w-full relative group overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isMouseDown) handleDragEnd();
      }}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      style={{
        fontFamily: mergedStyles.fontFamily,
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        cursor: isMouseDown ? "grabbing" : "grab",
      }}
    >
      {/* Track Container */}
      <div className="overflow-hidden w-full py-3 px-1">
        <div
          className={`flex ${isMouseDown ? "transition-none" : "transition-transform duration-500 ease-out"}`}
          style={{
            gap: `${gap}px`,
            transform: `translateX(calc(-${currentIndex * (100 / slidesPerView)}% - ${currentIndex * (gap / slidesPerView)}px + ${dragOffset}px))`,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="shrink-0 flex flex-col justify-between p-6 shadow-md hover:shadow-xl border border-slate-200/80 transition-all duration-300 relative group/card"
              style={{
                width: `calc((100% - ${(slidesPerView - 1) * gap}px) / ${slidesPerView})`,
                backgroundColor: cardBg,
                borderRadius,
                color: textColor,
              }}
            >
              {/* Decorative Quote Mark */}
              <div className="absolute top-4 right-5 text-4xl font-serif text-slate-200 pointer-events-none select-none">
                “
              </div>

              {/* Top Rating Stars */}
              <div>
                {item.rating !== undefined && (
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, starIdx) => (
                      <span
                        key={starIdx}
                        className="text-sm"
                        style={{ color: starIdx < (item.rating || 5) ? starColor : "#cbd5e1" }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}

                {/* Quote Text */}
                <p className="text-xs sm:text-sm font-medium leading-relaxed mb-6 italic opacity-90">
                  "{item.quote}"
                </p>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt={item.name}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0 pointer-events-none"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {item.name.charAt(0)}
                  </div>
                )}

                <div className="min-w-0">
                  <h5 className="text-xs sm:text-sm font-bold tracking-tight truncate">{item.name}</h5>
                  <p className="text-[11px] opacity-75 truncate">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {showNav && maxIndex > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={!loop && currentIndex === 0}
            className={`absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-all z-20 cursor-pointer ${
              !loop && currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
            }`}
            title="Previous Testimonial"
          >
            <span className="text-base font-bold">‹</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={!loop && currentIndex >= maxIndex}
            className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-all z-20 cursor-pointer ${
              !loop && currentIndex >= maxIndex ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
            }`}
            title="Next Testimonial"
          >
            <span className="text-base font-bold">›</span>
          </button>
        </>
      )}

      {/* Dots Pagination */}
      {showDots && maxIndex > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx ? "w-6 bg-emerald-600" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              title={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const NestedCarouselWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
  renderElementTree,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
  renderElementTree: (el: EditorElement) => React.ReactNode;
}) => {
  const slides = el.children && el.children.length > 0 ? el.children : [];
  const slidesPerView = el.nestedCarouselSlidesPerView || 1;
  const gap = el.nestedCarouselGap ?? 20;
  const autoplay = el.nestedCarouselAutoplay !== false;
  const autoplaySpeed = el.nestedCarouselAutoplaySpeed || 5000;
  const loop = el.nestedCarouselLoop !== false;
  const showNav = el.nestedCarouselShowNav !== false;
  const showDots = el.nestedCarouselShowDots !== false;
  const borderRadius = el.nestedCarouselBorderRadius || "16px";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Drag / Swipe State
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const maxIndex = Math.max(0, slides.length - slidesPerView);

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return loop ? 0 : prev;
      }
      return prev + 1;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return loop ? maxIndex : 0;
      }
      return prev - 1;
    });
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const targetEl = e.target as HTMLElement;
    if (targetEl && (targetEl.tagName === "INPUT" || targetEl.tagName === "TEXTAREA" || targetEl.isContentEditable)) {
      return;
    }
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
    setIsMouseDown(true);
    setDragOffset(0);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || !isMouseDown) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - touchStartX;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (touchStartX === null) return;
    if (dragOffset < -50) {
      handleNext();
    } else if (dragOffset > 50) {
      handlePrev();
    }
    setTouchStartX(null);
    setIsMouseDown(false);
    setDragOffset(0);
  };

  useEffect(() => {
    if (!autoplay || isHovered || isMouseDown || maxIndex === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, autoplaySpeed);
    return () => clearInterval(timer);
  }, [autoplay, isHovered, isMouseDown, maxIndex, autoplaySpeed, loop]);

  return (
    <div
      className="w-full relative group overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isMouseDown) handleDragEnd();
      }}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      style={{
        fontFamily: mergedStyles.fontFamily,
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
      }}
    >
      {/* Empty State */}
      {slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-300 bg-indigo-50/50 rounded-2xl text-center">
          <span className="text-2xl mb-1">🎠</span>
          <h4 className="text-sm font-bold text-indigo-900">Empty Nested Carousel</h4>
          <p className="text-xs text-indigo-600 max-w-xs mt-1">
            Add slide containers to display nested elements inside this carousel.
          </p>
        </div>
      ) : (
        /* Track Container */
        <div className="overflow-hidden w-full py-2 px-1">
          <div
            className={`flex ${isMouseDown ? "transition-none" : "transition-transform duration-500 ease-out"}`}
            style={{
              gap: `${gap}px`,
              transform: `translateX(calc(-${currentIndex * (100 / slidesPerView)}% - ${currentIndex * (gap / slidesPerView)}px + ${dragOffset}px))`,
            }}
          >
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="shrink-0 relative transition-all duration-300"
                style={{
                  width: `calc((100% - ${(slidesPerView - 1) * gap}px) / ${slidesPerView})`,
                  borderRadius,
                }}
              >
                {renderElementTree(slide)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {showNav && maxIndex > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={!loop && currentIndex === 0}
            className={`absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-indigo-900/80 hover:bg-indigo-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-all z-20 cursor-pointer ${
              !loop && currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
            }`}
            title="Previous Slide"
          >
            <span className="text-base font-bold">‹</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={!loop && currentIndex >= maxIndex}
            className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-indigo-900/80 hover:bg-indigo-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-all z-20 cursor-pointer ${
              !loop && currentIndex >= maxIndex ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
            }`}
            title="Next Slide"
          >
            <span className="text-base font-bold">›</span>
          </button>
        </>
      )}

      {/* Dots Pagination */}
      {showDots && maxIndex > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-3 z-20 relative">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx ? "w-6 bg-indigo-600" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LoopCarouselWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items = el.loopCarouselItems && el.loopCarouselItems.length > 0 ? el.loopCarouselItems : [];
  const slidesPerView = el.loopCarouselSlidesPerView || 3;
  const gap = el.loopCarouselGap ?? 20;
  const autoplay = el.loopCarouselAutoplay !== false;
  const autoplaySpeed = el.loopCarouselAutoplaySpeed || 3500;
  const loop = el.loopCarouselLoop !== false;
  const showNav = el.loopCarouselShowNav !== false;
  const showDots = el.loopCarouselShowDots !== false;
  const transition = el.loopCarouselTransition || "slide";
  const cardBg = el.loopCarouselCardBg || "#ffffff";
  const borderRadius = el.loopCarouselBorderRadius || "16px";
  const textColor = el.loopCarouselTextColor || "#1e293b";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Gesture State
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const maxIndex = Math.max(0, items.length - slidesPerView);

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return loop ? 0 : prev;
      }
      return prev + 1;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return loop ? maxIndex : 0;
      }
      return prev - 1;
    });
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
    setIsMouseDown(true);
    setDragOffset(0);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || !isMouseDown) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - touchStartX;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (touchStartX === null) return;
    if (dragOffset < -50) {
      handleNext();
    } else if (dragOffset > 50) {
      handlePrev();
    }
    setTouchStartX(null);
    setIsMouseDown(false);
    setDragOffset(0);
  };

  useEffect(() => {
    if (!autoplay || isHovered || isMouseDown || maxIndex === 0 || transition === "continuous") return;
    const timer = setInterval(() => {
      handleNext();
    }, autoplaySpeed);
    return () => clearInterval(timer);
  }, [autoplay, isHovered, isMouseDown, maxIndex, autoplaySpeed, loop, transition]);

  const continuousItems = transition === "continuous" ? [...items, ...items, ...items] : items;

  return (
    <div
      className="w-full relative group overflow-hidden select-none py-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isMouseDown) handleDragEnd();
      }}
      onMouseDown={transition !== "continuous" ? handleDragStart : undefined}
      onMouseMove={transition !== "continuous" ? handleDragMove : undefined}
      onMouseUp={transition !== "continuous" ? handleDragEnd : undefined}
      onTouchStart={transition !== "continuous" ? handleDragStart : undefined}
      onTouchMove={transition !== "continuous" ? handleDragMove : undefined}
      onTouchEnd={transition !== "continuous" ? handleDragEnd : undefined}
      style={{
        fontFamily: mergedStyles.fontFamily,
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
      }}
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-2xl text-center">
          <span className="text-2xl mb-1">🔁</span>
          <h4 className="text-sm font-bold text-purple-900">Empty Loop Carousel</h4>
          <p className="text-xs text-purple-600 max-w-xs mt-1">
            Add items in the Properties Inspector to populate this loop carousel.
          </p>
        </div>
      ) : transition === "fade" ? (
        /* Fade Transition Mode */
        <div className="relative w-full overflow-hidden min-h-[260px] flex items-center justify-center">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col justify-between p-6 shadow-md border border-slate-100 ${
                currentIndex === idx ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              }`}
              style={{
                backgroundColor: cardBg,
                borderRadius,
                color: textColor,
              }}
            >
              {item.imageUrl && (
                <div className="relative h-36 w-full overflow-hidden rounded-lg mb-3">
                  <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  {item.badge && (
                    <span className="absolute top-2 right-2 rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
              {!item.imageUrl && item.badge && (
                <div className="mb-2">
                  <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
                    {item.badge}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-extrabold tracking-tight mb-1">{item.title}</h3>
              {item.description && <p className="text-xs opacity-80 leading-relaxed mb-4">{item.description}</p>}
              {item.buttonText && (
                <a
                  href={item.linkUrl || "#"}
                  onClick={(e) => {
                    if (!isPreview) e.preventDefault();
                  }}
                  className="mt-auto inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-purple-700"
                >
                  {item.buttonText}
                </a>
              )}
            </div>
          ))}
        </div>
      ) : transition === "continuous" ? (
        /* Continuous Marquee Ticker Loop */
        <div className="overflow-hidden w-full py-1">
          <div
            className={`flex transition-transform duration-1000 linear ${isHovered ? "pause" : ""}`}
            style={{
              gap: `${gap}px`,
              animation: autoplay ? `marqueeLoop ${Math.max(10, items.length * 4)}s linear infinite` : "none",
            }}
          >
            {continuousItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="shrink-0 flex flex-col justify-between p-5 shadow-sm border border-slate-200/80 transition hover:shadow-md hover:-translate-y-1"
                style={{
                  width: `calc((100% - ${(slidesPerView - 1) * gap}px) / ${slidesPerView})`,
                  backgroundColor: cardBg,
                  borderRadius,
                  color: textColor,
                }}
              >
                {item.imageUrl && (
                  <div className="relative h-32 w-full overflow-hidden rounded-lg mb-3">
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    {item.badge && (
                      <span className="absolute top-2 right-2 rounded-full bg-purple-600 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
                {!item.imageUrl && item.badge && (
                  <div className="mb-1.5">
                    <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                      {item.badge}
                    </span>
                  </div>
                )}
                <h3 className="text-sm font-bold leading-snug mb-1">{item.title}</h3>
                {item.description && <p className="text-xs opacity-75 line-clamp-2 mb-3">{item.description}</p>}
                {item.buttonText && (
                  <a
                    href={item.linkUrl || "#"}
                    onClick={(e) => {
                      if (!isPreview) e.preventDefault();
                    }}
                    className="mt-auto inline-flex items-center justify-center rounded-md bg-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-700 transition"
                  >
                    {item.buttonText}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Default Slide Track Loop */
        <div className="overflow-hidden w-full py-1">
          <div
            className={`flex ${isMouseDown ? "transition-none" : "transition-transform duration-500 ease-out"}`}
            style={{
              gap: `${gap}px`,
              transform: `translateX(calc(-${currentIndex * (100 / slidesPerView)}% - ${currentIndex * (gap / slidesPerView)}px + ${dragOffset}px))`,
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="shrink-0 flex flex-col justify-between p-5 shadow-sm border border-slate-200/80 transition duration-200 hover:shadow-md hover:-translate-y-1"
                style={{
                  width: `calc((100% - ${(slidesPerView - 1) * gap}px) / ${slidesPerView})`,
                  backgroundColor: cardBg,
                  borderRadius,
                  color: textColor,
                }}
              >
                {item.imageUrl && (
                  <div className="relative h-32 w-full overflow-hidden rounded-lg mb-3">
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    {item.badge && (
                      <span className="absolute top-2 right-2 rounded-full bg-purple-600 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
                {!item.imageUrl && item.badge && (
                  <div className="mb-1.5">
                    <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                      {item.badge}
                    </span>
                  </div>
                )}
                <h3 className="text-sm font-bold leading-snug mb-1">{item.title}</h3>
                {item.description && <p className="text-xs opacity-75 line-clamp-2 mb-3">{item.description}</p>}
                {item.buttonText && (
                  <a
                    href={item.linkUrl || "#"}
                    onClick={(e) => {
                      if (!isPreview) e.preventDefault();
                    }}
                    className="mt-auto inline-flex items-center justify-center rounded-md bg-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-700 transition"
                  >
                    {item.buttonText}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {showNav && maxIndex > 0 && transition !== "continuous" && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={!loop && currentIndex === 0}
            className={`absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-purple-900/80 hover:bg-purple-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-all z-20 cursor-pointer ${
              !loop && currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
            }`}
            title="Previous Item"
          >
            <span className="text-base font-bold">‹</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={!loop && currentIndex >= maxIndex}
            className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-purple-900/80 hover:bg-purple-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-all z-20 cursor-pointer ${
              !loop && currentIndex >= maxIndex ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
            }`}
            title="Next Item"
          >
            <span className="text-base font-bold">›</span>
          </button>
        </>
      )}

      {/* Dots Pagination */}
      {showDots && maxIndex > 0 && transition !== "continuous" && (
        <div className="flex items-center justify-center gap-1.5 mt-3 z-20 relative">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx ? "w-6 bg-purple-600" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TocWidgetRenderer = ({
  el,
  elements,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  elements: EditorElement[];
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  const title = el.tocTitle !== undefined ? el.tocTitle : "Table of Contents";
  const showTitle = el.tocShowTitle !== false;
  const includedLevels = el.tocIncludedLevels || (["h1", "h2", "h3", "h4", "h5", "h6"] as ("h1" | "h2" | "h3" | "h4" | "h5" | "h6")[]);
  const indentPerLevel = el.tocIndentPerLevel ?? 14;
  const itemGap = el.tocItemGap ?? 6;
  const markerStyle = el.tocMarkerStyle || "bullet";
  const cardBg = el.tocCardBg || "#ffffff";
  const borderColor = el.tocBorderColor || "#e2e8f0";
  const textColor = el.tocTextColor || "#334155";
  const hoverColor = el.tocHoverColor || "#2563eb";
  const titleColor = el.tocTitleColor || "#0f172a";
  const alignment = el.tocAlignment || "left";

  const collectHeadings = (items: EditorElement[] = []): { id: string; text: string; level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; levelNum: number }[] => {
    let list: { id: string; text: string; level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; levelNum: number }[] = [];
    if (!items || !Array.isArray(items)) return list;
    for (const item of items) {
      if (!item) continue;
      if (item.type === "heading") {
        let level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" = item.headingLevel || "h2";
        if (!item.headingLevel && item.styles?.fontSize) {
          const size = parseInt(String(item.styles.fontSize), 10);
          if (size >= 36) level = "h1";
          else if (size >= 28) level = "h2";
          else if (size >= 22) level = "h3";
          else if (size >= 18) level = "h4";
          else if (size >= 15) level = "h5";
          else level = "h6";
        }
        const levelNum = parseInt(level.replace("h", ""), 10);
        list.push({
          id: item.id,
          text: item.content || `Heading ${level.toUpperCase()}`,
          level,
          levelNum,
        });
      }
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        list = list.concat(collectHeadings(item.children));
      }
    }
    return list;
  };

  const headings = collectHeadings(elements).filter((h) => includedLevels.includes(h.level));

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("heading-", "");
            setActiveHeadingId(id);
          }
        });
      },
      { rootMargin: "-10% 0px -50% 0px", threshold: 0.1 }
    );

    headings.forEach((h) => {
      const domNode = document.getElementById(`heading-${h.id}`);
      if (domNode) observer.observe(domNode);
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleHeadingClick = (headingId: string) => {
    setActiveHeadingId(headingId);
    const domEl = document.getElementById(`heading-${headingId}`);
    if (domEl) {
      domEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div
      className="w-full rounded-2xl border p-5 shadow-xs transition-all duration-300 backdrop-blur-xs"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        fontFamily: mergedStyles.fontFamily,
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        textAlign: alignment,
      }}
    >
      {showTitle && (
        <div
          className="flex items-center justify-between gap-2 border-b pb-3 mb-3 select-none"
          style={{ borderColor: `${borderColor}a0` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg shadow-xs"
              style={{ backgroundColor: `${hoverColor}15`, color: hoverColor }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <h3
                className="font-bold text-sm tracking-tight leading-none"
                style={{
                  color: titleColor,
                  fontSize: mergedStyles.fontSize || "15px",
                  fontWeight: mergedStyles.fontWeight || "700",
                }}
              >
                {title}
              </h3>
              {headings.length > 0 && (
                <span className="text-[10px] font-semibold text-slate-400 mt-1">
                  {headings.length} {headings.length === 1 ? "Section" : "Sections"}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            title={isCollapsed ? "Expand Table of Contents" : "Collapse Table of Contents"}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {!isCollapsed && (
        <>
          {headings.length === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 p-4">
              <span className="text-xl mb-1">📖</span>
              <p className="text-xs font-semibold text-slate-600">No Headings Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                {isPreview
                  ? "Headings will appear here automatically when added."
                  : "Add Heading widgets (H1–H6) on your page to generate automatic outline navigation."}
              </p>
            </div>
          ) : (
            <nav className="flex flex-col relative" style={{ gap: `${itemGap}px` }}>
              {headings.map((heading, index) => {
                const isActive = activeHeadingId === heading.id;
                const indent = (heading.levelNum - 1) * indentPerLevel;
                const isH1 = heading.level === "h1";

                return (
                  <button
                    key={heading.id}
                    type="button"
                    onClick={() => handleHeadingClick(heading.id)}
                    className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 text-left cursor-pointer ${
                      isActive
                        ? "font-bold shadow-2xs"
                        : "font-normal hover:bg-slate-100/70"
                    }`}
                    style={{
                      marginLeft: `${indent}px`,
                      color: isActive ? hoverColor : textColor,
                      backgroundColor: isActive ? `${hoverColor}14` : "transparent",
                      fontSize: mergedStyles.fontSize || (isH1 ? "14px" : "13px"),
                    }}
                  >
                    {/* Active Left Accent Bar */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full transition-all"
                        style={{ backgroundColor: hoverColor }}
                      />
                    )}

                    {/* Marker Styles */}
                    {markerStyle === "bullet" && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 transition-transform ${
                          isActive ? "scale-125" : "group-hover:scale-110 opacity-60"
                        }`}
                        style={{ backgroundColor: isActive ? hoverColor : textColor }}
                      />
                    )}

                    {markerStyle === "number" && (
                      <span
                        className={`font-mono text-[10px] font-bold shrink-0 px-1 py-0.5 rounded ${
                          isActive ? "bg-blue-600 text-white" : "opacity-60 bg-slate-100"
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}

                    {markerStyle === "line" && (
                      <span
                        className={`h-0.5 shrink-0 transition-all ${
                          isActive ? "w-4" : "w-2.5 opacity-40 group-hover:w-3.5 group-hover:opacity-100"
                        }`}
                        style={{ backgroundColor: hoverColor }}
                      />
                    )}

                    {markerStyle === "badge" && (
                      <span
                        className="font-mono text-[9px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded border border-slate-200/80 opacity-75"
                        style={{ backgroundColor: `${hoverColor}10`, color: hoverColor }}
                      >
                        {heading.level}
                      </span>
                    )}

                    <span className="truncate flex-1 tracking-tight">{heading.text}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export const CountdownWidgetRenderer = ({
  el,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const targetDateStr = el.countdownTargetDate || "2026-12-31T23:59";
  const showDays = el.countdownShowDays !== false;
  const showHours = el.countdownShowHours !== false;
  const showMinutes = el.countdownShowMinutes !== false;
  const showSeconds = el.countdownShowSeconds !== false;
  const expiredMessage = el.countdownExpiredMessage || "Event Has Ended!";
  const alignment = el.countdownAlignment || "center";
  const gap = el.countdownGap ?? 16;
  const boxBg = el.countdownBoxBg || "#ffffff";
  const boxBorder = el.countdownBoxBorder || "#e2e8f0";
  const boxRadius = el.countdownBoxRadius || "16px";
  const numberColor = el.countdownNumberColor || "#0f172a";
  const numberSize = el.countdownNumberSize || "32px";
  const labelColor = el.countdownLabelColor || "#64748b";
  const labelSize = el.countdownLabelSize || "11px";
  const labelTransform = el.countdownLabelTransform || "uppercase";
  const daysLabel = el.countdownDaysLabel || "Days";
  const hoursLabel = el.countdownHoursLabel || "Hours";
  const minutesLabel = el.countdownMinutesLabel || "Minutes";
  const secondsLabel = el.countdownSecondsLabel || "Seconds";

  const calculateTimeLeft = (targetStr: string) => {
    const targetTime = new Date(targetStr).getTime();
    const now = Date.now();
    const diff = targetTime - now;

    if (isNaN(targetTime) || diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDateStr));

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetDateStr));
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDateStr));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDateStr]);

  const justifyClass =
    alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  if (timeLeft.isExpired) {
    return (
      <div
        className="w-full py-8 px-6 text-center rounded-2xl border shadow-xs flex flex-col items-center justify-center"
        style={{
          backgroundColor: boxBg,
          borderColor: boxBorder,
          borderRadius: boxRadius,
          marginTop: mergedStyles.marginTop,
          marginBottom: mergedStyles.marginBottom,
          fontFamily: mergedStyles.fontFamily,
        }}
      >
        <span className="text-2xl mb-1">⌛</span>
        <h4
          className="font-bold text-base tracking-tight"
          style={{ color: numberColor, fontSize: mergedStyles.fontSize || "18px" }}
        >
          {expiredMessage}
        </h4>
      </div>
    );
  }

  const items = [
    { show: showDays, val: timeLeft.days, label: daysLabel },
    { show: showHours, val: timeLeft.hours, label: hoursLabel },
    { show: showMinutes, val: timeLeft.minutes, label: minutesLabel },
    { show: showSeconds, val: timeLeft.seconds, label: secondsLabel },
  ].filter((item) => item.show);

  return (
    <div
      className={`w-full flex flex-wrap items-center ${justifyClass}`}
      style={{
        gap: `${gap}px`,
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        fontFamily: mergedStyles.fontFamily,
      }}
    >
      {items.map((item, idx) => {
        const valStr = String(item.val).padStart(2, "0");
        return (
          <div
            key={idx}
            className="flex min-w-[76px] flex-col items-center justify-center p-3.5 border shadow-xs transition-transform hover:-translate-y-0.5"
            style={{
              backgroundColor: boxBg,
              borderColor: boxBorder,
              borderRadius: boxRadius,
            }}
          >
            <span
              className="font-extrabold font-mono tracking-tight leading-none"
              style={{
                color: numberColor,
                fontSize: numberSize,
              }}
            >
              {valStr}
            </span>
            <span
              className="font-bold tracking-wider mt-1.5"
              style={{
                color: labelColor,
                fontSize: labelSize,
                textTransform: labelTransform,
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const FacebookPageWidgetRenderer = ({
  el,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const url = el.facebookPageUrl ? el.facebookPageUrl.trim() : "";
  const tabs = el.facebookTabs || "timeline";
  const width = el.facebookWidth ?? 340;
  const height = el.facebookHeight ?? 500;
  const smallHeader = el.facebookSmallHeader ? true : false;
  const adaptContainerWidth = el.facebookAdaptContainerWidth !== false ? true : false;
  const hideCover = el.facebookHideCover ? true : false;
  const showFacepile = el.facebookShowFacepile !== false ? true : false;
  const alignment = el.facebookAlignment || "center";

  const isValidUrl = Boolean(
    url &&
      (url.startsWith("http://") || url.startsWith("https://")) &&
      (url.includes("facebook.com") || url.includes("fb.com"))
  );

  const justifyClass =
    alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  if (!isValidUrl) {
    return (
      <div
        className={`w-full flex ${justifyClass}`}
        style={{
          marginTop: mergedStyles.marginTop,
          marginBottom: mergedStyles.marginBottom,
          fontFamily: mergedStyles.fontFamily,
        }}
      >
        <div
          className="w-full max-w-md p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 text-center flex flex-col items-center justify-center gap-3 shadow-xs"
          style={{
            borderColor: mergedStyles.borderColor || "#bfdbfe",
            borderRadius: mergedStyles.borderRadius || "16px",
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Facebook Page Embed</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              {url ? "Invalid Facebook Page URL provided." : "No Facebook Page URL configured."} Please enter a valid URL (e.g. <span className="font-mono text-blue-600">https://www.facebook.com/facebook</span>) in the inspector panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const embedParams = new URLSearchParams({
    href: url,
    tabs: tabs,
    width: String(width),
    height: String(height),
    small_header: String(smallHeader),
    adapt_container_width: String(adaptContainerWidth),
    hide_cover: String(hideCover),
    show_facepile: String(showFacepile),
    appId: "",
  });

  const embedUrl = `https://www.facebook.com/plugins/page.php?${embedParams.toString()}`;

  return (
    <div
      className={`w-full flex ${justifyClass} overflow-hidden`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
        paddingRight: mergedStyles.paddingRight,
        fontFamily: mergedStyles.fontFamily,
      }}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-slate-200 shadow-xs bg-white"
        style={{
          width: adaptContainerWidth ? "100%" : `${width}px`,
          maxWidth: `${width}px`,
          height: `${height}px`,
          borderRadius: mergedStyles.borderRadius || "12px",
        }}
      >
        <iframe
          src={embedUrl}
          width="100%"
          height={height}
          style={{ border: "none", overflow: "hidden", minWidth: "180px" }}
          scrolling="no"
          frameBorder="0"
          allowFullScreen={true}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          title="Facebook Page Embed"
        />
      </div>
    </div>
  );
};

export const BlockquoteWidgetRenderer = ({
  el,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const quoteText = el.content || el.quoteContent || "The only way to do great work is to love what you do.";
  const author = el.quoteAuthor || "Steve Jobs";
  const citation = el.quoteCitation || "Co-founder, Apple Inc.";
  const alignment = el.quoteAlignment || "left";
  const styleVariant = el.quoteStyle || "accent-left";
  const showIcon = el.quoteShowIcon !== false;
  const iconColor = el.quoteIconColor || "#6366f1";
  const textColor = el.quoteTextColor || "#1e293b";
  const textSize = el.quoteTextSize || "1.125rem";
  const textStyle = el.quoteTextStyle || "italic";
  const authorColor = el.quoteAuthorColor || "#475569";
  const authorSize = el.quoteAuthorSize || "0.875rem";
  const cardBg = el.quoteCardBg || (styleVariant === "boxed" || styleVariant === "top-border" ? "#f8fafc" : "transparent");
  const borderColor = el.quoteBorderColor || "#6366f1";

  const textAlignClass =
    alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left";
  const flexAlignClass =
    alignment === "center" ? "items-center" : alignment === "right" ? "items-end" : "items-start";

  let variantClasses = "";
  const customStyle: React.CSSProperties = {
    marginTop: mergedStyles.marginTop,
    marginBottom: mergedStyles.marginBottom,
    fontFamily: mergedStyles.fontFamily,
    backgroundColor: mergedStyles.backgroundColor !== "transparent" ? mergedStyles.backgroundColor : cardBg,
  };

  if (styleVariant === "accent-left") {
    variantClasses = "border-l-4 pl-5 py-2";
    customStyle.borderLeftColor = borderColor;
  } else if (styleVariant === "boxed") {
    variantClasses = "border rounded-2xl p-6 shadow-xs";
    customStyle.borderColor = mergedStyles.borderColor || borderColor;
    customStyle.borderRadius = mergedStyles.borderRadius || "16px";
  } else if (styleVariant === "top-border") {
    variantClasses = "border-t-4 pt-5 pb-2 px-4 rounded-b-xl shadow-2xs";
    customStyle.borderTopColor = borderColor;
  } else if (styleVariant === "centered-clean") {
    variantClasses = "py-4 px-6 text-center";
  }

  return (
    <figure
      className={`w-full transition-all ${textAlignClass} ${variantClasses}`}
      style={customStyle}
    >
      {showIcon && (
        <div className={`mb-3 flex ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : "justify-start"}`}>
          <svg className="h-8 w-8 opacity-80" fill="currentColor" viewBox="0 0 24 24" style={{ color: iconColor }}>
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>
      )}

      <blockquote
        className={`leading-relaxed font-medium ${textStyle === "italic" ? "italic" : "not-italic"}`}
        style={{
          color: mergedStyles.color && mergedStyles.color !== "inherit" ? mergedStyles.color : textColor,
          fontSize: mergedStyles.fontSize || textSize,
        }}
      >
        "{quoteText}"
      </blockquote>

      {(author || citation) && (
        <figcaption className={`mt-3 flex flex-col ${flexAlignClass}`}>
          {author && (
            <span className="font-semibold tracking-wide" style={{ color: authorColor, fontSize: authorSize }}>
              — {author}
            </span>
          )}
          {citation && (
            <span className="text-xs text-slate-400 font-normal mt-0.5">
              {citation}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
};

export const TemplateWidgetRenderer = ({
  el,
  components,
  onUnpackTemplate,
  onSelectTemplate,
  mergedStyles,
}: {
  el: EditorElement;
  components: Record<string, { name: string; element: EditorElement }>;
  onUnpackTemplate?: (elementId: string) => void;
  onSelectTemplate?: (elementId: string, templateId?: string, presetName?: string) => void;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const templateId = el.templateId;
  const presetName = el.templatePresetName;
  const customComp = templateId ? components[templateId] : undefined;
  const presetComp = presetName ? PRESET_SECTION_TEMPLATES[presetName] : undefined;

  const hasSelectedTemplate = Boolean(customComp || presetComp);

  return (
    <div
      className="w-full transition-all"
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      {hasSelectedTemplate ? (
        <div className="relative group border border-purple-200/80 bg-purple-50/20 rounded-2xl p-4">
          <div className="flex items-center justify-between border-b border-purple-200/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-xs text-purple-700 font-bold">
                🧩
              </span>
              <span className="text-xs font-bold text-purple-900">
                Template: {customComp ? customComp.name : presetComp?.name}
              </span>
            </div>
            {onUnpackTemplate && (
              <button
                type="button"
                onClick={() => onUnpackTemplate(el.id)}
                className="text-[10px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded-md transition shadow-2xs"
                title="Expand this template into editable elements"
              >
                ⚡ Unpack to Canvas
              </button>
            )}
          </div>
          <div className="text-xs text-slate-600">
            {presetComp && <div className="italic text-slate-500 mb-2">{presetComp.description}</div>}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
              <div className="text-xs font-medium text-slate-800">
                {customComp ? `Master Component: ${customComp.element.type}` : `Preset Section: ${presetComp?.name}`}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 p-6 text-center shadow-2xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 mb-3">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-purple-950 mb-1">Reusable Template Widget</h4>
          <p className="text-xs text-purple-700/80 mb-4 max-w-md mx-auto">
            Select a saved reusable component or choose from built-in section templates to insert into your layout.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(PRESET_SECTION_TEMPLATES).map(([key, tpl]) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectTemplate && onSelectTemplate(el.id, undefined, key)}
                className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-purple-800 hover:border-purple-400 hover:bg-purple-50 transition shadow-2xs"
              >
                <span>{tpl.icon}</span>
                <span>{tpl.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ReviewsWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
  onUpdateElement,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
  onUpdateElement?: (updatedEl: EditorElement) => void;
}) => {
  const [localItems, setLocalItems] = useState<ReviewItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReviewerName, setNewReviewerName] = useState("");
  const [newReviewerTitle, setNewReviewerTitle] = useState("");
  const [newReviewText, setNewReviewText] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newVerified, setNewVerified] = useState(true);

  const [avatarInputType, setAvatarInputType] = useState<"url" | "file">("url");

  useEffect(() => {
    setLocalItems(el.reviewItems && el.reviewItems.length > 0 ? el.reviewItems : []);
  }, [el.reviewItems]);

  const reviews = localItems;
  const isGrid = el.reviewLayout !== "list";
  const columns = el.reviewColumns || 3;
  const alignment = el.reviewAlignment || "left";
  const starColor = el.reviewStarColor || "#f59e0b";
  const cardBg = el.reviewCardBg || "#ffffff";
  const borderColor = el.reviewBorderColor || "#e2e8f0";
  const showAvatar = el.reviewShowAvatar !== false;
  const showVerified = el.reviewShowVerified !== false;
  const allowSubmission = el.reviewAllowSubmission !== false;
  const buttonText = el.reviewSubmissionButtonText || "+ Write a Review";

  const textAlignClass =
    alignment === "center" ? "text-center items-center" : alignment === "right" ? "text-right items-end" : "text-left items-start";

  const gridColsStyle = isGrid
    ? {
        gridTemplateColumns:
          columns === 1
            ? "repeat(1, minmax(0, 1fr))"
            : columns === 2
            ? "repeat(auto-fit, minmax(280px, 1fr))"
            : columns === 4
            ? "repeat(auto-fit, minmax(220px, 1fr))"
            : "repeat(auto-fit, minmax(260px, 1fr))",
      }
    : { gridTemplateColumns: "1fr" };

  const handleManualAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewerName.trim() || !newReviewText.trim()) return;

    const newItem: ReviewItem = {
      id: "rev-" + Date.now(),
      reviewerName: newReviewerName.trim(),
      reviewerTitle: newReviewerTitle.trim() || "Verified Customer",
      reviewText: newReviewText.trim(),
      rating: newRating,
      avatarUrl: newAvatarUrl.trim() || undefined,
      verified: newVerified,
    };

    const updated = [...reviews, newItem];
    setLocalItems(updated);
    if (onUpdateElement) {
      onUpdateElement({ ...el, reviewItems: updated });
    }

    setNewReviewerName("");
    setNewReviewerTitle("");
    setNewReviewText("");
    setNewRating(5);
    setNewAvatarUrl("");
    setShowAddModal(false);
  };

  return (
    <div
      className="w-full transition-all"
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      {/* Top Header Action Row (Write a Review button) */}
      {allowSubmission && (
        <div className={`mb-4 flex ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : "justify-start"}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddModal(!showAddModal);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 active:scale-95 cursor-pointer"
          >
            <span>★</span>
            <span>{showAddModal ? "Cancel Manual Review" : buttonText}</span>
          </button>
        </div>
      )}

      {/* Manual Review Entry Form / Modal Card */}
      {showAddModal && (
        <form
          onSubmit={handleManualAddReview}
          onClick={(e) => e.stopPropagation()}
          className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/50 p-5 shadow-sm space-y-4 max-w-lg mx-auto transition-all"
        >
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>✍️</span> Submit Customer Review Manually
            </h4>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          {/* Rating Selection */}
          <div>
            <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
              Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewRating(star)}
                  className="p-0.5 transition hover:scale-125 focus:outline-none cursor-pointer"
                >
                  <svg
                    className="h-6 w-6"
                    fill={star <= newRating ? starColor : "#cbd5e1"}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-amber-800">{newRating} / 5 Stars</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-700 mb-1">Reviewer Name *</label>
              <input
                type="text"
                required
                value={newReviewerName}
                onChange={(e) => setNewReviewerName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-700 mb-1">Title / Role</label>
              <input
                type="text"
                value={newReviewerTitle}
                onChange={(e) => setNewReviewerTitle(e.target.value)}
                placeholder="e.g. Verified Buyer"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-700 mb-1">Review Text *</label>
            <textarea
              rows={3}
              required
              value={newReviewText}
              onChange={(e) => setNewReviewText(e.target.value)}
              placeholder="Share your experience..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-normal text-slate-800 outline-none focus:border-amber-500"
            />
          </div>

          {/* Avatar Image Selection (1 URL given, 2 Upload File from computer/media) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-semibold text-slate-700">Avatar Image (Optional)</label>
              <div className="flex items-center gap-1 bg-amber-100/70 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setAvatarInputType("url")}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded transition cursor-pointer ${
                    avatarInputType === "url" ? "bg-white text-amber-900 shadow-2xs" : "text-amber-700 hover:text-amber-900"
                  }`}
                >
                  1. Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarInputType("file")}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded transition cursor-pointer ${
                    avatarInputType === "file" ? "bg-white text-amber-900 shadow-2xs" : "text-amber-700 hover:text-amber-900"
                  }`}
                >
                  2. 📁 Upload File
                </button>
              </div>
            </div>

            {avatarInputType === "url" ? (
              <input
                type="text"
                value={newAvatarUrl}
                onChange={(e) => setNewAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-amber-500"
              />
            ) : (
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-amber-300 bg-white p-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100/50 cursor-pointer transition">
                  <span>📁</span>
                  <span>{newAvatarUrl ? "Change Uploaded Image" : "Choose Image File from Computer / Media"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === "string") {
                            setNewAvatarUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {newAvatarUrl && (
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-amber-300 bg-slate-100">
                    <img src={newAvatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newVerified}
                onChange={(e) => setNewVerified(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Mark as Verified Reviewer</span>
            </label>

            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition cursor-pointer"
            >
              Submit Review
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
          No customer reviews configured. Click "{buttonText}" above or use the inspector panel to add review items.
        </div>
      ) : (
        <div className="grid gap-4" style={gridColsStyle}>
          {reviews.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition hover:shadow-md ${textAlignClass}`}
              style={{
                backgroundColor: cardBg,
                borderColor: borderColor,
              }}
            >
              <div className={`flex flex-col ${textAlignClass} w-full`}>
                {/* Rating Stars */}
                <div
                  className={`flex items-center gap-1 mb-3 ${
                    alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : "justify-start"
                  }`}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="h-4 w-4"
                      fill={star <= (item.rating || 5) ? starColor : "#cbd5e1"}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal mb-4 italic">
                  "{item.reviewText}"
                </p>
              </div>

              {/* Reviewer Details */}
              <div
                className={`flex items-center gap-3 pt-3 border-t border-slate-100 w-full ${
                  alignment === "center"
                    ? "justify-center"
                    : alignment === "right"
                    ? "justify-end flex-row-reverse"
                    : "justify-start"
                }`}
              >
                {showAvatar && (
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={item.reviewerName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-bold text-slate-600">
                        {item.reviewerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div className={`flex flex-col ${textAlignClass}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{item.reviewerName}</span>
                    {showVerified && (item.verified ?? true) && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full" title="Verified Customer Review">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  {item.reviewerTitle && (
                    <span className="text-[11px] font-medium text-slate-500">{item.reviewerTitle}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* Facebook Button Widget Components (F-197) */
);

/* F-198: Facebook Embed Renderer */
export const FacebookEmbedWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const rawUrl = (el.fbEmbedUrl || "").trim();
  const width = el.fbEmbedWidth || "100%";
  const height = el.fbEmbedHeight || "450px";
  const alignment = el.fbEmbedAlignment || "center";

  const alignClass =
    alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  const formattedUrl = rawUrl
    ? /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`
    : "";

  const embedSrc = formattedUrl
    ? `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(formattedUrl)}&show_text=true&width=500`
    : "";

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      {!formattedUrl ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 p-8 text-center max-w-lg w-full">
          <FacebookEmbedBoxIcon />
          <h4 className="mt-3 text-sm font-bold text-blue-900">Facebook Embed Widget</h4>
          <p className="mt-1 text-xs text-blue-700">
            Enter a Facebook post or video URL in the Inspector panel to embed live content.
          </p>
        </div>
      ) : (
        <div
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs max-w-full"
          style={{ width, height }}
        >
          <iframe
            title="Facebook Embed Content"
            src={embedSrc}
            width="100%"
            height="100%"
            style={{ border: "none", overflow: "hidden" }}
            scrolling="no"
            frameBorder="0"
            allowFullScreen={true}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          />
        </div>
      )}
    </div>
  );
};

/* F-199: Facebook Comments Renderer */
export const FacebookCommentsWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const rawUrl = (el.fbCommentsUrl || "").trim();
  const numPosts = el.fbCommentsNumPosts || 5;
  const width = el.fbCommentsWidth || "100%";
  const alignment = el.fbCommentsAlignment || "center";

  const alignClass =
    alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  const formattedUrl = rawUrl
    ? /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`
    : "https://facebook.com";

  const commentsSrc = `https://www.facebook.com/plugins/comments.php?href=${encodeURIComponent(
    formattedUrl
  )}&numposts=${numPosts}&width=100%25`;

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      <div
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs overflow-hidden max-w-full"
        style={{ width }}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
          <FacebookCommentsBoxIcon />
          <h4 className="text-xs font-bold text-slate-800">Facebook Discussion & Comments</h4>
        </div>
        <iframe
          title="Facebook Comments Plugin"
          src={commentsSrc}
          width="100%"
          height="320"
          style={{ border: "none", overflow: "hidden" }}
          scrolling="no"
          frameBorder="0"
        />
      </div>
    </div>
  );
};

/* F-200: PayPal Button Renderer */
export const PayPalButtonWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const text = el.paypalText || "Pay Now with PayPal";
  const amount = el.paypalAmount || "19.99";
  const currency = el.paypalCurrency || "USD";
  const alignment = el.paypalAlignment || "left";
  const size = el.paypalButtonSize || "md";
  const bgColor = el.paypalBgColor || "#FFC439";
  const textColor = el.paypalTextColor || "#003087";
  const hoverBgColor = el.paypalHoverBgColor || "#f2b522";

  const [isHovered, setIsHovered] = useState(false);

  const alignClass =
    alignment === "center" ? "justify-center text-center" : alignment === "right" ? "justify-end text-right" : "justify-start text-left";

  const sizeStyles =
    size === "sm"
      ? "px-3.5 py-1.5 text-xs gap-1.5"
      : size === "lg"
      ? "px-7 py-3.5 text-base gap-3 font-extrabold"
      : "px-5 py-2.5 text-sm gap-2 font-bold";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPreview) {
      window.open(
        `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&amount=${encodeURIComponent(
          amount
        )}&currency_code=${encodeURIComponent(currency)}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center rounded-full font-sans shadow-xs transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95 ${sizeStyles}`}
        style={{
          backgroundColor: isHovered ? hoverBgColor : bgColor,
          color: textColor,
          borderRadius: mergedStyles.borderRadius,
        }}
      >
        <PayPalButtonBoxIcon />
        <span>{text}</span>
        <span className="text-[11px] opacity-80">({currency} {amount})</span>
      </button>
    </div>
  );
};

/* F-201: Stripe Button Renderer */
export const StripeButtonWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const text = el.stripeText || "Checkout with Stripe";
  const rawCheckoutUrl = (el.stripeCheckoutUrl || "").trim();
  const amount = el.stripeAmount || "$49.00";
  const alignment = el.stripeAlignment || "left";
  const size = el.stripeButtonSize || "md";
  const bgColor = el.stripeBgColor || "#635BFF";
  const textColor = el.stripeTextColor || "#ffffff";
  const hoverBgColor = el.stripeHoverBgColor || "#4b45e4";

  const [isHovered, setIsHovered] = useState(false);

  const alignClass =
    alignment === "center" ? "justify-center text-center" : alignment === "right" ? "justify-end text-right" : "justify-start text-left";

  const sizeStyles =
    size === "sm"
      ? "px-3.5 py-1.5 text-xs gap-1.5"
      : size === "lg"
      ? "px-7 py-3.5 text-base gap-3 font-bold"
      : "px-5 py-2.5 text-sm gap-2 font-semibold";

  const formattedUrl = rawCheckoutUrl
    ? /^https?:\/\//i.test(rawCheckoutUrl)
      ? rawCheckoutUrl
      : `https://${rawCheckoutUrl}`
    : "";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPreview && formattedUrl) {
      window.open(formattedUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center rounded-xl font-sans shadow-xs transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95 ${sizeStyles}`}
        style={{
          backgroundColor: isHovered ? hoverBgColor : bgColor,
          color: textColor,
          borderRadius: mergedStyles.borderRadius,
        }}
      >
        <StripeButtonBoxIcon />
        <span>{text}</span>
        {amount && <span className="text-[11px] opacity-85">({amount})</span>}
      </button>
    </div>
  );
};

/* F-210: Image Carousel Renderer */
export const ImageCarouselWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items: ImageCarouselItem[] = el.imageCarouselItems?.length
    ? el.imageCarouselItems
    : [
        {
          id: "1",
          url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          alt: "Abstract Visual Art",
          caption: "Abstract Geometry",
          title: "Modern Visuals",
        },
        {
          id: "2",
          url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
          alt: "Digital Workspace",
          caption: "Clean Digital Workspace",
          title: "Workspace",
        },
        {
          id: "3",
          url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
          alt: "Responsive Motion",
          caption: "Dynamic Motion",
          title: "Interactive Motion",
        },
      ];

  const rawSlidesPerView = el.imageCarouselSlidesPerView ?? 3;
  const gap = el.imageCarouselGap ?? 16;
  const autoplay = el.imageCarouselAutoplay ?? true;
  const autoplaySpeed = el.imageCarouselAutoplaySpeed ?? 3000;
  const loop = el.imageCarouselLoop ?? true;
  const showNav = el.imageCarouselShowNav ?? true;
  const showDots = el.imageCarouselShowDots ?? true;
  const transition = el.imageCarouselTransition || "slide";
  const imageSizing = el.imageCarouselImageSizing || "cover";
  const height = el.imageCarouselHeight || "320px";
  const alignment = el.imageCarouselAlignment || "center";
  const slideRadius = el.imageCarouselBorderRadius || "16px";
  const aspectRatio = el.imageCarouselAspectRatio || "landscape";

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Device-aware slides per view adjustments
  const containerRef = useRef<HTMLDivElement>(null);
  const [effectiveSlidesPerView, setEffectiveSlidesPerView] = useState<number>(rawSlidesPerView);

  useEffect(() => {
    const updateResponsiveSlides = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      if (width < 640) {
        setEffectiveSlidesPerView(1);
      } else if (width < 1024) {
        setEffectiveSlidesPerView(Math.min(rawSlidesPerView, 2));
      } else {
        setEffectiveSlidesPerView(rawSlidesPerView);
      }
    };

    updateResponsiveSlides();
    window.addEventListener("resize", updateResponsiveSlides);
    return () => window.removeEventListener("resize", updateResponsiveSlides);
  }, [rawSlidesPerView]);

  const maxIndex = Math.max(0, items.length - effectiveSlidesPerView);

  // Keep index in safe range when items or slidesPerView change
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Autoplay Effect
  useEffect(() => {
    if (!autoplay || isHovered || isMouseDown || maxIndex <= 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex) {
          return loop ? 0 : prev;
        }
        return prev + 1;
      });
    }, Math.max(1000, autoplaySpeed));

    return () => clearInterval(timer);
  }, [autoplay, autoplaySpeed, isHovered, isMouseDown, maxIndex, loop]);

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return loop ? maxIndex : 0;
      }
      return prev - 1;
    });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return loop ? 0 : maxIndex;
      }
      return prev + 1;
    });
  };

  // Drag / Swipe handlers
  const handlePointerDown = (clientX: number) => {
    setIsMouseDown(true);
    setDragStartX(clientX);
    setDragOffset(0);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isMouseDown || dragStartX === null) return;
    const diff = clientX - dragStartX;
    setDragOffset(diff);
  };

  const handlePointerUp = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);
    if (Math.abs(dragOffset) > 40) {
      if (dragOffset < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setDragOffset(0);
    setDragStartX(null);
  };

  const alignClass =
    alignment === "left" ? "justify-start text-left" : alignment === "right" ? "justify-end text-right" : "justify-center text-center";

  const getAspectClass = () => {
    switch (aspectRatio) {
      case "square":
        return "aspect-square";
      case "portrait":
        return "aspect-[3/4]";
      case "video":
        return "aspect-video";
      case "landscape":
        return "aspect-[16/10]";
      default:
        return "";
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col ${alignClass} relative group select-none transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isMouseDown) handlePointerUp();
      }}
    >
      <div className="relative w-full overflow-hidden rounded-2xl">
        {transition === "fade" ? (
          /* Fade Transition View */
          <div
            className={`relative w-full overflow-hidden ${getAspectClass()}`}
            style={{ height: aspectRatio === "auto" ? height : undefined }}
            onMouseDown={(e) => handlePointerDown(e.clientX)}
            onMouseMove={(e) => handlePointerMove(e.clientX)}
            onMouseUp={handlePointerUp}
            onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
            onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
            onTouchEnd={handlePointerUp}
          >
            {items.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <div
                  key={item.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <a
                    href={item.linkUrl || "#"}
                    onClick={(e) => {
                      if (!isPreview || !item.linkUrl) e.preventDefault();
                    }}
                    className="block h-full w-full relative overflow-hidden group/slide"
                    style={{ borderRadius: slideRadius }}
                  >
                    <img
                      src={item.url}
                      alt={item.alt || item.title || `Slide ${idx + 1}`}
                      className="h-full w-full transition-transform duration-500 group-hover/slide:scale-105"
                      style={{ objectFit: imageSizing as any }}
                    />
                    {(item.title || item.caption) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white text-left">
                        {item.title && <h4 className="text-sm font-bold leading-tight drop-shadow">{item.title}</h4>}
                        {item.caption && <p className="text-xs text-slate-200 opacity-90 line-clamp-1 mt-0.5">{item.caption}</p>}
                      </div>
                    )}
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          /* Slide Track Transition View */
          <div
            className="overflow-hidden w-full py-1 cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => handlePointerDown(e.clientX)}
            onMouseMove={(e) => handlePointerMove(e.clientX)}
            onMouseUp={handlePointerUp}
            onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
            onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
            onTouchEnd={handlePointerUp}
          >
            <div
              className={`flex ${isMouseDown ? "transition-none" : "transition-transform duration-500 ease-out"}`}
              style={{
                gap: `${gap}px`,
                transform: `translateX(calc(-${currentIndex * (100 / effectiveSlidesPerView)}% - ${
                  currentIndex * (gap / effectiveSlidesPerView)
                }px + ${dragOffset}px))`,
              }}
            >
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="shrink-0 flex flex-col overflow-hidden relative shadow-xs transition duration-300 hover:shadow-md group/slide"
                  style={{
                    width: `calc((100% - ${(effectiveSlidesPerView - 1) * gap}px) / ${effectiveSlidesPerView})`,
                    borderRadius: slideRadius,
                  }}
                >
                  <a
                    href={item.linkUrl || "#"}
                    onClick={(e) => {
                      if (!isPreview || !item.linkUrl) e.preventDefault();
                    }}
                    className={`block w-full relative overflow-hidden ${getAspectClass()}`}
                    style={{ height: aspectRatio === "auto" ? height : undefined }}
                  >
                    <img
                      src={item.url}
                      alt={item.alt || item.title || `Slide ${idx + 1}`}
                      className="h-full w-full transition-transform duration-500 group-hover/slide:scale-105"
                      style={{ objectFit: imageSizing as any }}
                    />
                    {(item.title || item.caption) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 text-white text-left">
                        {item.title && <h4 className="text-xs font-bold leading-tight drop-shadow">{item.title}</h4>}
                        {item.caption && <p className="text-[11px] text-slate-200 opacity-90 line-clamp-1 mt-0.5">{item.caption}</p>}
                      </div>
                    )}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Button */}
        {showNav && maxIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={!loop && currentIndex === 0}
            className={`absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur shadow-md transition-all z-20 cursor-pointer ${
              !loop && currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:scale-110 active:scale-95"
            }`}
            title="Previous Image"
          >
            <span className="text-lg font-bold leading-none">‹</span>
          </button>
        )}

        {/* Next Button */}
        {showNav && maxIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={!loop && currentIndex >= maxIndex}
            className={`absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur shadow-md transition-all z-20 cursor-pointer ${
              !loop && currentIndex >= maxIndex ? "opacity-30 cursor-not-allowed" : "hover:scale-110 active:scale-95"
            }`}
            title="Next Image"
          >
            <span className="text-lg font-bold leading-none">›</span>
          </button>
        )}
      </div>

      {/* Pagination Dots */}
      {showDots && maxIndex > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-3.5 z-20 relative">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx ? "w-6 bg-blue-600 shadow-xs" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              title={`Jump to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* F-202: Lottie Renderer */
export const LottieWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const rawUrl = (el.lottieUrl || "").trim();
  const width = el.lottieWidth || "280px";
  const height = el.lottieHeight || "280px";
  const alignment = el.lottieAlignment || "center";
  const autoplay = el.lottieAutoplay ?? true;
  const loop = el.lottieLoop ?? true;
  const speed = el.lottieSpeed || 1;

  const alignClass =
    alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  // Lottie embed / player iframe source using official dotlottie player CDN
  const animId = rawUrl.split("/").pop()?.replace(".json", "").replace(".lottie", "") || "9844-loading";
  const playerSrc = `https://embed.lottiefiles.com/animation/${animId}?autoplay=${autoplay ? 1 : 0}&loop=${loop ? 1 : 0}&speed=${speed}`;

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-100 bg-transparent flex items-center justify-center"
        style={{ width, height }}
      >
        {!rawUrl ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500 bg-slate-50/80 rounded-2xl w-full h-full border border-dashed border-slate-300">
            <LottieBoxIcon />
            <span className="mt-2 font-bold text-slate-700">Lottie Animation</span>
            <span className="mt-1 text-[11px] text-slate-500">Configure Lottie JSON URL in Inspector</span>
          </div>
        ) : (
          <iframe
            title="Lottie Animation Player"
            src={playerSrc}
            width="100%"
            height="100%"
            style={{ border: "none" }}
          />
        )}
      </div>
    </div>
  );
};

/* F-203: Code Highlight Renderer */
export const CodeHighlightWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const code = el.codeSnippet || `// Welcome to ForgeStudio Code Highlight\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("Developer"));`;
  const language = el.codeLanguage || "typescript";
  const showLineNumbers = el.codeShowLineNumbers ?? true;
  const theme = el.codeTheme || "dark";
  const fontSize = el.codeFontSize || "0.85rem";
  const alignment = el.codeAlignment || "left";

  const [copied, setCopied] = useState(false);

  const lines = code.split("\n");

  const alignClass =
    alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : "justify-start";

  const themeBg = theme === "light" ? "#f8fafc" : theme === "dracula" ? "#282a36" : "#0f172a";
  const themeText = theme === "light" ? "#0f172a" : "#f8fafc";
  const themeBorder = theme === "light" ? "#e2e8f0" : "#334155";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border shadow-sm overflow-hidden font-mono"
        style={{
          backgroundColor: themeBg,
          color: themeText,
          borderColor: themeBorder,
          borderRadius: mergedStyles.borderRadius,
        }}
      >
        {/* Code Header Bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: themeBorder, backgroundColor: "rgba(0,0,0,0.15)" }}
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-xs font-bold uppercase tracking-wider opacity-75">{language}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20 transition cursor-pointer"
          >
            <span>{copied ? "✓ Copied!" : "📋 Copy"}</span>
          </button>
        </div>

        {/* Code Display Area */}
        <div className="p-4 overflow-x-auto" style={{ fontSize }}>
          <pre className="font-mono leading-relaxed">
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                {showLineNumbers && (
                  <span className="table-cell select-none pr-4 text-right opacity-35 font-mono text-[0.8em]">
                    {idx + 1}
                  </span>
                )}
                <span className="table-cell font-mono whitespace-pre">{line || " "}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
};


/* F-205: Mega Menu Renderer */
export const MegaMenuWidgetRenderer = ({
  el,
  isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const defaultItems: MegaMenuItem[] = [
    {
      id: "1",
      title: "Products",
      columns: [
        {
          title: "Core Platform",
          links: [
            { label: "Visual Builder", href: "#", badge: "New" },
            { label: "Design System", href: "#" },
            { label: "SEO & Analytics", href: "#" },
          ],
        },
        {
          title: "Solutions",
          links: [
            { label: "SaaS Agencies", href: "#" },
            { label: "E-Commerce Stores", href: "#" },
            { label: "Enterprise Teams", href: "#", badge: "Pro" },
          ],
        },
      ],
    },
    {
      id: "2",
      title: "Resources",
      columns: [
        {
          title: "Documentation",
          links: [
            { label: "Getting Started Guide", href: "#" },
            { label: "API Reference", href: "#" },
            { label: "Widget Showcase", href: "#" },
          ],
        },
      ],
    },
    { id: "3", title: "Pricing", href: "#pricing" },
  ];

  const items = el.megaMenuItems?.length ? el.megaMenuItems : defaultItems;
  const bgColor = el.megaMenuBgColor || "#ffffff";
  const textColor = el.megaMenuTextColor || "#0f172a";
  const alignment = el.megaMenuAlignment || "center";

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const alignClass =
    alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      <nav
        className="relative w-full max-w-6xl rounded-2xl border border-slate-200 shadow-sm font-sans"
        style={{ backgroundColor: bgColor, color: textColor, borderRadius: mergedStyles.borderRadius }}
      >
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3 font-extrabold text-sm tracking-tight text-blue-600">
            <MegaMenuBoxIcon />
            <span>MegaMenu</span>
          </div>

          <ul className="flex items-center gap-1 sm:gap-4 text-xs font-semibold">
            {items.map((item) => (
              <li
                key={item.id}
                className="relative py-2 px-3 rounded-lg hover:bg-slate-100/70 transition cursor-pointer"
                onMouseEnter={() => setActiveMenuId(item.id)}
                onMouseLeave={() => setActiveMenuId(null)}
              >
                <a href={item.href || "#"} className="flex items-center gap-1" onClick={(e) => !isPreview && e.preventDefault()}>
                  <span>{item.title}</span>
                  {item.columns && item.columns.length > 0 && <span className="text-[10px] opacity-60">▼</span>}
                </a>

                {/* Mega Dropdown Panel */}
                {activeMenuId === item.id && item.columns && item.columns.length > 0 && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 min-w-[480px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-slate-800 grid grid-cols-2 gap-6 animate-fadeIn"
                    style={{ backgroundColor: "#ffffff" }}
                  >
                    {item.columns.map((col, cIdx) => (
                      <div key={cIdx} className="flex flex-col gap-2">
                        <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b pb-1.5 border-slate-100">
                          {col.title}
                        </h5>
                        <ul className="flex flex-col gap-1.5 mt-1">
                          {col.links.map((link, lIdx) => (
                            <li key={lIdx}>
                              <a
                                href={link.href}
                                onClick={(e) => !isPreview && e.preventDefault()}
                                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition"
                              >
                                <span>{link.label}</span>
                                {link.badge && (
                                  <span className="text-[9px] font-extrabold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                    {link.badge}
                                  </span>
                                )}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
};

/* F-206: Off Canvas Renderer */
export const OffCanvasWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
  renderChildren,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
  renderChildren?: (children?: EditorElement[]) => React.ReactNode;
}) => {
  const buttonText = el.offCanvasButtonText || "Open Panel";
  const title = el.offCanvasTitle || "Navigation & Tools";
  const position = el.offCanvasPosition || "right";
  const panelWidth = el.offCanvasWidth || "340px";
  const showOverlay = el.offCanvasOverlay ?? true;
  const btnBg = el.offCanvasButtonBgColor || "#0f172a";
  const btnText = el.offCanvasButtonTextColor || "#ffffff";
  const panelBg = el.offCanvasPanelBgColor || "#ffffff";

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="w-full flex justify-start transition-all"
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition hover:shadow-md active:scale-95 cursor-pointer"
        style={{ backgroundColor: btnBg, color: btnText }}
      >
        <OffCanvasBoxIcon />
        <span>{buttonText}</span>
      </button>

      {/* Slide-in Panel Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Backdrop Overlay */}
          {showOverlay && (
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fadeIn"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Off Canvas Sliding Panel */}
          <div
            className={`fixed top-0 bottom-0 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
              position === "right" ? "right-0" : "left-0"
            }`}
            style={{ width: panelWidth, backgroundColor: panelBg }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">{title}</h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Panel Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {renderChildren ? (
                renderChildren(el.children)
              ) : el.children && el.children.length > 0 ? (
                <div className="space-y-3">
                  {el.children.map((child) => (
                    <div key={child.id} className="p-2 border border-slate-100 rounded-lg">
                      {child.type} widget
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <span>Off-Canvas Panel Content Area</span>
                  <span className="mt-1 text-[10px] text-slate-400">Drag & drop elements here</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* F-212: Basic Media Carousel Renderer */
export const BasicMediaCarouselWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items = el.mediaCarouselItems && el.mediaCarouselItems.length > 0 ? el.mediaCarouselItems : [
    { id: "1", type: "image" as const, url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80", title: "Alpine Lake", caption: "Serene Nature" },
    { id: "2", type: "video" as const, url: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&auto=format&fit=crop&q=80", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Demo Video", caption: "Product Overview" },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesPerView = el.mediaCarouselSlidesPerView || 2;
  const gap = el.mediaCarouselGap ?? 12;
  const showNav = el.mediaCarouselShowNav !== false;
  const showDots = el.mediaCarouselShowDots !== false;
  const autoplay = el.mediaCarouselAutoplay ?? true;
  const speed = el.mediaCarouselAutoplaySpeed || 3000;
  const borderRadius = el.mediaCarouselBorderRadius || "12px";

  useEffect(() => {
    if (!autoplay || items.length <= slidesPerView) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % (items.length - slidesPerView + 1 || 1));
    }, speed);
    return () => clearInterval(timer);
  }, [autoplay, speed, items.length, slidesPerView]);

  return (
    <div
      className="w-full relative transition-all"
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
      }}
    >
      <div className="relative overflow-hidden w-full">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            gap: `${gap}px`,
            transform: `translateX(-${currentIndex * (100 / slidesPerView)}%)`,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="relative flex-shrink-0 group overflow-hidden bg-slate-900 border border-slate-200/50 shadow-sm"
              style={{
                width: `calc((100% - ${(slidesPerView - 1) * gap}px) / ${slidesPerView})`,
                borderRadius,
                height: "220px",
              }}
            >
              <img
                src={item.url || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"}
                alt={item.title || "Media item"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1">
                  {item.type === "video" ? "🎬 Video" : "📷 Image"}
                </span>
                <h5 className="text-xs font-bold leading-tight line-clamp-1">{item.title || "Untitled Media"}</h5>
                {item.caption && <p className="text-[10px] text-slate-300 line-clamp-1">{item.caption}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNav && items.length > slidesPerView && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 text-slate-800 shadow-md flex items-center justify-center text-xs font-bold disabled:opacity-30 hover:bg-white transition z-10"
          >
            ❮
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(items.length - slidesPerView, prev + 1))}
            disabled={currentIndex >= items.length - slidesPerView}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 text-slate-800 shadow-md flex items-center justify-center text-xs font-bold disabled:opacity-30 hover:bg-white transition z-10"
          >
            ❯
          </button>
        </>
      )}

      {showDots && items.length > slidesPerView && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: items.length - slidesPerView + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${currentIndex === idx ? "w-5 bg-blue-600" : "w-2 bg-slate-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* F-214: Basic Gallery Renderer */
export const BasicGalleryWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  elStyle?: React.CSSProperties;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const images = el.basicGalleryImages && el.basicGalleryImages.length > 0 ? el.basicGalleryImages : [
    { id: "1", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80", caption: "Architecture" },
    { id: "2", url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80", caption: "Interior" },
    { id: "3", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80", caption: "Workspace" },
  ];
  const columns = el.basicGalleryColumns || 3;
  const gap = el.basicGalleryGap ?? 12;
  const borderRadius = el.basicGalleryBorderRadius || "12px";

  return (
    <div
      className="w-full grid transition-all"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap}px`,
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
      }}
    >
      {images.map((img) => (
        <div key={img.id} className="group relative overflow-hidden bg-slate-100 shadow-xs" style={{ borderRadius }}>
          <img
            src={img.url}
            alt={img.caption || "Gallery item"}
            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {img.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 p-2 text-center text-white text-[11px] font-medium backdrop-blur-xs">
              {img.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* F-215: Audio Playlist Renderer */
export const AudioPlaylistWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const tracks = el.audioPlaylistTracks && el.audioPlaylistTracks.length > 0 ? el.audioPlaylistTracks : [
    { id: "tr-1", title: "01. Ambient Solar Echoes", artist: "ForgeStudio Soundscapes", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", duration: "06:12" },
    { id: "tr-2", title: "02. Deep Focus Flow", artist: "Acoustic Frequency Labs", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", duration: "07:05" },
    { id: "tr-3", title: "03. Midnight Synthesizer", artist: "Cybernetic Wave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", duration: "05:48" },
  ];
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrack = tracks[activeTrackIndex] || tracks[0];
  const cardBg = el.audioPlaylistCardBg || "#0f172a";
  const textColor = el.audioPlaylistTextColor || "#ffffff";
  const accentColor = el.audioPlaylistAccentColor || "#38bdf8";

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setHasError(false);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
    }
  };

  const handleNext = () => {
    setHasError(false);
    setActiveTrackIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    setHasError(false);
    setActiveTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  return (
    <div
      className="w-full rounded-2xl p-5 shadow-xl transition-all"
      style={{
        backgroundColor: cardBg,
        color: textColor,
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
      }}
    >
      <audio
        ref={audioRef}
        src={activeTrack?.url}
        onEnded={handleNext}
        onError={() => { setHasError(true); setIsPlaying(false); }}
      />
      {/* Current Active Track Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
            🎵 Audio Player
          </span>
          <h4 className="text-sm font-bold mt-0.5">{activeTrack?.title || "No Track Selected"}</h4>
          {activeTrack?.artist && <p className="text-xs text-white/70">{activeTrack.artist}</p>}
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition cursor-pointer"
          >
            ⏮
          </button>
          <button
            onClick={togglePlay}
            className="h-10 w-10 rounded-full flex items-center justify-center text-slate-900 font-bold transition shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={handleNext}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition cursor-pointer"
          >
            ⏭
          </button>
        </div>
      </div>

      {hasError && (
        <div className="p-2 mb-3 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-medium text-center border border-rose-500/30">
          ⚠️ Unable to load audio stream URL
        </div>
      )}

      {/* Playlist Tracks List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {tracks.map((track, idx) => {
          const isActive = idx === activeTrackIndex;
          return (
            <div
              key={track.id}
              onClick={() => {
                setActiveTrackIndex(idx);
                setIsPlaying(true);
                setHasError(false);
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                isActive ? "bg-white/15 border border-white/20 font-bold" : "hover:bg-white/5 opacity-80"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-xs font-mono opacity-60">{idx + 1}</span>
                <span className="text-xs truncate">{track.title}</span>
              </div>
              <span className="text-[11px] font-mono opacity-60 ml-2">{track.duration || "03:30"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* F-219: Dynamic Lightbox Renderer */
export const DynamicLightboxWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const items = el.lightboxItems && el.lightboxItems.length > 0 ? el.lightboxItems : [
    { id: "1", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80", caption: "Serene Alpine Mountain Reflections" },
    { id: "2", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80", caption: "Minimalist Modern Glass Architecture" },
    { id: "3", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80", caption: "Dynamic Vibrant Digital Art Motion" },
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const triggerText = el.lightboxTriggerText || "🔍 Open Dynamic Lightbox";
  const maxWidth = el.lightboxMaxWidth || "900px";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") setIsOpen(false);
      if (e.key === "ArrowRight") setActiveIdx((prev) => (prev + 1) % items.length);
      if (e.key === "ArrowLeft") setActiveIdx((prev) => (prev - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, items.length]);

  return (
    <div
      className="w-full transition-all"
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
      }}
    >
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-slate-800 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>{triggerText}</span>
        <span className="text-xs bg-slate-800 text-blue-400 px-2 py-0.5 rounded-full font-mono">
          {items.length} items
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center font-bold text-lg transition z-50 cursor-pointer"
          >
            ✕
          </button>

          <div className="relative w-full flex flex-col items-center" style={{ maxWidth }}>
            <div className="relative overflow-hidden rounded-2xl bg-black shadow-2xl w-full flex items-center justify-center min-h-[300px] max-h-[70vh]">
              <img
                src={items[activeIdx]?.url}
                alt={items[activeIdx]?.caption || "Lightbox item"}
                className="max-w-full max-h-[70vh] object-contain animate-zoomIn"
              />
              {items[activeIdx]?.caption && (
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white text-center text-sm font-medium">
                  {items[activeIdx].caption}
                </div>
              )}
            </div>

            {items.length > 1 && (
              <>
                <button
                  onClick={() => setActiveIdx((prev) => (prev - 1 + items.length) % items.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center font-bold text-lg transition z-10 cursor-pointer"
                >
                  ❮
                </button>
                <button
                  onClick={() => setActiveIdx((prev) => (prev + 1) % items.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center font-bold text-lg transition z-10 cursor-pointer"
                >
                  ❯
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* F-221: SVG / Custom Icon Renderer */
export const CustomSvgWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const width = el.svgWidth || "64px";
  const height = el.svgHeight || "64px";
  const color = el.svgColor || "#0284c7";
  const alignment = el.svgAlignment || "center";
  const rawSvg = el.svgRawContent || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;

  const sanitizeSvg = (code: string) => {
    return code
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "")
      .replace(/javascript:[^"']*/gi, "#");
  };

  const alignClass = alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
      }}
    >
      <div
        className="inline-flex items-center justify-center transition-transform hover:scale-105"
        style={{ width, height, color }}
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(rawSvg) }}
      />
    </div>
  );
};

/* F-222: Icon Library Renderer */
export const IconLibraryWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview: boolean;
  mergedStyles: ElementStyles;
}) => {
  const iconSize = el.iconSize || 48;
  const iconColor = el.iconColor || "#e11d48";
  const iconBgColor = el.iconBgColor || "#ffe4e6";
  const iconBorderRadius = el.iconBorderRadius || "16px";
  const alignment = el.iconAlignment || "center";

  const alignClass = alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
      }}
    >
      <div
        className="inline-flex items-center justify-center p-3 shadow-xs hover:shadow-md transition hover:scale-105"
        style={{
          width: `${iconSize + 24}px`,
          height: `${iconSize + 24}px`,
          backgroundColor: iconBgColor,
          color: iconColor,
          borderRadius: iconBorderRadius,
        }}
      >
        <span style={{ fontSize: `${iconSize}px` }}>✨</span>
      </div>
    </div>
  );
};

export const NETWORK_BRAND_COLORS: Record<ShareNetworkType, { bg: string; text: string; hoverBg: string }> = {
  facebook: { bg: "#1877F2", text: "#ffffff", hoverBg: "#0d65d9" },
  twitter: { bg: "#000000", text: "#ffffff", hoverBg: "#1a1a1a" },
  linkedin: { bg: "#0A66C2", text: "#ffffff", hoverBg: "#084e96" },
  whatsapp: { bg: "#25D366", text: "#ffffff", hoverBg: "#1da851" },
  pinterest: { bg: "#E60023", text: "#ffffff", hoverBg: "#ad001a" },
  reddit: { bg: "#FF4500", text: "#ffffff", hoverBg: "#cc3700" },
  email: { bg: "#EA4335", text: "#ffffff", hoverBg: "#c5221f" },
  copy: { bg: "#475569", text: "#ffffff", hoverBg: "#334155" },
};

export const renderSocialNetworkIcon = (network: ShareNetworkType, className: string = "h-4 w-4") => {
  switch (network) {
    case "facebook":
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "twitter":
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.7a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 0 0 1.333 4.993L2 22l5.233-1.237a9.98 9.98 0 0 0 4.779 1.221h.004c5.505 0 9.988-4.478 9.989-9.985A9.985 9.985 0 0 0 12.012 2zm.004 16.541h-.003a8.28 8.28 0 0 1-4.223-1.163l-.303-.18-3.137.742.827-3.051-.197-.313a8.27 8.27 0 0 1-1.272-4.436c0-4.568 3.718-8.285 8.288-8.285 2.215 0 4.296.863 5.862 2.43 1.566 1.566 2.428 3.648 2.427 5.862 0 4.569-3.717 8.286-8.287 8.286z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.618 0 12.017 0z" />
        </svg>
      );
    case "reddit":
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.192-.491.957 0 1.73.774 1.73 1.73 0 .741-.47 1.37-1.128 1.616.015.176.024.355.024.536 0 2.709-3.158 4.908-7.054 4.908-3.895 0-7.053-2.199-7.053-4.908 0-.174.008-.348.022-.519C4.12 13.36 3.666 12.738 3.666 12c0-.956.774-1.73 1.73-1.73.473 0 .899.19 1.21.503 1.189-.844 2.83-1.401 4.639-1.482l.987-4.63 3.39.715a1.248 1.248 0 0 1 1.388-.632zM9.54 13.064c-.66 0-1.196.536-1.196 1.196 0 .66.536 1.196 1.196 1.196.66 0 1.196-.536 1.196-1.196 0-.66-.536-1.196-1.196-1.196zm4.92 0c-.66 0-1.196.536-1.196 1.196 0 .66.536 1.196 1.196 1.196.66 0 1.196-.536 1.196-1.196 0-.66-.536-1.196-1.196-1.196zm-4.39 3.935a.394.394 0 0 0-.276.674c.78.78 2.05.992 3.197.992 1.147 0 2.417-.212 3.197-.992a.395.395 0 0 0-.558-.558c-.593.593-1.636.78-2.639.78-1.003 0-2.046-.187-2.639-.78a.392.392 0 0 0-.282-.116z" />
        </svg>
      );
    case "email":
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "copy":
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
  }
};

export const getSocialShareUrl = (network: ShareNetworkType, targetUrl: string, shareTitle?: string): string => {
  const currentLoc = typeof window !== "undefined" ? window.location.href : "";
  const rawTarget = (targetUrl && targetUrl.trim() !== "#" && targetUrl.trim() !== "") ? targetUrl.trim() : currentLoc;
  const url = encodeURIComponent(rawTarget);
  const titleText = shareTitle || (typeof document !== "undefined" && document.title ? document.title : "Check this out");
  const title = encodeURIComponent(titleText);
  const whatsappMsg = encodeURIComponent(`${titleText}\n${rawTarget}`);
  const emailBody = encodeURIComponent(`Check this page: ${rawTarget}`);

  switch (network) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case "whatsapp":
      return `https://wa.me/?text=${whatsappMsg}`;
    case "pinterest":
      return `https://pinterest.com/pin/create/button/?url=${url}&description=${title}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${url}&title=${title}`;
    case "email":
      return `mailto:?subject=${title}&body=${emailBody}`;
    case "copy":
      return "#copy";
    default:
      return "#";
  }
};

export const ShareButtonsWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview?: boolean;
  mergedStyles: ElementStyles;
}) => {
  const networks = el.shareNetworks && el.shareNetworks.length > 0 ? el.shareNetworks : [];
  const layout = el.shareLayout || "horizontal";
  const align = el.shareAlignment || "left";
  const gap = el.shareGap ?? 10;
  const showLabels = el.shareShowLabels !== false;
  const buttonStyle = el.shareButtonStyle || "brand";
  const buttonSize = el.shareButtonSize || "md";

  const [copiedNetId, setCopiedNetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  let sizePadding = "8px 16px";
  let sizeFontSize = "13px";
  let iconSizeClass = "h-4 w-4";

  if (buttonSize === "sm") {
    sizePadding = "6px 12px";
    sizeFontSize = "12px";
    iconSizeClass = "h-3.5 w-3.5";
  } else if (buttonSize === "lg") {
    sizePadding = "12px 22px";
    sizeFontSize = "15px";
    iconSizeClass = "h-5 w-5";
  }

  const getFlexJustify = (alignment: string) => {
    if (alignment === "center") return "center";
    if (alignment === "right") return "flex-end";
    return "flex-start";
  };

  const handleShareClick = async (net: ShareNetworkItem, e: React.MouseEvent) => {
    e.preventDefault();

    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const targetUrl = (net.customUrl && net.customUrl.trim() !== "#" && net.customUrl.trim() !== "")
      ? net.customUrl.trim()
      : pageUrl;
    const shareTitle = (typeof document !== "undefined" && document.title) ? document.title : "Check this out";

    if (net.network === "copy") {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(targetUrl);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = targetUrl;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setCopiedNetId(net.id);
        setToastMessage("Link copied!");
        setTimeout(() => {
          setCopiedNetId(null);
          setToastMessage(null);
        }, 2000);
      } catch {
        setToastMessage("Unable to copy link.");
        setTimeout(() => setToastMessage(null), 3000);
      }
      return;
    }

    const shareUrl = getSocialShareUrl(net.network, targetUrl, shareTitle);

    if (net.network === "email") {
      window.location.href = shareUrl;
      return;
    }

    if (shareUrl && shareUrl.startsWith("http")) {
      const popupWindow = window.open(
        shareUrl,
        "_blank",
        "width=600,height=500,scrollbars=yes,resizable=yes"
      );
      if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === "undefined") {
        window.open(shareUrl, "_blank");
      }
    }
  };

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }} className="relative">
      {toastMessage && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-slate-900 text-white px-3 py-1 text-[11px] font-bold shadow-lg animate-in fade-in zoom-in-95">
          {toastMessage}
        </div>
      )}
      {networks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center bg-slate-50/50">
          <p className="text-xs font-bold text-slate-600">No Share Buttons Configured</p>
          <p className="text-[10px] text-slate-400 mt-1">Use the right properties panel to add social networks.</p>
        </div>
      ) : (
        <div
          className={`flex ${layout === "vertical" ? "flex-col" : "flex-row flex-wrap"}`}
          style={{
            gap: `${gap}px`,
            justifyContent: getFlexJustify(align),
            alignItems: layout === "vertical" ? (align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start") : "center",
          }}
        >
          {networks.map((net) => {
            const brand = NETWORK_BRAND_COLORS[net.network] || { bg: "#475569", text: "#ffffff", hoverBg: "#334155" };

            let btnBg = brand.bg;
            let btnText = brand.text;
            let btnBorder = "1px solid transparent";

            if (buttonStyle === "solid") {
              btnBg = mergedStyles.backgroundColor || "#2563eb";
              btnText = mergedStyles.color || "#ffffff";
            } else if (buttonStyle === "outline") {
              btnBg = "transparent";
              btnText = brand.bg;
              btnBorder = `1px solid ${brand.bg}`;
            }

            const isCopied = net.id === copiedNetId;
            const displayLabel = isCopied
              ? "Link copied!"
              : (net.label || (net.network === "twitter" ? "Tweet" : net.network === "copy" ? "Copy Link" : net.network));

            return (
              <a
                key={net.id}
                href="#"
                onClick={(e) => handleShareClick(net, e)}
                className="inline-flex items-center gap-2 rounded-lg font-semibold transition shadow-xs hover:opacity-90 active:scale-95 cursor-pointer"
                style={{
                  padding: sizePadding,
                  fontSize: sizeFontSize,
                  backgroundColor: isCopied ? "#059669" : btnBg,
                  color: btnText,
                  border: btnBorder,
                  fontFamily: mergedStyles.fontFamily,
                  borderRadius: mergedStyles.borderRadius || "8px",
                  textDecoration: "none",
                }}
                title={isCopied ? "Link copied!" : `Share on ${net.network}`}
              >
                {renderSocialNetworkIcon(net.network, iconSizeClass)}
                {showLabels && <span>{displayLabel}</span>}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Colorful placeholder icon inside empty image box

// ==========================================
// WOOCOMMERCE STORE WIDGET RENDERERS
// ==========================================

export const WcProductTitleWidgetRenderer: React.FC<{ el: EditorElement; getMergedStyles: any; activeDevice: DeviceMode }> = ({ el, getMergedStyles, activeDevice }) => {
  const styles = getMergedStyles(el, activeDevice);
  return <h2 style={styles} className="font-bold text-slate-900">{el.content || "Sample Product Title"}</h2>;
};

export const WcProductPriceWidgetRenderer: React.FC<{ el: EditorElement; getMergedStyles: any; activeDevice: DeviceMode }> = ({ el, getMergedStyles, activeDevice }) => {
  const styles = getMergedStyles(el, activeDevice);
  return <div style={styles} className="text-xl font-bold text-emerald-600">{el.content || "$99.99"}</div>;
};

export const WcProductImagesWidgetRenderer: React.FC<{ el: EditorElement; getMergedStyles: any; activeDevice: DeviceMode }> = ({ el, getMergedStyles, activeDevice }) => {
  const styles = getMergedStyles(el, activeDevice);
  return (
    <div style={styles} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
      <img src={el.content || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"} alt="Product" className="h-auto w-full rounded-lg object-cover" />
    </div>
  );
};

export const WcAddToCartWidgetRenderer: React.FC<{ el: EditorElement; getMergedStyles: any; activeDevice: DeviceMode }> = ({ el, getMergedStyles, activeDevice }) => {
  const styles = getMergedStyles(el, activeDevice);
  return (
    <button style={styles} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white shadow-md transition hover:bg-slate-800">
      🛒 {el.content || "Add to Cart"}
    </button>
  );
};

export const WcProductRatingWidgetRenderer: React.FC<{ el: EditorElement; getMergedStyles: any; activeDevice: DeviceMode }> = ({ el, getMergedStyles, activeDevice }) => {
  const styles = getMergedStyles(el, activeDevice);
  return (
    <div style={styles} className="flex items-center gap-1 text-amber-400 font-bold">
      ⭐⭐⭐⭐⭐ <span className="text-xs text-slate-500 ml-1">(4.9 / 5.0 - 128 Reviews)</span>
    </div>
  );
};
