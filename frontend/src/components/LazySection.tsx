/**
 * @file Lazy Section: React UI composition and event handling for this screen or component.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import React, { useEffect, useRef, useState } from 'react';

interface LazySectionProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    rootMargin?: string;
}

/**
 * Render the lazy section interface and connect its event handlers.
 * @param options Named inputs: children, fallback, rootMargin.

 * @param options.children Nested React content or document elements supplied by the parent.
 * @param options.fallback Fallback passed by the caller. Defaults to <div className="p-8 text-center text-slate-400 text-sm">Loading section...</div>.
 * @param options.rootMargin Root Margin passed by the caller. Defaults to '200px'.
 */
export default function LazySection({ children, fallback = <div className="p-8 text-center text-slate-400 text-sm">Loading section...</div>, rootMargin = '200px' }: LazySectionProps) {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [isVisible, rootMargin]);

    return (
        <div ref={containerRef}>
            {isVisible ? children : fallback}
        </div>
    );
}
