import type { InteractionRule } from "../types";

/**
 * Transform state per element to ensure centralized transform-composition.
 * Prevents mouse track, tilt, scroll effects, and static transforms
 * from overwriting each other.
 */
interface ElementTransformState {
  base: string;
  mouseTrackX: number;
  mouseTrackY: number;
  tiltRotateX: number;
  tiltRotateY: number;
  scrollTranslateX: number;
  scrollTranslateY: number;
  scrollRotate: number;
  scrollScale: number;
}

const transformStates = new WeakMap<HTMLElement, ElementTransformState>();

function getOrCreateTransformState(el: HTMLElement): ElementTransformState {
  let state = transformStates.get(el);
  if (!state) {
    const computed = window.getComputedStyle(el).transform;
    const base = computed && computed !== "none" ? computed : (el.style.transform || "");
    state = {
      base: base === "none" ? "" : base,
      mouseTrackX: 0,
      mouseTrackY: 0,
      tiltRotateX: 0,
      tiltRotateY: 0,
      scrollTranslateX: 0,
      scrollTranslateY: 0,
      scrollRotate: 0,
      scrollScale: 1,
    };
    transformStates.set(el, state);
  }
  return state;
}

function applyComposedTransform(el: HTMLElement, state: ElementTransformState) {
  const parts: string[] = [];
  if (state.base) {
    parts.push(state.base);
  }
  if (state.scrollTranslateX !== 0 || state.scrollTranslateY !== 0) {
    parts.push(`translate3d(${state.scrollTranslateX.toFixed(2)}px, ${state.scrollTranslateY.toFixed(2)}px, 0)`);
  }
  if (state.mouseTrackX !== 0 || state.mouseTrackY !== 0) {
    parts.push(`translate3d(${state.mouseTrackX.toFixed(2)}px, ${state.mouseTrackY.toFixed(2)}px, 0)`);
  }
  if (state.tiltRotateX !== 0 || state.tiltRotateY !== 0) {
    parts.push(`perspective(800px) rotateX(${state.tiltRotateX.toFixed(2)}deg) rotateY(${state.tiltRotateY.toFixed(2)}deg)`);
  }
  if (state.scrollRotate !== 0) {
    parts.push(`rotate(${state.scrollRotate.toFixed(2)}deg)`);
  }
  if (state.scrollScale !== 1) {
    parts.push(`scale(${state.scrollScale.toFixed(3)})`);
  }
  el.style.transform = parts.join(" ");
}

/**
 * Safely queries a selector, catching invalid selector syntax DOMExceptions,
 * and falling back to data-el-id attribute or element ID matching.
 */
function safeQuerySelector<T extends Element = HTMLElement>(selector: string | null | undefined): T | null {
  if (!selector || typeof selector !== "string") return null;
  const trimmed = selector.trim();
  if (!trimmed) return null;
  try {
    const found = document.querySelector<T>(trimmed);
    if (found) return found;
  } catch {}
  try {
    const escaped = CSS.escape ? CSS.escape(trimmed) : trimmed;
    const foundByElId = document.querySelector<T>(`[data-el-id="${escaped}"]`);
    if (foundByElId) return foundByElId;
  } catch {}
  try {
    const foundById = document.getElementById(trimmed);
    if (foundById) return foundById as unknown as T;
  } catch {}
  return null;
}

export interface MotionRuntimeController {
  cleanup: () => void;
  refresh: () => void;
}

/**
 * Initializes the entire Motion & Interaction runtime:
 * - Entrance animations (IntersectionObserver with reduced-motion support)
 * - Hover motion (reliable scoped CSS injection with CSS escaping)
 * - Sticky positioning fallback / sync
 * - Mouse Track & 3D Tilt (rAF pointer tracker with touch check & transform composition)
 * - Scroll effects: Parallax, Transparency, Rotate, Scale, Blur
 * - Multi-rule Interaction Engine (safe selectors, allowlisted actions, keyboard accessibility)
 */
