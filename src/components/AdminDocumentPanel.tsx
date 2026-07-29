import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { Trash2, FileText, Download, Calendar, HardDrive } from "lucide-react";

export default function AdminDocumentPanel() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        const err = await res.json();
        setError(err.error || "Không thể lấy danh sách tài liệu.");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${name}" khỏi kho chung?`)) return;
    try {
      const res = await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments(documents.filter(d => d.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Xóa thất bại");
      }
    } catch (err) {
      alert("Lỗi mạng");
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="w-8 h-8 text-rose-400" />;
    if (type.includes("word") || type.includes("document")) return <FileText className="w-8 h-8 text-blue-400" />;
    if (type.includes("excel") || type.includes("sheet")) return <FileText className="w-8 h-8 text-emerald-400" />;
    if (type.includes("image")) return <FileText className="w-8 h-8 text-purple-400" />;
    return <FileText className="w-8 h-8 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };
  
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-300">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-8 text-center text-rose-400">{error}</div>;

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-amber-400" />
            Kho tài liệu hệ thống
          </h2>
          <p className="text-sm text-slate-400 mt-1">Quản lý tất cả tài liệu, giáo án được tải lên bởi giáo viên.</p>
        </div>
      </div>
      
      {documents.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          Chưa có tài liệu nào trong hệ thống.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs">
                <th className="py-3 px-4 font-semibold w-12">Loại</th>
                <th className="py-3 px-4 font-semibold">Tên tài liệu</th>
                <th className="py-3 px-4 font-semibold">Dung lượng</th>
                <th className="py-3 px-4 font-semibold">Ngày tải lên</th>
                <th className="py-3 px-4 font-semibold">Chủ sở hữu (ID)</th>
                <th className="py-3 px-4 font-semibold text-right">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    {getFileIcon(doc.type || "")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">{doc.name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]" title={doc.description || ""}>
                      {doc.description || "Không có mô tả"}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {formatSize(doc.size)}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(doc.uploadedAt)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {doc.ownerId || "System"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={`/api/documents/download/${doc.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors" 
                        title="Tải về"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => handleDelete(doc.id, doc.name)} 
                        className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded transition-colors" 
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
