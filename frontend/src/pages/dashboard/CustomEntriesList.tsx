import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CustomEntriesList() {
    const { websiteId, cptId } = useParams();
    const [entries, setEntries] = useState<any[]>([]);

    useEffect(() => {
        if (!cptId) return;
        fetchEntries();
    }, [cptId]);

    const fetchEntries = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/cpt/types/${cptId}/entries`, {
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                setEntries(data.data);
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dynamic Entries</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage content populating custom structures safely mapped.</p>
                </div>
                <Link to={`/dashboard/cpts/${websiteId}/entries/${cptId}/editor`} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition">
                    + Add New Entry
                </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Title</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Author</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                            <th className="p-4 text-xs font-bold text-slate-500"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {entries.length === 0 ? (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-500 text-sm">No entries created yet.</td></tr>
                        ) : entries.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-50 transition">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800 text-sm">{entry.title}</div>
                                    <div className="text-xs font-mono text-slate-500 mt-0.5">/{entry.slug}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md ${entry.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {entry.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-600">{entry.author?.fullName || entry.author?.email || 'Unknown'}</td>
                                <td className="p-4 text-sm text-slate-500">{new Date(entry.updatedAt).toLocaleDateString()}</td>
                                <td className="p-4 text-right">
                                    <Link to={`/dashboard/cpts/${websiteId}/entries/${cptId}/editor/${entry.id}`} className="text-blue-600 hover:underline text-xs font-bold">Edit</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
