import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { Trash2, Edit3, Save, X, User, Shield, Briefcase, Mail } from "lucide-react";

export default function AdminAccountPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: "", classCode: "", workplace: "" });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/auth/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const err = await res.json();
        setError(err.error || "Không thể lấy danh sách người dùng.");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản của ${name}?`)) return;
    try {
      const res = await apiFetch(`/api/auth/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Xóa thất bại");
      }
    } catch (err) {
      alert("Lỗi mạng");
    }
  };

  const startEdit = (user: any) => {
    setEditUserId(user.id);
    setEditForm({ role: user.role, classCode: user.classCode || "", workplace: user.workplace || "" });
  };

  const cancelEdit = () => {
    setEditUserId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await apiFetch(`/api/auth/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(users.map(u => u.id === id ? data.user : u));
        setEditUserId(null);
      } else {
        const err = await res.json();
        alert(err.error || "Cập nhật thất bại");
      }
    } catch (err) {
      alert("Lỗi mạng");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-300">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-8 text-center text-rose-400">{error}</div>;

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Quản lý tài khoản
          </h2>
          <p className="text-sm text-slate-400 mt-1">Quản lý phân quyền và thông tin giáo viên trong hệ thống.</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700/50 text-slate-300 uppercase tracking-wider text-xs">
              <th className="py-3 px-4 font-semibold">Người dùng</th>
              <th className="py-3 px-4 font-semibold">Vai trò</th>
              <th className="py-3 px-4 font-semibold">Lớp / Mã</th>
              <th className="py-3 px-4 font-semibold">Nơi công tác</th>
              <th className="py-3 px-4 font-semibold text-right">Tác vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {users.map(user => {
              const isEditing = editUserId === user.id;
              
              return (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-slate-600" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-200">{user.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <select 
                        value={editForm.role}
                        onChange={e => setEditForm({...editForm, role: e.target.value})}
                        className="bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-cyan-500"
                      >
                        <option value="user">Giáo viên (User)</option>
                        <option value="admin">Quản trị viên (Admin)</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-700 text-slate-300'}`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3" />}
                        {user.role === 'admin' ? 'Admin' : 'Giáo viên'}
                      </span>
                    )}
                  </td>
                  
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.classCode}
                        onChange={e => setEditForm({...editForm, classCode: e.target.value})}
                        className="bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-cyan-500"
                        placeholder="VD: 4A"
                      />
                    ) : (
                      <span className="text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{user.classCode || '—'}</span>
                    )}
                  </td>
                  
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.workplace}
                        onChange={e => setEditForm({...editForm, workplace: e.target.value})}
                        className="bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-cyan-500"
                        placeholder="Tên trường..."
                      />
                    ) : (
                      <div className="text-slate-300 flex items-center gap-1.5 text-sm">
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        {user.workplace || <span className="text-slate-500 italic">Chưa cập nhật</span>}
                      </div>
                    )}
                  </td>
                  
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(user.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors" title="Lưu">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded transition-colors" title="Hủy">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(user)} className="p-1.5 text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors" title="Sửa quyền/lớp">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(user.id, user.name)} className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded transition-colors" title="Xóa tài khoản">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
