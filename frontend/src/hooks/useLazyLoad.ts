/**
 * @file Use Lazy Load: React state and side-effect coordination for its callers.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { useEffect, useState, useRef, useCallback } from "react";

interface LazyLoadOptions {
    enabled?: boolean;
    rootMargin?: string;
    threshold?: number;
}

// F-359: Singleton IntersectionObserver mapping to heavily decrease memory constraints (no 1:1 Observer-to-Node ratio)
const getIntersectionObserver = (() => {
    let observer: IntersectionObserver | null = null;
    const callbacks = new WeakMap<Element, () => void>();

    return (rootMargin = "300px", threshold = 0) => {
        if (typeof IntersectionObserver === "undefined") return null;

        if (!observer) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const callback = callbacks.get(entry.target);
                        if (callback) {
                            callback();
                            observer!.unobserve(entry.target);
                            callbacks.delete(entry.target);
                        }
                    }
                });
            }, { rootMargin, threshold });
        }

        return {
            observe: (el: Element, onIntersect: () => void) => {
                callbacks.set(el, onIntersect);
                observer!.observe(el);
            },
            unobserve: (el: Element) => {
                callbacks.delete(el);
                observer!.unobserve(el);
            }
        };
    };
})();

/**
 * Coordinate lazy load state and lifecycle for the calling component.
 * @param options Named inputs: enabled, rootMargin, threshold. Defaults to {}.

 * @param options.enabled Enabled passed by the caller. Defaults to true.
 * @param options.rootMargin Root Margin passed by the caller. Defaults to "300px".
 * @param options.threshold Threshold passed by the caller. Defaults to 0.
 */
export function useLazyLoad({ enabled = true, rootMargin = "300px", threshold = 0 }: LazyLoadOptions = {}) {
    const [isVisible, setIsVisible] = useState(!enabled);
    const elementRef = useRef<HTMLElement | null>(null);

    // Ensure we trigger update immediately if disabled
    useEffect(() => {
        if (!enabled && !isVisible) setIsVisible(true);
    }, [enabled, isVisible]);

    const setRef = useCallback((node: HTMLElement | null) => {
        // Unobserve previous node if it changed
        if (elementRef.current && !isVisible && enabled) {
            getIntersectionObserver(rootMargin, threshold)?.unobserve(elementRef.current);
        }

        elementRef.current = node;

        if (node && enabled && !isVisible) {
            const sharedObserver = getIntersectionObserver(rootMargin, threshold);
            if (sharedObserver) {
                sharedObserver.observe(node, () => setIsVisible(true));
            } else {
                setIsVisible(true); // Fallback
            }
        }
    }, [enabled, isVisible, rootMargin, threshold]);

    return { ref: setRef, isVisible };
}
