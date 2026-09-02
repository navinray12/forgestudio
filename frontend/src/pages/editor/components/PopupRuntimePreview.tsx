import { useEffect, useState } from "react";
import type { PopupConfig } from "../../../types/popup.types";
import type { EditorElement } from "../WebsiteEditor";

interface PopupRuntimePreviewProps {
  popups: PopupConfig[];
  renderElementTree: (el: EditorElement) => React.ReactNode;
  onTrackView?: (popupId: string) => void;
  onTrackClick?: (popupId: string) => void;
  isPreviewMode?: boolean;
  globalSettings?: any;
}

export default function PopupRuntimePreview({
  popups,
  renderElementTree,
  onTrackView,
  onTrackClick,
  isPreviewMode = true,
  globalSettings,
}: PopupRuntimePreviewProps) {
  const [openPopupIds, setOpenPopupIds] = useState<Set<string>>(new Set());
  const [showSimulationBar, setShowSimulationBar] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Frequency Check Helper
  const canShowPopup = (popup: PopupConfig): boolean => {
    if (popup.isActive === false) return false;

    const { frequencyCap, frequencyDays } = popup.targeting;
    if (frequencyCap === "once-per-session") {
      const seen = sessionStorage.getItem(`popup_seen_${popup.id}`);
      if (seen) return false;
    } else if (frequencyCap === "once-every-x-days") {
      const lastSeen = localStorage.getItem(`popup_last_seen_${popup.id}`);
      if (lastSeen) {
        const diffDays = (Date.now() - Number(lastSeen)) / (1000 * 60 * 60 * 24);
        if (diffDays < (frequencyDays || 7)) return false;
      }
    }
    return true;
  };

  const markPopupShown = (popup: PopupConfig) => {
    if (popup.targeting.frequencyCap === "once-per-session") {
      sessionStorage.setItem(`popup_seen_${popup.id}`, "true");
    } else if (popup.targeting.frequencyCap === "once-every-x-days") {
      localStorage.setItem(`popup_last_seen_${popup.id}`, String(Date.now()));
    }
    if (onTrackView) onTrackView(popup.id);
  };

  const openPopup = (popupId: string) => {
    const p = popups.find((x) => x.id === popupId);
    if (!p) return;
    setOpenPopupIds((prev) => {
      const next = new Set(prev);
      next.add(popupId);
      return next;
    });
    markPopupShown(p);
  };

  const closePopup = (popupId: string) => {
    setOpenPopupIds((prev) => {
      const next = new Set(prev);
      next.delete(popupId);
      return next;
    });
  };

  // Smart Link Resolver (F-291)
  const handleSmartLink = (href: string | undefined): boolean => {
    if (!href) return false;
    const cleanHref = href.trim();

    // 1. popup:open(id) or popup:id
    if (cleanHref.startsWith("popup:open(") && cleanHref.endsWith(")")) {
      const popupId = cleanHref.substring("popup:open(".length, cleanHref.length - 1).trim();
      openPopup(popupId);
      return true;
    } else if (cleanHref.startsWith("popup:") && cleanHref !== "popup:close") {
      const popupId = cleanHref.replace("popup:", "").trim();
      openPopup(popupId);
      return true;
    }

    // 2. popup:close
    if (cleanHref === "popup:close") {
      setOpenPopupIds(new Set());
      return true;
    }

    // 3. scroll:to(id) or #id
    if (cleanHref.startsWith("scroll:to(") && cleanHref.endsWith(")")) {
      const elementId = cleanHref.substring("scroll:to(".length, cleanHref.length - 1).trim();
      const el = document.getElementById(elementId) || document.querySelector(`[data-element-id="${elementId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
    } else if (cleanHref.startsWith("#") && cleanHref.length > 1) {
      const elementId = cleanHref.substring(1);
      const el = document.getElementById(elementId) || document.querySelector(`[data-element-id="${elementId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
    }

    return false;
  };

  // Trigger Evaluators (F-283) & Smart Links delegation
  useEffect(() => {
    const activePopups = popups.filter((p) => p.isActive !== false && canShowPopup(p));
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 1. Page Load Timers
    activePopups.forEach((popup) => {
      const loadTrigger = popup.triggers.find((t) => t.type === "load");
      if (loadTrigger) {
        const delay = (loadTrigger.delaySeconds ?? 3) * 1000;
        const timer = setTimeout(() => {
          openPopup(popup.id);
        }, delay);
        timers.push(timer);
      }
    });

    // 2. Scroll Depth Listener & Back To Top Tracker
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

      const backToTopThreshold = globalSettings?.backToTop?.offset ?? 300;
      setShowBackToTop(scrollY > backToTopThreshold);

      activePopups.forEach((popup) => {
        const scrollTrigger = popup.triggers.find((t) => t.type === "scroll");
        if (scrollTrigger && scrollPercent >= (scrollTrigger.scrollPercentage ?? 50)) {
          openPopup(popup.id);
        }
      });
    };

    // 3. Exit Intent Listener
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) {
        activePopups.forEach((popup) => {
          const exitTrigger = popup.triggers.find((t) => t.type === "exit-intent");
          if (exitTrigger) {
            openPopup(popup.id);
          }
        });
      }
    };

    // 4. Inactivity Timer
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      activePopups.forEach((popup) => {
        const idleTrigger = popup.triggers.find((t) => t.type === "inactivity");
        if (idleTrigger) {
          idleTimer = setTimeout(() => {
            openPopup(popup.id);
          }, (idleTrigger.inactivitySeconds ?? 20) * 1000);
        }
      });
    };

    // 5. Click Selector & Smart Link Listener
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check Smart Links
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (anchor && anchor.getAttribute("href")) {
        const href = anchor.getAttribute("href") || "";
        if (handleSmartLink(href)) {
          e.preventDefault();
          return;
        }
      }

      // Check CSS Click Selectors for popups
      activePopups.forEach((popup) => {
        const clickTrigger = popup.triggers.find((t) => t.type === "click");
        if (clickTrigger?.selector && target.closest(clickTrigger.selector)) {
          e.preventDefault();
          openPopup(popup.id);
        }
      });
    };

    // 6. Escape Key Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenPopupIds(new Set());
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mousemove", resetIdleTimer, { passive: true });
    document.addEventListener("keydown", resetIdleTimer, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);

    resetIdleTimer();
    handleScroll();

    return () => {
      timers.forEach(clearTimeout);
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mousemove", resetIdleTimer);
      document.removeEventListener("keydown", resetIdleTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [popups, globalSettings]);

  const resetAllFrequencyStorage = () => {
    popups.forEach((p) => {
      sessionStorage.removeItem(`popup_seen_${p.id}`);
      localStorage.removeItem(`popup_last_seen_${p.id}`);
    });
    alert("Frequency capping storage reset for all popups.");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getAnimationClass = (anim: PopupConfig["entranceAnimation"]) => {
    switch (anim) {
      case "fade":
        return "animate-in fade-in duration-300";
      case "zoom":
        return "animate-in zoom-in-95 fade-in duration-300";
      case "slide-up":
        return "animate-in slide-in-from-bottom-10 fade-in duration-300";
      case "slide-down":
        return "animate-in slide-in-from-top-10 fade-in duration-300";
      case "slide-left":
        return "animate-in slide-in-from-left-10 fade-in duration-300";
      case "slide-right":
        return "animate-in slide-in-from-right-10 fade-in duration-300";
      default:
        return "animate-in fade-in duration-300";
    }
  };

  const fab = globalSettings?.floatingActionButton;
  const backToTop = globalSettings?.backToTop;

  return (
    <>
      {/* Active Popups Rendering (F-282, F-286, F-288) */}
      {popups.map((popup) => {
        const isOpen = openPopupIds.has(popup.id);
        if (!isOpen) return null;

        // Slide-in positioning classes
        let positionWrapperClass = "fixed inset-0 z-50 flex items-center justify-center p-4";
        if (popup.layoutMode === "slide-in") {
          switch (popup.slidePosition) {
            case "left":
              positionWrapperClass = "fixed inset-y-0 left-0 z-50 flex items-center p-4 pointer-events-none";
              break;
            case "right":
              positionWrapperClass = "fixed inset-y-0 right-0 z-50 flex items-center p-4 pointer-events-none";
              break;
            case "bottom-left":
              positionWrapperClass = "fixed bottom-4 left-4 z-50 flex items-end pointer-events-none";
              break;
            case "bottom-right":
            default:
              positionWrapperClass = "fixed bottom-4 right-4 z-50 flex items-end pointer-events-none";
              break;
          }
        } else if (popup.layoutMode === "hello-bar") {
          positionWrapperClass =
            popup.helloBarPosition === "bottom"
              ? "fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none"
              : "fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none";
        } else if (popup.layoutMode === "full-screen") {
          positionWrapperClass = "fixed inset-0 z-50 flex items-center justify-center p-0";
        }

        return (
          <div key={popup.id} className={positionWrapperClass}>
            {/* Backdrop Overlay */}
            {popup.backdropOverlay && (
              <div
                onClick={() => popup.closeOnBackdropClick && closePopup(popup.id)}
                className="fixed inset-0 transition-opacity animate-in fade-in duration-300 pointer-events-auto"
                style={{ backgroundColor: popup.backdropColor || "rgba(15, 23, 42, 0.65)" }}
              />
            )}

            {/* Popup Box Frame */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                // F-290: Conversion Click Tracking
                const target = e.target as HTMLElement;
                if (target.closest("button") || target.closest("a")) {
                  if (onTrackClick) onTrackClick(popup.id);
                }
              }}
              style={{
                width: popup.width || "580px",
                maxWidth: "100%",
                height: popup.height || "auto",
              }}
              className={`relative z-10 pointer-events-auto ${getAnimationClass(
                popup.entranceAnimation
              )} ${
                popup.layoutMode === "hello-bar"
                  ? "w-full shadow-lg"
                  : popup.layoutMode === "full-screen"
                  ? "w-full h-full flex flex-col justify-center items-center"
                  : "rounded-2xl"
              }`}
            >
              {/* Close Button */}
              {popup.closeButton && (
                <button
                  onClick={() => closePopup(popup.id)}
                  className={`absolute z-30 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900 shadow-md transition ${
                    popup.closeButtonPosition === "outside"
                      ? "-top-3 -right-3"
                      : "top-3 right-3"
                  }`}
                >
                  ✕
                </button>
              )}

              {/* Render Elements inside Popup */}
              <div className="w-full">
                {popup.elements.map((el) => renderElementTree(el))}
              </div>
            </div>
          </div>
        );
      })}

      {/* F-289: Back To Top Floating Button */}
      {backToTop?.enabled !== false && showBackToTop && (
        <button
          onClick={scrollToTop}
          title="Back to top"
          style={{
            backgroundColor: backToTop?.color || "#2563eb",
            color: backToTop?.iconColor || "#ffffff",
          }}
          className={`fixed z-40 flex h-11 w-11 items-center justify-center rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 animate-in fade-in zoom-in-75 ${
            backToTop?.position === "bottom-left" ? "bottom-6 left-6" : "bottom-6 right-6"
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}

      {/* F-287: Persistent Floating Action Button (FAB) */}
      {fab?.enabled && (
        <div
          className={`fixed z-40 flex items-center gap-2 ${
            fab.position === "bottom-left" ? "bottom-6 left-6" : "bottom-6 right-6"
          }`}
        >
          <button
            onClick={() => {
              if (fab.link) {
                if (!handleSmartLink(fab.link)) {
                  window.open(fab.link, "_blank", "noopener,noreferrer");
                }
              }
            }}
            style={{
              backgroundColor: fab.backgroundColor || "#25D366",
              color: fab.textColor || "#ffffff",
            }}
            className="flex items-center gap-2.5 rounded-full px-4 py-3 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 group"
          >
            {/* WhatsApp or Generic Chat Icon */}
            {fab.icon === "whatsapp" ? (
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.072-2.128-.521-1.615-.67-2.66-2.307-2.74-2.414-.081-.107-.655-.873-.655-1.666 0-.793.414-1.183.56-1.341.144-.158.315-.198.421-.198.106 0 .211.002.304.007.098.005.23-.037.36.275.135.324.46 1.121.501 1.202.041.082.068.178.014.285-.054.108-.081.176-.162.271-.08.095-.17.212-.243.285-.081.082-.167.171-.072.335.095.163.42 6.94 1.196 1.48.337.3.621.393.71.434.089.041.142.035.195-.027.054-.062.23-.269.292-.363.062-.095.125-.08.208-.049.083.031.529.25 1.203.585.114.057.19.086.218.132.027.046.027.27-.117.675z" />
              </svg>
            ) : fab.icon === "phone" ? (
              <span className="text-base">📞</span>
            ) : fab.icon === "email" ? (
              <span className="text-base">✉️</span>
            ) : (
              <span className="text-base">💬</span>
            )}
            {fab.label && <span className="text-xs font-bold whitespace-nowrap">{fab.label}</span>}
          </button>
        </div>
      )}

      {/* F-291: Live Preview Testing Simulation Drawer */}
      {isPreviewMode && (
        <div className="fixed bottom-3 left-3 z-50 font-sans">
          {showSimulationBar ? (
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/90 text-white shadow-2xl backdrop-blur-md p-3.5 flex flex-col gap-2 max-w-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200">Popup Runtime Simulation</span>
                </div>
                <button
                  onClick={() => setShowSimulationBar(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-1"
                >
                  −
                </button>
              </div>

              {popups.length === 0 ? (
                <p className="text-[11px] text-slate-400">No popups in this project.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {popups.map((p) => {
                    const isOpen = openPopupIds.has(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-slate-800/80 px-2.5 py-1.5 text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold block truncate text-[11px]">{p.name}</span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {p.layoutMode} • {p.triggers.map((t) => t.type).join(", ") || "Manual"}
                          </span>
                        </div>
                        <button
                          onClick={() => (isOpen ? closePopup(p.id) : openPopup(p.id))}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition shrink-0 ${
                            isOpen
                              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                              : "bg-blue-600 text-white hover:bg-blue-500"
                          }`}
                        >
                          {isOpen ? "Close" : "Trigger"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                <button
                  onClick={resetAllFrequencyStorage}
                  className="text-slate-400 hover:text-slate-200 underline"
                >
                  Reset Cookies & Limits
                </button>
                <span className="text-slate-400">Esc to close all</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSimulationBar(true)}
              className="rounded-full bg-slate-900 border border-slate-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xl hover:bg-slate-800 flex items-center gap-2"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              Popup Tester ({popups.length})
            </button>
          )}
        </div>
      )}
    </>
  );
}
