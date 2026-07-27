import React, { useState, useEffect } from "react";
import { Student, SubjectGradeItem } from "../types";
import { apiFetch } from "../utils/api";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Award, 
  BookOpen, 
  Calendar,
  LineChart,
  HelpCircle,
  CheckCircle,
  ChevronRight,
  User,
  Search,
  RefreshCw,
  GraduationCap
} from "lucide-react";

interface AcademicChartProps {
  student?: Student;
}

const MONTHS_ORDER = ["Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"];

const SUBJECT_COLORS: { [subject: string]: { stroke: string; fill: string; text: string; bg: string } } = {
  "Toán": { stroke: "#4f46e5", fill: "rgba(79, 70, 229, 0.1)", text: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  "Tiếng Việt": { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.1)", text: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  "Tiếng Anh": { stroke: "#f43f5e", fill: "rgba(244, 63, 94, 0.1)", text: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
  "Khoa học": { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.1)", text: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  "Lịch sử & Địa lý": { stroke: "#0ea5e9", fill: "rgba(14, 165, 233, 0.1)", text: "text-sky-600", bg: "bg-sky-50 border-sky-200" },
};

const DEFAULT_COLOR = { stroke: "#64748b", fill: "rgba(100, 116, 139, 0.1)", text: "text-slate-600", bg: "bg-slate-50 border-slate-200" };

export default function AcademicChart({ student: initialStudent }: AcademicChartProps) {
  // If no initialStudent, we are in standalone mode
  const isStandalone = !initialStudent;

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(isStandalone);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("Tất cả");
  const [hoveredPoint, setHoveredPoint] = useState<{ subject: string; month: string; score: number; x: number; y: number } | null>(null);

  // Load students in standalone mode
  const fetchStudents = async () => {
    if (!isStandalone) return;
    try {
      setLoading(true);
      const resp = await apiFetch("/api/students");
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data)) {
          setStudents(data);
          // Default select the first student if none selected yet or previous is not in new list
          if (data.length > 0) {
            setSelectedStudentId(prev => {
              const exists = data.some(s => s.id === prev);
              return exists ? prev : data[0].id;
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to load students for academic charts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [isStandalone]);

  // Determine active student
  const activeStudent = isStandalone 
    ? students.find(s => s.id === selectedStudentId) 
    : initialStudent;

  const gradeItems = activeStudent?.monthlyGradesList || [];
  const subjects = gradeItems.map(item => item.subject);

  // SVG dimensions
  const width = 680;
  const height = 280;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // X coordinate helper
  const getX = (index: number) => {
    return paddingLeft + (index / (MONTHS_ORDER.length - 1)) * chartWidth;
  };

  // Y coordinate helper (Score range: 0 - 10)
  const getY = (score: number) => {
    return paddingTop + chartHeight - (score / 10) * chartHeight;
  };

  // Prepare chart lines
  const linesToRender = gradeItems.filter(item => selectedSubject === "Tất cả" || item.subject === selectedSubject);

  // Generate monthly deltas for selected subject or the first subject if "Tất cả" is chosen
  const deltaSubject = selectedSubject === "Tất cả" ? subjects[0] : selectedSubject;
  const deltaItem = gradeItems.find(item => item.subject === deltaSubject);
  
  const monthlyDeltas: { month: string; currentScore: number; previousScore: number; diff: number; trend: "up" | "down" | "flat" | "none" }[] = [];

  if (deltaItem) {
    MONTHS_ORDER.forEach((m, idx) => {
      const currentScore = deltaItem.monthlyGrades[m] !== undefined ? deltaItem.monthlyGrades[m] : 0;
      if (idx === 0) {
        monthlyDeltas.push({
          month: m,
          currentScore,
          previousScore: 0,
          diff: 0,
          trend: "none"
        });
      } else {
        const prevMonth = MONTHS_ORDER[idx - 1];
        const previousScore = deltaItem.monthlyGrades[prevMonth] !== undefined ? deltaItem.monthlyGrades[prevMonth] : 0;
        
        if (deltaItem.monthlyGrades[m] !== undefined && deltaItem.monthlyGrades[prevMonth] !== undefined) {
          const diff = Math.round((currentScore - previousScore) * 10) / 10;
          let trend: "up" | "down" | "flat" = "flat";
          if (diff > 0) trend = "up";
          else if (diff < 0) trend = "down";
          
          monthlyDeltas.push({
            month: m,
            currentScore,
            previousScore,
            diff,
            trend
          });
        } else {
          monthlyDeltas.push({
            month: m,
            currentScore,
            previousScore: 0,
            diff: 0,
            trend: "none"
          });
        }
      }
    });
  }

  // Filter students based on search
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.schoolClass && s.schoolClass.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Standalone Selector Panel */}
      {isStandalone && (
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="space-y-1.5 z-10">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <LineChart className="w-5 h-5 text-indigo-400" />
              Biểu Đồ Học Tập & Phân Tích Điểm Số Học Sinh
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Phát triển dựa trên hồ sơ sĩ số lớp chủ nhiệm. Cập nhật điểm số của học sinh trong danh sách lớp sẽ phản ánh trực tiếp và tức thì lên biểu đồ trực quan dưới đây.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 z-10 shrink-0">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all w-44"
              />
            </div>

            {/* Select student dropdown */}
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setSelectedSubject("Tất cả"); // Reset subject selection
              }}
              className="bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all cursor-pointer font-bold max-w-xs"
            >
              {filteredStudents.length === 0 ? (
                <option value="">Không tìm thấy học sinh</option>
              ) : (
                filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.schoolClass ? `(${s.schoolClass})` : ""}
                  </option>
                ))
              )}
            </select>

            {/* Refresh action */}
            <button
              onClick={fetchStudents}
              disabled={loading}
              title="Làm mới dữ liệu điểm số"
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Tải lại</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-xs">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Đang tải dữ liệu biểu đồ học tập...</p>
        </div>
      ) : !activeStudent ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl text-center p-6">
          <User className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-sm font-black text-slate-700 mb-1">Không có học sinh nào được chọn</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Vui lòng thêm học sinh vào danh sách lớp hoặc chọn một học sinh từ hộp tìm kiếm phía trên để hiển thị biểu đồ học thuật tương ứng.
          </p>
        </div>
      ) : (
        <>
          {/* Header Card for Active Student in Standalone Mode */}
          {isStandalone && (
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                  <img
                    src={activeStudent.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80"}
                    alt={activeStudent.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(activeStudent.name)}`;
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    {activeStudent.name}
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-extrabold text-[10px] uppercase">
                      Lớp {activeStudent.schoolClass || "Chủ nhiệm"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Giới tính: {activeStudent.gender} • Ngày sinh: {activeStudent.dob ? new Date(activeStudent.dob).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <GraduationCap className="w-4 h-4 text-emerald-500" />
                <span>Trực quan hóa điểm số giúp theo dõi sát sao tiến trình học tập của học sinh.</span>
              </div>
            </div>
          )}

          {/* Title & Info Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-indigo-500" />
                Biểu đồ học tập & Xu hướng điểm số
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Biểu đồ trực quan hóa kết quả học tập hệ điểm số 10 qua từng tháng học của em <strong>{activeStudent.name}</strong>.
              </p>
            </div>
            
            {/* Quick Legend & Filter */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedSubject("Tất cả")}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                  selectedSubject === "Tất cả"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Tất cả môn
              </button>
              {subjects.map(sub => {
                const colors = SUBJECT_COLORS[sub] || DEFAULT_COLOR;
                const isSelected = selectedSubject === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                      isSelected
                        ? `${colors.bg} ${colors.text} font-extrabold shadow-2xs`
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.stroke }}></span>
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Chart Area */}
          {gradeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-500 text-center">
              <LineChart className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700 mb-1">Chưa có dữ liệu điểm số</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Hãy cập nhật điểm số cho học sinh này ở mục <strong>Học bạ & Điểm số</strong> trong Danh sách lớp để kích hoạt biểu đồ học tập trực quan.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
                {/* SVG Wrapper */}
                <div className="w-full overflow-x-auto select-none">
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[620px]">
                    {/* Definitions for Gradients */}
                    <defs>
                      {Object.keys(SUBJECT_COLORS).map(sub => (
                        <linearGradient key={sub} id={`gradient-${sub}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={SUBJECT_COLORS[sub].stroke} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={SUBJECT_COLORS[sub].stroke} stopOpacity={0.0} />
                        </linearGradient>
                      ))}
                      <linearGradient id="gradient-default" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#64748b" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#64748b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid Lines */}
                    {[0, 2, 4, 6, 8, 10].map((score) => {
                      const y = getY(score);
                      return (
                        <g key={score} className="opacity-40">
                          <line 
                            x1={paddingLeft} 
                            y1={y} 
                            x2={width - paddingRight} 
                            y2={y} 
                            stroke="#cbd5e1" 
                            strokeWidth="1" 
                            strokeDasharray="4 4" 
                          />
                          <text 
                            x={paddingLeft - 10} 
                            y={y + 4} 
                            textAnchor="end" 
                            className="font-mono text-[10px] font-bold fill-slate-400"
                          >
                            {score}
                          </text>
                        </g>
                      );
                    })}

                    {/* Vertical Month Labels */}
                    {MONTHS_ORDER.map((m, idx) => {
                      const x = getX(idx);
                      return (
                        <g key={m}>
                          <line 
                            x1={x} 
                            y1={paddingTop} 
                            x2={x} 
                            y2={height - paddingBottom} 
                            stroke="#f1f5f9" 
                            strokeWidth="1.5"
                          />
                          <text 
                            x={x} 
                            y={height - paddingBottom + 18} 
                            textAnchor="middle" 
                            className="font-semibold text-[10px] fill-slate-500"
                          >
                            {m.replace("Tháng ", "T")}
                          </text>
                        </g>
                      );
                    })}

                    {/* Chart Lines and Areas */}
                    {linesToRender.map((item) => {
                      const colors = SUBJECT_COLORS[item.subject] || DEFAULT_COLOR;
                      const points: { x: number; y: number; val: number; month: string }[] = [];

                      MONTHS_ORDER.forEach((m, idx) => {
                        const val = item.monthlyGrades[m];
                        if (val !== undefined && val > 0) {
                          points.push({ x: getX(idx), y: getY(val), val, month: m });
                        }
                      });

                      if (points.length < 2) {
                        return (
                          <g key={item.subject}>
                            {points.map((pt, pIdx) => (
                              <circle
                                key={pIdx}
                                cx={pt.x}
                                cy={pt.y}
                                r="5"
                                fill={colors.stroke}
                                className="transition-all duration-250 cursor-pointer hover:r-7"
                                onMouseEnter={() => setHoveredPoint({ subject: item.subject, month: pt.month, score: pt.val, x: pt.x, y: pt.y })}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            ))}
                          </g>
                        );
                      }

                      // Create Path String
                      const pathD = points.reduce((acc, pt, idx) => {
                        return acc + `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y} `;
                      }, "");

                      // Area path string closing the polygon to the bottom
                      const firstPt = points[0];
                      const lastPt = points[points.length - 1];
                      const areaD = `${pathD} L ${lastPt.x} ${getY(0)} L ${firstPt.x} ${getY(0)} Z`;

                      const isSingleSubject = selectedSubject !== "Tất cả";

                      return (
                        <g key={item.subject} className="transition-all duration-300">
                          {/* Fill Area for Single Selected Subject */}
                          {isSingleSubject && (
                            <path
                              d={areaD}
                              fill={`url(#gradient-${item.subject})`}
                              className="opacity-80 transition-all"
                            />
                          )}

                          {/* Line Path */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={colors.stroke}
                            strokeWidth={isSingleSubject ? "3.5" : "2.5"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-200"
                          />

                          {/* Data Point Circles */}
                          {points.map((pt, pIdx) => (
                            <g key={pIdx}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isSingleSubject ? "5" : "4.5"}
                                fill="white"
                                stroke={colors.stroke}
                                strokeWidth="2.5"
                                className="cursor-pointer transition-all hover:scale-125"
                                onMouseEnter={() => setHoveredPoint({ subject: item.subject, month: pt.month, score: pt.val, x: pt.x, y: pt.y })}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              {isSingleSubject && (
                                <text
                                  x={pt.x}
                                  y={pt.y - 10}
                                  textAnchor="middle"
                                  className="font-mono text-[9px] font-extrabold fill-slate-700"
                                >
                                  {pt.val}
                                </text>
                              )}
                            </g>
                          ))}
                        </g>
                      );
                    })}

                    {/* Hover Tooltip Overlay */}
                    {hoveredPoint && (
                      <g className="pointer-events-none transition-all duration-150">
                        <line
                          x1={hoveredPoint.x}
                          y1={paddingTop}
                          x2={hoveredPoint.x}
                          y2={height - paddingBottom}
                          stroke="#94a3b8"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        
                        <circle
                          cx={hoveredPoint.x}
                          cy={hoveredPoint.y}
                          r="8"
                          fill={(SUBJECT_COLORS[hoveredPoint.subject] || DEFAULT_COLOR).stroke}
                          fillOpacity="0.4"
                        />
                        <circle
                          cx={hoveredPoint.x}
                          cy={hoveredPoint.y}
                          r="4"
                          fill={(SUBJECT_COLORS[hoveredPoint.subject] || DEFAULT_COLOR).stroke}
                        />

                        {/* Tooltip box */}
                        <foreignObject
                          x={hoveredPoint.x > width / 2 ? hoveredPoint.x - 145 : hoveredPoint.x + 10}
                          y={hoveredPoint.y - 35}
                          width="135"
                          height="65"
                          className="pointer-events-none"
                        >
                          <div className="bg-slate-900/95 text-white p-2 rounded-xl border border-slate-700/50 shadow-md text-[10px] space-y-0.5 leading-snug">
                            <p className="font-extrabold text-indigo-300">{hoveredPoint.subject}</p>
                            <p className="font-semibold text-[9px] text-slate-300">{hoveredPoint.month}</p>
                            <div className="flex items-center justify-between pt-0.5 border-t border-slate-800">
                              <span className="text-slate-400">Điểm số:</span>
                              <span className="font-mono font-black text-xs text-yellow-300">{hoveredPoint.score}</span>
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    )}
                  </svg>
                </div>

              </div>

              {/* Month-over-Month Trend & Analysis */}
              <div className="space-y-3 text-left">
                <h5 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Mức độ tăng giảm điểm số định kỳ ({deltaSubject})
                </h5>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {monthlyDeltas.slice(1).map((item, idx) => {
                    const hasScore = item.currentScore > 0;

                    return (
                      <div 
                        key={item.month} 
                        className={`p-3 rounded-2xl border transition-all hover:shadow-xs flex flex-col justify-between h-24 bg-white ${
                          item.trend === "up" 
                            ? "border-emerald-100 bg-emerald-50/20" 
                            : item.trend === "down" 
                              ? "border-rose-100 bg-rose-50/20" 
                              : "border-slate-100 bg-white"
                        }`}
                      >
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{item.month}</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-sm font-black font-mono text-slate-800">
                              {hasScore ? item.currentScore : "Chưa nhập"}
                            </span>
                            {hasScore && (
                              <span className="text-[9px] text-slate-400 font-semibold">điểm</span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100/60 flex items-center justify-between">
                          {hasScore && item.trend !== "none" ? (
                            <>
                              <div className="flex items-center gap-1">
                                {item.trend === "up" ? (
                                  <div className="flex items-center text-emerald-600 gap-0.5 font-bold text-xs">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span>+{item.diff}</span>
                                  </div>
                                ) : item.trend === "down" ? (
                                  <div className="flex items-center text-rose-600 gap-0.5 font-bold text-xs">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    <span>{item.diff}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-slate-500 gap-0.5 font-semibold text-xs">
                                    <Minus className="w-3 h-3" />
                                    <span>0.0</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold">
                                {item.trend === "up" ? "Tăng 📈" : item.trend === "down" ? "Giảm 📉" : "Ổn định ➖"}
                              </span>
                            </>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic">Không có mốc so sánh</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mini Academic Analysis Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white text-indigo-600 border border-slate-200 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-slate-800">Nhận xét học thuật tự động:</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {deltaItem ? (
                      <>
                        Môn <strong>{deltaSubject}</strong> của em <strong>{activeStudent.name}</strong> đạt điểm số cả năm là <strong>{deltaItem.yearlySummary} / 10</strong>. 
                        {deltaItem.yearlySummary >= 8.0 ? (
                          <span> Lực học xuất sắc và giữ vững phong độ ổn định ở mức cao suốt các tháng học kỳ. Giáo viên khuyến khích tiếp tục bồi dưỡng nâng cao.</span>
                        ) : deltaItem.yearlySummary >= 6.5 ? (
                          <span> Lực học khá, có tinh thần cầu tiến. Một số tháng có sự dao động nhẹ về phong độ nhưng đã kịp thời củng cố kiến thức cuối kỳ.</span>
                        ) : deltaItem.yearlySummary > 0 ? (
                          <span> Lực học trung bình hoặc có môn còn chưa đạt kỳ vọng. Cần có kế hoạch phụ đạo tăng cường thêm từ phía nhà trường phối hợp với gia đình trong thời gian tới.</span>
                        ) : (
                          <span> Chưa ghi nhận đủ dữ liệu điểm số cả năm. Hãy cập nhật đầy đủ điểm thi định kỳ hàng tháng để có phân tích học lực chuẩn xác nhất.</span>
                        )}
                      </>
                    ) : (
                      <span>Chưa có dữ liệu điểm môn nào để đưa ra đánh giá phân tích xu hướng học tập tự động.</span>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
