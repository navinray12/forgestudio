import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CustomPostTypesList() {
    const { websiteId } = useParams();
    const [cpts, setCpts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!websiteId) return;
        fetchCpts();
    }, [websiteId]);

    const fetchCpts = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${apiUrl}/api/cpt/websites/${websiteId}/types`, {
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                setCpts(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch CPTs:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Custom Post Types</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage architectural content models dynamically integrated natively.</p>
                </div>
                <Link to={`/dashboard/cpts/${websiteId}/builder`} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition">
                    + Add Content Type
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading configurations...</div>
            ) : cpts.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                    <p className="text-slate-500 text-sm font-medium">No custom post types architectural boundaries exist.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {cpts.map(cpt => (
                        <div key={cpt.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition flex flex-col justify-between group">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{cpt.name}</h2>
                                <p className="text-xs font-mono text-slate-500 mt-1">/{cpt.slug}</p>
                                <p className="text-sm text-slate-600 mt-3 line-clamp-2">{cpt.description || "No description provided."}</p>
                            </div>
                            <div className="mt-6 pt-5 border-t border-slate-100 flex gap-3 justify-between">
                                <Link to={`/dashboard/cpts/${websiteId}/entries/${cpt.id}`} className="text-blue-600 text-xs font-bold hover:underline">
                                    Entries ({cpt._count?.entries || 0})
                                </Link>
                                <Link to={`/dashboard/cpts/${websiteId}/builder/${cpt.id}`} className="text-slate-600 text-xs font-bold hover:underline">
                                    Edit Fields ({cpt._count?.fields || 0})
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