export function initMotionRuntime(root: HTMLElement | Document = document): MotionRuntimeController {
  const cleanupFns: (() => void)[] = [];
  const modifiedElements = new Set<HTMLElement>();

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Entrance Animations via IntersectionObserver
  // ──────────────────────────────────────────────────────────────────────────
  if (!prefersReducedMotion) {
    const entranceElements = root.querySelectorAll<HTMLElement>("[data-entrance]:not([data-entrance='none'])");
    if (entranceElements.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const target = entry.target as HTMLElement;
            const isReplay = target.getAttribute("data-entrance-replay") === "true";

            if (entry.isIntersecting) {
              const dur = target.getAttribute("data-entrance-dur");
              const delay = target.getAttribute("data-entrance-delay");
              if (dur) target.style.setProperty("--fs-entrance-dur", dur);
              if (delay) target.style.setProperty("--fs-entrance-delay", delay);

              target.classList.add("fs-entrance-active");
              target.style.opacity = "1";
              modifiedElements.add(target);

              if (!isReplay) {
                observer.unobserve(target);
              }
            } else if (isReplay) {
              target.classList.remove("fs-entrance-active");
              target.style.opacity = "0";
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
      );

      entranceElements.forEach((el) => observer.observe(el));
      cleanupFns.push(() => observer.disconnect());
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Hover Motion: Scoped CSS Injection
  // ──────────────────────────────────────────────────────────────────────────
  const hoverElements = root.querySelectorAll<HTMLElement>(
    "[data-hover-scale], [data-hover-rotate], [data-hover-translate-y], [data-hover-opacity]"
  );

  if (hoverElements.length > 0) {
    const styleId = "fs-motion-hover-styles";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    let cssRules = "";
    hoverElements.forEach((el) => {
      const elId = el.getAttribute("data-el-id") || el.id;
      if (!elId) return;

      const scale = el.getAttribute("data-hover-scale");
      const rotate = el.getAttribute("data-hover-rotate");
      const translateY = el.getAttribute("data-hover-translate-y");
      const opacity = el.getAttribute("data-hover-opacity");
      const dur = el.getAttribute("data-hover-dur") || "300ms";

      const escapedId = CSS.escape ? CSS.escape(elId) : elId;
      const selector = el.getAttribute("data-el-id")
        ? `[data-el-id="${escapedId}"]`
        : `#${escapedId}`;

      const transformParts: string[] = [];
      if (translateY) transformParts.push(`translateY(${translateY.endsWith("px") ? translateY : translateY + "px"})`);
      if (rotate) transformParts.push(`rotate(${rotate.endsWith("deg") ? rotate : rotate + "deg"})`);
      if (scale) transformParts.push(`scale(${scale})`);

      const hoverProps: string[] = [];
      if (transformParts.length > 0) {
        hoverProps.push(`transform: ${transformParts.join(" ")} !important;`);
      }
      if (opacity) {
        hoverProps.push(`opacity: ${opacity} !important;`);
      }

      if (hoverProps.length > 0) {
        cssRules += `
          ${selector} {
            transition: transform ${dur} cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${dur} ease !important;
          }
          ${selector}:hover {
            ${hoverProps.join(" ")}
          }
        `;
      }
    });

    styleTag.textContent = cssRules;
    cleanupFns.push(() => {
      styleTag?.remove();
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Sticky Positioning Fallback / Sync
  // ──────────────────────────────────────────────────────────────────────────
  const stickyElements = root.querySelectorAll<HTMLElement>("[data-sticky]");
  stickyElements.forEach((el) => {
    const pos = el.getAttribute("data-sticky");
    if (pos === "top" || pos === "bottom") {
      const offset = el.getAttribute("data-sticky-offset") || "0px";
      el.style.position = "sticky";
      if (pos === "top") el.style.top = offset.endsWith("px") || offset.endsWith("rem") ? offset : `${offset}px`;
      if (pos === "bottom") el.style.bottom = offset.endsWith("px") || offset.endsWith("rem") ? offset : `${offset}px`;
      if (!el.style.zIndex) el.style.zIndex = "40";
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Mouse Track & 3D Tilt (Centralized Transform Composition)
  // ──────────────────────────────────────────────────────────────────────────
  if (!prefersReducedMotion) {
    const mouseTrackElements = root.querySelectorAll<HTMLElement>("[data-mouse-track='true']");
    const tiltElements = root.querySelectorAll<HTMLElement>("[data-tilt='true']");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;
    let rafId: number | null = null;
    let isTrackingPointer = false;

    const onPointerMove = (e: PointerEvent) => {
      // Touch devices do not receive problematic mouse track effects
      if (e.pointerType === "touch") return;
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      if (!isTrackingPointer) {
        isTrackingPointer = true;
        startPointerLoop();
      }
    };

    const startPointerLoop = () => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Smooth damping interpolation
      mouseX += (targetMouseX - mouseX) * 0.15;
      mouseY += (targetMouseY - mouseY) * 0.15;

      const normX = (mouseX - centerX) / centerX;
      const normY = (mouseY - centerY) / centerY;

      // Update Mouse Track elements
      mouseTrackElements.forEach((el) => {
        const speed = parseFloat(el.getAttribute("data-mouse-track-speed") || "0.1");
        const state = getOrCreateTransformState(el);
        state.mouseTrackX = normX * speed * 80;
        state.mouseTrackY = normY * speed * 80;
        applyComposedTransform(el, state);
        modifiedElements.add(el);
      });

      // Continue loop if still moving
      if (Math.abs(targetMouseX - mouseX) > 0.1 || Math.abs(targetMouseY - mouseY) > 0.1) {
        rafId = requestAnimationFrame(startPointerLoop);
      } else {
        isTrackingPointer = false;
        rafId = null;
      }
    };

    if (mouseTrackElements.length > 0) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      cleanupFns.push(() => {
        window.removeEventListener("pointermove", onPointerMove);
        if (rafId) cancelAnimationFrame(rafId);
      });
    }

    // 3D Tilt per element
    tiltElements.forEach((el) => {
      let tiltRaf: number | null = null;
      const maxDeg = parseFloat(el.getAttribute("data-tilt-max") || "15");

      const handleTiltMove = (e: PointerEvent) => {
        // Touch devices do not receive problematic tilt effects
        if (e.pointerType === "touch") return;
        if (tiltRaf) cancelAnimationFrame(tiltRaf);
        tiltRaf = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width - 0.5;
          const relY = (e.clientY - rect.top) / rect.height - 0.5;

          const state = getOrCreateTransformState(el);
          state.tiltRotateY = relX * maxDeg;
          state.tiltRotateX = -relY * maxDeg;
          applyComposedTransform(el, state);
          modifiedElements.add(el);
        });
      };

      const handleTiltLeave = () => {
        if (tiltRaf) cancelAnimationFrame(tiltRaf);
        const state = getOrCreateTransformState(el);
        state.tiltRotateX = 0;
        state.tiltRotateY = 0;
        applyComposedTransform(el, state);
      };

      el.addEventListener("pointermove", handleTiltMove, { passive: true });
      el.addEventListener("pointerleave", handleTiltLeave, { passive: true });

      cleanupFns.push(() => {
        el.removeEventListener("pointermove", handleTiltMove);
        el.removeEventListener("pointerleave", handleTiltLeave);
        if (tiltRaf) cancelAnimationFrame(tiltRaf);
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Scroll Effects: Parallax, Transparency, Rotate, Scale, Blur
  // ──────────────────────────────────────────────────────────────────────────
  if (!prefersReducedMotion) {
    const scrollElements = root.querySelectorAll<HTMLElement>("[data-scroll-effects='true']");

    if (scrollElements.length > 0) {
      let scrollRaf: number | null = null;

      const handleScroll = () => {
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        scrollRaf = requestAnimationFrame(() => {
          const vh = window.innerHeight;

          scrollElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            // 0 when top of element hits bottom of screen, 1 when bottom of element hits top
            const progress = (vh - rect.top) / (vh + rect.height);
            const clampedProgress = Math.max(0, Math.min(1, progress));
            const centeredProgress = (clampedProgress - 0.5) * 2; // -1 to 1

            const state = getOrCreateTransformState(el);

            // Parallax
            const speedX = parseFloat(el.getAttribute("data-scroll-speed-x") || "0");
            const speedY = parseFloat(el.getAttribute("data-scroll-speed-y") || "0");
            state.scrollTranslateX = centeredProgress * speedX * 100;
            state.scrollTranslateY = centeredProgress * speedY * 100;

            // Rotate
            const rotateDeg = parseFloat(el.getAttribute("data-scroll-rotate") || "0");
            if (rotateDeg !== 0) {
              state.scrollRotate = centeredProgress * rotateDeg;
            }

            // Scale
            const scaleTarget = parseFloat(el.getAttribute("data-scroll-scale") || "1");
            if (scaleTarget !== 1) {
              state.scrollScale = 1 + (scaleTarget - 1) * (1 - Math.abs(centeredProgress));
            }

            applyComposedTransform(el, state);
            modifiedElements.add(el);

            // Transparency
            const transparency = el.getAttribute("data-scroll-transparency");
            if (transparency === "fade-in") {
              el.style.opacity = clampedProgress.toFixed(2);
            } else if (transparency === "fade-out") {
              el.style.opacity = (1 - clampedProgress).toFixed(2);
            } else if (transparency === "fade-in-out") {
              const op = 1 - Math.abs(centeredProgress);
              el.style.opacity = Math.max(0, Math.min(1, op)).toFixed(2);
            }

            // Blur
            const blurPx = parseFloat(el.getAttribute("data-scroll-blur") || "0");
            if (blurPx > 0) {
              const currentBlur = Math.abs(centeredProgress) * blurPx;
              el.style.filter = `blur(${currentBlur.toFixed(1)}px)`;
            }
          });
        });
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll(); // Trigger initial position

      cleanupFns.push(() => {
        window.removeEventListener("scroll", handleScroll);
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Interaction Engine (Multi-Rule Trigger → Action Execution)
  // ──────────────────────────────────────────────────────────────────────────
  const interactiveElements = root.querySelectorAll<HTMLElement>("[data-interactions]");

  interactiveElements.forEach((el) => {
    const rawInteractions = el.getAttribute("data-interactions");
    if (!rawInteractions) return;

    let rules: InteractionRule[] = [];
    try {
      rules = JSON.parse(rawInteractions);
    } catch {
      return;
    }

    if (!Array.isArray(rules) || rules.length === 0) return;

    rules.forEach((rule) => {
      if (!rule.trigger || rule.trigger === "none" || !rule.action || rule.action === "none") return;

      const executeAction = () => {
        const target = rule.targetSelector
          ? safeQuerySelector<HTMLElement>(rule.targetSelector)
          : null;

        switch (rule.action) {
          case "toggle-class": {
            if (target && rule.toggleClass) {
              target.classList.toggle(rule.toggleClass);
            }
            break;
          }
          case "show": {
            if (target) {
              target.style.display = "";
              target.classList.remove("hidden");
            }
            break;
          }
          case "hide": {
            if (target) {
              target.style.display = "none";
              target.classList.add("hidden");
            }
            break;
          }
          case "toggle-visibility": {
            if (target) {
              const isHidden = target.style.display === "none" || target.classList.contains("hidden");
              if (isHidden) {
                target.style.display = "";
                target.classList.remove("hidden");
              } else {
                target.style.display = "none";
                target.classList.add("hidden");
              }
            }
            break;
          }
          case "scroll-to": {
            const scrollTarget = rule.actionValue
              ? safeQuerySelector(rule.actionValue)
              : target;
            if (scrollTarget) {
              scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            break;
          }
          case "open-url": {
            if (rule.actionValue && (rule.actionValue.startsWith("http://") || rule.actionValue.startsWith("https://") || rule.actionValue.startsWith("/"))) {
              window.open(rule.actionValue, "_blank", "noopener,noreferrer");
            }
            break;
          }
          case "copy-text": {
            if (rule.actionValue && navigator.clipboard) {
              navigator.clipboard.writeText(rule.actionValue).catch(() => {});
            }
            break;
          }
        }
      };

      const eventMap: Record<string, string> = {
        click: "click",
        hover: "pointerenter",
        dblclick: "dblclick",
        focus: "focus",
        blur: "blur",
      };

      const eventName = eventMap[rule.trigger];
      if (eventName) {
        el.addEventListener(eventName, executeAction);
        cleanupFns.push(() => el.removeEventListener(eventName, executeAction));

        // WCAG Keyboard accessibility: Enter & Space for click triggers on non-form elements
        if (rule.trigger === "click") {
          const isNaturallyFocusable =
            el instanceof HTMLButtonElement ||
            el instanceof HTMLAnchorElement ||
            el instanceof HTMLInputElement ||
            el instanceof HTMLTextAreaElement ||
            el instanceof HTMLSelectElement;

          if (!isNaturallyFocusable) {
            if (!el.getAttribute("tabindex")) {
              el.setAttribute("tabindex", "0");
              cleanupFns.push(() => el.removeAttribute("tabindex"));
            }
            if (!el.getAttribute("role")) {
              el.setAttribute("role", "button");
              cleanupFns.push(() => el.removeAttribute("role"));
            }
          }

          const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              executeAction();
            }
          };
          el.addEventListener("keydown", onKeyDown);
          cleanupFns.push(() => el.removeEventListener("keydown", onKeyDown));
        }
      }
    });
  });

  let active = true;
  let childController: MotionRuntimeController | null = null;

  return {
    cleanup: () => {
      active = false;
      if (childController) {
        childController.cleanup();
        childController = null;
      }
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
      cleanupFns.length = 0;

      // Reset modified element transforms, opacity, and filter to their pre-runtime base
      modifiedElements.forEach((el) => {
        const state = transformStates.get(el);
        if (state) {
          el.style.transform = state.base;
        } else {
          el.style.transform = "";
        }
        el.style.opacity = "";
        el.style.filter = "";
      });
      modifiedElements.clear();
    },
    refresh: () => {
      if (!active) return;
      if (childController) {
        childController.cleanup();
        childController = null;
      }
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
      cleanupFns.length = 0;
      childController = initMotionRuntime(root);
    },
  };
}
