import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CustomEntryEditor() {
    const { websiteId, cptId, entryId } = useParams();
    const navigate = useNavigate();

    // Core Entry Data
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [status, setStatus] = useState("DRAFT");
    const [values, setValues] = useState<Record<string, any>>({});

    // Model Definitions (Fields)
    const [fields, setFields] = useState<any[]>([]);

    useEffect(() => {
        if (!cptId) return;
        fetchFields();
    }, [cptId]);

    const fetchFields = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/cpt/types/${cptId}/fields`, {
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                setFields(data.data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        try {
            const payload = { title, slug, status, values };

            const url = entryId
                ? `${apiUrl}/api/cpt/entries/${entryId}`
                : `${apiUrl}/api/cpt/types/${cptId}/entries`;

            const method = entryId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error?.message || "Failed to commit");
            navigate(`/dashboard/cpts/${websiteId}/entries/${cptId}`);
        } catch (e: any) {
            alert(e.message || "Failed to save entry");
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">{entryId ? "Edit Entry" : "Create Native Entry"}</h1>
                    <p className="text-sm text-slate-500 mt-1">Populate model data mappings.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border-slate-200 text-sm font-bold bg-slate-50">
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                    </select>
                    <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg text-sm hover:bg-blue-700 transition shadow-sm">
                        Commit Entry
                    </button>
                </div>
            </div>

            <form className="flex flex-col gap-8 bg-white border border-slate-200 p-8 rounded-3xl" onSubmit={handleSave}>
                <div className="flex flex-col gap-4">
                    <input autoFocus required placeholder="Entry Title" value={title} onChange={e => {
                        setTitle(e.target.value);
                        if (!entryId) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }} className="text-3xl font-bold border-none placeholder-slate-300 focus:ring-0 p-0 text-slate-800" />

                    <div className="flex items-center gap-2 text-slate-500 text-sm bg-slate-50 px-3 py-2 rounded-lg w-max border border-slate-100">
                        <span className="font-mono text-slate-400">/</span>
                        <input required value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="bg-transparent border-none p-0 h-auto focus:ring-0 text-sm font-mono text-blue-600 w-auto min-w-[200px]" placeholder="dynamic-slug" />
                    </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                <div className="flex flex-col gap-6">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Native Attributes Bound</h3>
                    {fields.length === 0 ? (
                        <div className="text-sm text-slate-500 bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center">No structural attributes bound to this Custom Post Type. Mapping values empty.</div>
                    ) : fields.map(field => (
                        <label key={field.key} className="flex flex-col gap-2">
                            <span className="font-bold text-sm text-slate-700">{field.name} {field.required && <span className="text-red-500">*</span>}</span>
                            {field.type === "text" && <input required={field.required} type="text" value={values[field.key] || ""} onChange={e => setValues({ ...values, [field.key]: e.target.value })} className="rounded-xl border-slate-200 p-3 text-sm focus:border-blue-500 bg-slate-50 focus:bg-white transition" placeholder={`Enter ${field.name}...`} />}
                            {field.type === "rich-text" && <textarea required={field.required} rows={4} value={values[field.key] || ""} onChange={e => setValues({ ...values, [field.key]: e.target.value })} className="rounded-xl border-slate-200 p-3 text-sm focus:border-blue-500 bg-slate-50 focus:bg-white transition" />}
                            {field.type === "number" && <input required={field.required} type="number" value={values[field.key] || ""} onChange={e => setValues({ ...values, [field.key]: e.target.value })} className="rounded-xl border-slate-200 p-3 text-sm focus:border-blue-500 bg-slate-50 focus:bg-white transition w-1/3" />}
                        </label>
                    ))}
                </div>
            </form>
        </div>
    );
}
