import React, { useState, useEffect } from 'react';
import { type CustomCodeSnippet, getCustomCodeSnippets, createCustomCodeSnippet, updateCustomCodeSnippet, deleteCustomCodeSnippet } from '../services/customCode.service';

interface CustomCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    websiteId: string;
}

const CustomCodeModal: React.FC<CustomCodeModalProps> = ({ isOpen, onClose, websiteId }) => {
    const [snippets, setSnippets] = useState<CustomCodeSnippet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'CONDITIONS' | 'SCHEDULE' | 'PRIORITY'>('GENERAL');

    const [editingSnippet, setEditingSnippet] = useState<Partial<CustomCodeSnippet> | null>(null);

    useEffect(() => {
        if (isOpen && websiteId) {
            loadSnippets();
        }
    }, [isOpen, websiteId]);

    const loadSnippets = async () => {
        setIsLoading(true);
        const data = await getCustomCodeSnippets(websiteId);
        setSnippets(data);
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!editingSnippet?.title || !editingSnippet.language || !editingSnippet.placement) {
            alert('Please fill out Name, Type, and Location fields.');
            return;
        }

        let res;
        if (editingSnippet.id) {
            res = await updateCustomCodeSnippet(editingSnippet.id, editingSnippet);
        } else {
            res = await createCustomCodeSnippet(websiteId, editingSnippet);
        }

        if (res && res.success) {
            setEditingSnippet(null);
            await loadSnippets();
        } else {
            alert(res?.message || 'Failed to save custom code. Please review syntax.');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Delete this custom code?')) {
            const success = await deleteCustomCodeSnippet(id);
            if (success) {
                await loadSnippets();
            } else {
                alert('Failed to delete custom code snippet.');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <span className="text-indigo-400">{'</>'}</span> Custom Code Manager
                    </h2>
                    <button onClick={() => {
                        if (editingSnippet && window.confirm("Discard unsaved changes?")) {
                            setEditingSnippet(null);
                        } else if (!editingSnippet) {
                            onClose();
                        }
                    }} className="text-slate-400 hover:text-white px-2 py-1 text-xl font-bold leading-none">
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-950 p-6 flex flex-col">
                    {editingSnippet ? (
                        <div className="flex h-[80vh] bg-slate-950 -m-6 animate-in fade-in duration-200">
                            {/* Left Settings Navigation */}
                            <div className="w-56 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 ml-2 mt-2">Configuration</label>
                                <button
                                    onClick={() => setActiveTab('GENERAL')}
                                    className={`text-sm text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === 'GENERAL' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                                >
                                    Code Editor
                                </button>
                                <button
                                    onClick={() => setActiveTab('CONDITIONS')}
                                    className={`text-sm text-left px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-between ${activeTab === 'CONDITIONS' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                                >
                                    Conditions {editingSnippet.conditions && Object.keys(editingSnippet.conditions).length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                </button>
                                <button
                                    onClick={() => setActiveTab('SCHEDULE')}
                                    className={`text-sm text-left px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-between ${activeTab === 'SCHEDULE' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                                >
                                    Status & Timers {editingSnippet.status && editingSnippet.status !== 'PUBLISHED' && <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
                                </button>
                                <button
                                    onClick={() => setActiveTab('PRIORITY')}
                                    className={`text-sm text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === 'PRIORITY' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                                >
                                    Execution Priority
                                </button>

                                <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-slate-800">
                                    <button onClick={() => setEditingSnippet(null)} className="px-3 py-1.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                                        Cancel
                                    </button>
                                    <button onClick={handleSave} className="px-3 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
                                        Save Snippet
                                    </button>
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col bg-[#0f111a] overflow-hidden relative">
                                {activeTab === 'GENERAL' && (
                                    <div className="flex-1 flex flex-col p-6 overflow-auto">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Code Name *</label>
                                                <input
                                                    type="text"
                                                    value={editingSnippet.title || ''}
                                                    onChange={(e) => setEditingSnippet(prev => ({ ...prev, title: e.target.value }))}
                                                    placeholder="e.g. Google Analytics Helper"
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Code Type *</label>
                                                <select
                                                    value={editingSnippet.language || 'HTML'}
                                                    onChange={(e) => setEditingSnippet(prev => ({ ...prev, language: e.target.value as any }))}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                                                >
                                                    <option value="HTML">HTML (Meta tags, scripts)</option>
                                                    <option value="CSS">CSS (Stylesheet injection)</option>
                                                    <option value="JS">JavaScript (Dynamic logic)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 md:col-span-2">
                                                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Execution Location *</label>
                                                <select
                                                    value={editingSnippet.placement || 'HEAD'}
                                                    onChange={(e) => setEditingSnippet(prev => ({ ...prev, placement: e.target.value as any }))}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                                                >
                                                    <option value="HEAD">Head (Metadata, CSS bindings)</option>
                                                    <option value="BODY_TOP">Body Start (Analytics configs)</option>
                                                    <option value="BODY_BOTTOM">Body End (JS DOM Manipulations)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col min-h-[350px]">
                                            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 border border-b-0 border-slate-800 rounded-t-lg">
                                                <div className="flex gap-1.5">
                                                    <div className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/50"></div>
                                                    <div className="w-3 h-3 rounded-full bg-amber-400/20 border border-amber-400/50"></div>
                                                    <div className="w-3 h-3 rounded-full bg-emerald-400/20 border border-emerald-400/50"></div>
                                                </div>
                                                <span className="text-[11px] font-mono text-slate-500">{editingSnippet.language === 'JS' ? 'script.js' : editingSnippet.language === 'CSS' ? 'style.css' : 'index.html'}</span>
                                            </div>
                                            <textarea
                                                value={editingSnippet.code || ''}
                                                onChange={(e) => setEditingSnippet(prev => ({ ...prev, code: e.target.value }))}
                                                placeholder={
                                                    editingSnippet.language === 'JS' ? "document.addEventListener('DOMContentLoaded', () => { ... });" :
                                                        editingSnippet.language === 'CSS' ? ".custom-card { padding: 20px; }" :
                                                            "<meta name=\"theme-color\" content=\"#ffffff\">"
                                                }
                                                className="w-full flex-1 bg-[#1e1e1e] border border-slate-800 focus:border-indigo-500 text-slate-100 font-mono text-[13px] rounded-b-lg p-4 leading-relaxed focus:outline-none resize-none"
                                                spellCheck={false}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'CONDITIONS' && (
                                    <div className="p-8 max-w-2xl">
                                        <h3 className="text-lg font-bold text-white mb-2">Display Conditions</h3>
                                        <p className="text-sm text-slate-400 mb-8">Force this code to ONLY execute if it matches the metrics defined below.</p>

                                        <div className="space-y-6">
                                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                                                <label className="text-sm font-semibold text-slate-200 block mb-3">Target Specific Pages</label>
                                                <div className="flex gap-2 mb-3">
                                                    <input type="text" id="add-page-input" placeholder="e.g. /about" className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white" />
                                                    <button onClick={() => {
                                                        const el = document.getElementById('add-page-input') as HTMLInputElement;
                                                        if (el.value) {
                                                            const existing = editingSnippet.conditions?.pages || [];
                                                            setEditingSnippet(p => ({ ...p, conditions: { ...p.conditions, pages: [...existing, el.value] } }));
                                                            el.value = '';
                                                        }
                                                    }} className="px-3 py-2 bg-slate-800 text-white rounded font-semibold text-sm">Add</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {editingSnippet.conditions?.pages?.map(p => (
                                                        <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-mono border border-indigo-500/30">
                                                            {p}
                                                            <button onClick={() => {
                                                                setEditingSnippet(prev => ({
                                                                    ...prev, conditions: { ...prev.conditions, pages: prev.conditions?.pages?.filter(x => x !== p) }
                                                                }))
                                                            }} className="hover:text-white">×</button>
                                                        </span>
                                                    ))}
                                                    {(!editingSnippet.conditions?.pages || editingSnippet.conditions.pages.length === 0) && (
                                                        <span className="text-xs text-slate-500 font-medium">Applied universally to all pages.</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                                                <label className="text-sm font-semibold text-slate-200 block mb-3">Target Devices</label>
                                                <div className="flex gap-3">
                                                    {['desktop', 'tablet', 'mobile'].map(device => {
                                                        const isEnabled = editingSnippet.conditions?.devices?.includes(device) ?? true;
                                                        return (
                                                            <button
                                                                key={device}
                                                                onClick={() => {
                                                                    const current = editingSnippet.conditions?.devices || ['desktop', 'tablet', 'mobile'];
                                                                    let next = current;
                                                                    if (next.includes(device)) next = next.filter(d => d !== device);
                                                                    else next = [...next, device];
                                                                    setEditingSnippet(p => ({ ...p, conditions: { ...p.conditions, devices: next } }));
                                                                }}
                                                                className={`flex-1 py-3 border rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${isEnabled ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                                                            >
                                                                {device}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'SCHEDULE' && (
                                    <div className="p-8 max-w-2xl">
                                        <h3 className="text-lg font-bold text-white mb-2">Publishing Status</h3>
                                        <p className="text-sm text-slate-400 mb-8">Manage how and when this code is executed on the live frontend.</p>

                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { id: 'PUBLISHED', label: 'Live Injection (Published)', desc: 'Code injects immediately onto production DOM.' },
                                                { id: 'DRAFT', label: 'Save As Draft', desc: 'Code strictly remains in database. Safely disabled.' },
                                                { id: 'SCHEDULED', label: 'Scheduled CRON Execution', desc: 'Code automatically migrates to Published at specific epoch.' }
                                            ].map(opt => (
                                                <div
                                                    key={opt.id}
                                                    onClick={() => setEditingSnippet(p => ({ ...p, status: opt.id as any }))}
                                                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center gap-4 ${editingSnippet.status === opt.id || (!editingSnippet.status && opt.id === 'PUBLISHED') ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${editingSnippet.status === opt.id || (!editingSnippet.status && opt.id === 'PUBLISHED') ? 'border-indigo-500' : 'border-slate-600'}`}>
                                                        {(editingSnippet.status === opt.id || (!editingSnippet.status && opt.id === 'PUBLISHED')) && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-200">{opt.label}</h4>
                                                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {editingSnippet.status === 'SCHEDULED' && (
                                            <div className="mt-8 animate-in slide-in-from-top-4 fade-in">
                                                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-2">Select Target Date & Time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={editingSnippet.scheduledFor ? new Date(editingSnippet.scheduledFor).toISOString().slice(0, 16) : ''}
                                                    onChange={(e) => setEditingSnippet(p => ({ ...p, scheduledFor: new Date(e.target.value).toISOString() }))}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'PRIORITY' && (
                                    <div className="p-8 max-w-2xl">
                                        <h3 className="text-lg font-bold text-white mb-2">Execution Priority Flow</h3>
                                        <p className="text-sm text-slate-400 mb-8">Override standard chronological injection by forcing specific codes to bind earlier into the parser pipeline.</p>

                                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h4 className="text-slate-200 font-semibold text-sm">Sequence Index</h4>
                                                    <p className="text-xs text-slate-400 mt-1">Codes with higher integers evaluate first.</p>
                                                </div>
                                                <div className="text-3xl font-mono font-black text-indigo-400 text-center bg-slate-950 w-24 py-2 rounded-lg border border-slate-800">
                                                    {editingSnippet.priority || 0}
                                                </div>
                                            </div>

                                            <input
                                                type="range"
                                                min="-100"
                                                max="100"
                                                step="1"
                                                value={editingSnippet.priority || 0}
                                                onChange={(e) => setEditingSnippet(p => ({ ...p, priority: parseInt(e.target.value) }))}
                                                className="w-full appearance-none bg-slate-800 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                            />

                                            <div className="flex justify-between text-xs font-bold text-slate-500 mt-3 uppercase tracking-wider">
                                                <span>-100 (Lowest)</span>
                                                <span>0</span>
                                                <span>+100 (Highest)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full animate-in fade-in duration-200">
                            {/* List View */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-slate-200 font-semibold mb-1">Project Scripts & Styles</h3>
                                    <p className="text-xs text-slate-400">Manage advanced CSS, HTML, and JavaScript across the website architecture.</p>
                                </div>
                                <button
                                    onClick={() => setEditingSnippet({ websiteId, language: 'HTML', placement: 'HEAD', isActive: true })}
                                    className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 hover:border-indigo-500/50 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5"
                                >
                                    <span>+</span> Add Custom Code
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : snippets.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-center p-8">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                        <span className="text-xl">🛠️</span>
                                    </div>
                                    <h3 className="text-slate-300 font-semibold mb-1">No custom code initialized</h3>
                                    <p className="text-slate-500 text-sm max-w-sm">
                                        Add advanced CSS, JavaScript, or HTML securely configured into your website project.
                                    </p>
                                    <button
                                        onClick={() => setEditingSnippet({ websiteId, language: 'HTML', placement: 'HEAD', isActive: true })}
                                        className="mt-5 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Create Snippet
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {snippets.map(snippet => (
                                        <div key={snippet.id} className="group bg-slate-900 border border-slate-800 hover:border-slate-600 p-4 rounded-xl flex items-center justify-between transition-colors">
                                            <div className="flex flex-col gap-1">
                                                <h4 className="font-semibold text-slate-200">{snippet.title}</h4>
                                                <div className="flex items-center gap-3 text-[11px] font-mono tracking-tighter">
                                                    <span className={`px-1.5 py-0.5 rounded uppercase font-bold 
                                                        ${snippet.language === 'JS' ? 'bg-amber-500/10 text-amber-500' :
                                                            snippet.language === 'CSS' ? 'bg-blue-500/10 text-blue-400' :
                                                                'bg-orange-500/10 text-orange-400'}`}>
                                                        {snippet.language}
                                                    </span>
                                                    <span className="text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">
                                                        {snippet.placement.replace('_', ' ')}
                                                    </span>
                                                    {snippet.isActive ?
                                                        <span className="text-emerald-500 font-sans tracking-normal font-semibold">● Enabled</span> :
                                                        <span className="text-slate-500 font-sans tracking-normal font-semibold">○ Disabled</span>
                                                    }
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingSnippet(snippet)} className="text-[11px] font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded">
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDelete(snippet.id)} className="text-[11px] font-bold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomCodeModal;
