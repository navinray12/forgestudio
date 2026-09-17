import React from "react";
import DOMPurify from "dompurify";

interface HtmlNodeProps {
    el: any;
    mergedProps: any;
    optInnerClass?: string;
    finalInnerStyles?: any;
    isEditorMode?: boolean; // if true, injects the placeholder snippet
}

export default function HtmlNode({ el, mergedProps, optInnerClass = "", finalInnerStyles = {}, isEditorMode = false }: HtmlNodeProps) {
    if (el.type !== "html") return null;

    let markup = el.content || "";
    if (isEditorMode && !markup) {
        markup = "<div class='text-center text-slate-400 p-4 border-2 border-dashed border-slate-200'>Add custom HTML markup in the sidebar.</div>";
    }

    const safeHtml = DOMPurify.sanitize(markup, {
        FORBID_TAGS: ['style', 'script', 'embed', 'object', 'base'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'oninput', 'onchange'],
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
    });

    return (
        <React.Fragment key={el.id}>
            <div
                {...mergedProps}
                className={`${mergedProps.className || ""} ${optInnerClass}`}
                style={{ ...mergedProps.style, ...finalInnerStyles }}
                dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
        </React.Fragment>
    );
}
