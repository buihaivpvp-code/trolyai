import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { Save, Bot, Key, Settings, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function AdminAiConfigPanel() {
  const [config, setConfig] = useState({ apiKey: "", model: "gemini-3.5-flash", fallbackModel: "gemini-3.1-flash-lite" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/system/ai-config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiFetch("/api/system/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert("Lưu cấu hình AI thành công!");
        fetchConfig();
      } else {
        const err = await res.json();
        alert(err.error || "Lưu thất bại");
      }
    } catch (err) {
      alert("Lỗi mạng");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.apiKey || config.apiKey.includes("********")) {
      alert("Vui lòng nhập API Key thật để kiểm tra (hoặc hệ thống đang dùng biến môi trường).");
      return;
    }
    
    try {
      setTesting(true);
      setTestResult(null);
      // We can use the existing generate-test or a specific test endpoint if it existed.
      // Since server.ts has /api/gemini/test-key, let's use it.
      const res = await apiFetch("/api/gemini/test-key", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-gemini-api-key": config.apiKey
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message || "Kết nối thành công!" });
      } else {
        setTestResult({ success: false, message: data.error || "Kết nối thất bại!" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: "Lỗi kết nối mạng: " + err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-300">Đang tải cấu hình...</div>;

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl max-w-3xl">
      <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-orange-400" />
            Cấu hình AI & API
          </h2>
          <p className="text-sm text-slate-400 mt-1">Thiết lập Google Gemini API Key và các mô hình sinh nội dung.</p>
        </div>
      </div>
      
      <form onSubmit={handleSave} className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Key className="w-4 h-4 text-slate-400" />
              Google Gemini API Key
            </label>
            <input 
              type="text" 
              value={config.apiKey}
              onChange={e => setConfig({...config, apiKey: e.target.value})}
              placeholder="AIzaSy..."
              className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-2">
              Lưu ý: Nếu để trống hoặc chứa dấu *, hệ thống sẽ sử dụng key mặc định từ biến môi trường.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                <Settings className="w-4 h-4 text-slate-400" />
                Mô hình chính (Primary Model)
              </label>
              <select 
                value={config.model}
                onChange={e => setConfig({...config, model: e.target.value})}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
              >
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                <Settings className="w-4 h-4 text-slate-400" />
                Mô hình dự phòng (Fallback Model)
              </label>
              <select 
                value={config.fallbackModel}
                onChange={e => setConfig({...config, fallbackModel: e.target.value})}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
              >
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
              </select>
            </div>
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg flex items-start gap-3 border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            {testResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
            <div className="text-sm font-medium leading-relaxed">{testResult.message}</div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-700/50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            Kiểm tra kết nối
          </button>
          <button 
            type="submit" 
            disabled={saving}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-500/20"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu cấu hình
          </button>
        </div>
      </form>
    </div>
  );
}
