import React, { useEffect, useRef, useState } from 'react';

interface LazySectionProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    rootMargin?: string;
}

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
