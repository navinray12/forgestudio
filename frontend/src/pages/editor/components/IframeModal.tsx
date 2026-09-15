/**
 * @file Iframe Modal: React UI composition and event handling for this screen or component.
 * Navigation and conventions: docs/code-navigation/README.md.
 */


interface IframeModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
}

/**
 * Render the iframe modal interface and connect its event handlers.
 * @param options Named inputs: isOpen, onClose, url, title.

 * @param options.isOpen Is Open passed by the caller.
 * @param options.onClose Callback invoked when this interface should close.
 * @param options.url Url passed by the caller.
 * @param options.title Title passed by the caller.
 */
export default function IframeModal({ isOpen, onClose, url, title }: IframeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-slate-50 flex flex-col rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden border border-slate-300">
                <div className="flex shrink-0 items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shadow-sm">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">⚡</span>
                        {title}
                    </h2>
                    <div className="flex items-center gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition"
                        >
                            Open in New Tab
                        </a>
                        <button
                            onClick={onClose}
                            className="text-slate-400 font-bold hover:text-slate-700 hover:bg-slate-100 p-1 rounded transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="flex-1 w-full h-full relative">
                    <iframe
                        src={url}
                        className="w-full h-full border-none bg-white"
                        title={title}
                    />
                </div>
            </div>
        </div>
    );
}
