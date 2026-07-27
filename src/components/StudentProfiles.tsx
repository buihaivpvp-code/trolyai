/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Student, AssessmentValue } from "../types";
import { User, ShieldAlert, Heart, Trophy, Activity, ArrowUpRight, ArrowRight, Sparkles, Smile, RefreshCw, Star } from "lucide-react";
import { apiFetch } from "../utils/api";

interface StudentProfilesProps {
  onSelectForRemark: (student: Student) => void;
  onSelectForParent: (student: Student) => void;
  onSelectForForecast?: (student: Student) => void;
}

export default function StudentProfiles({
  onSelectForRemark,
  onSelectForParent,
  onSelectForForecast,
}: StudentProfilesProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const resp = await apiFetch("/api/students");
      if (resp.ok) {
        const data = await resp.json();
        setStudents(data);
        if (data.length > 0) {
          setSelectedStudent(data[0]);
        }
      }
    } catch (e) {
      console.error("Lỗi tải danh sách học sinh: ", e);
    } finally {
      setLoading(false);
    }
  };

  // Helper calculating the trend slope of Circular 27 grades
  // Weeks are 1, 2, 3, 4. Values are 1 (CHT), 2 (HT), 3 (HTT).
  const calculateSlopeAndTrend = (grades: { [weekNumber: number]: AssessmentValue }) => {
    const x = [1, 2, 3, 4];
    const y = [grades[1] || 2, grades[2] || 2, grades[3] || 2, grades[4] || 2];
    
    // Linear regression formula
    // slope m = (n*sum(xy) - sum(x)*sum(y)) / (n*sum(x^2) - (sum(x))^2)
    const n = 4;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumXX += x[i] * x[i];
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    let label = "";
    let colorClass = "";
    let desc = "";

    if (slope > 0.1) {
      label = "Tiến bộ rõ rệt";
      colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
      desc = "Các đánh giá tuần gần đây đang có chiều hướng tăng cao vững chắn.";
    } else if (slope < -0.1) {
      label = "Cần hỗ trợ, sa sút";
      colorClass = "text-rose-600 bg-rose-50 border-rose-200";
      desc = "Các đánh giá trồi sụt hoặc đi xuống dần. Cần có kế hoạch can thiệp sớm.";
    } else {
      label = "Giữ vững phong độ";
      colorClass = "text-amber-600 bg-amber-50 border-amber-200";
      desc = "Duy trì kết quả ổn định đồng hành xuyên suốt cả tháng.";
    }

    return { slope, label, colorClass, desc, y };
  };

  const getAssessmentLabel = (val: AssessmentValue) => {
    if (val === AssessmentValue.HTT) return { text: "HTT (Tốt)", bg: "bg-emerald-100 text-emerald-800" };
    if (val === AssessmentValue.HT) return { text: "HT (Hoàn thành)", bg: "bg-blue-100 text-blue-800" };
    return { text: "CHT (Chưa hoàn thành)", bg: "bg-amber-100 text-amber-900 font-medium" };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100" id="student-profiles-loading">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Đang đồng bộ hồ sơ học sinh 360°...</p>
      </div>
    );
  }

  const selectedTrend = selectedStudent ? calculateSlopeAndTrend(selectedStudent.circular27Grades) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="student-profiles-container">
      {/* LEFT COLUMN: Student Roster Selection */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              Sĩ số Lớp 4A ({students.length} học sinh)
            </h3>
            <span className="text-xs text-indigo-600 bg-indigo-50 font-medium px-2 py-0.5 rounded-full">Chủ nhiệm: Cô Vy</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {students.map((student) => {
              const trend = calculateSlopeAndTrend(student.circular27Grades);
              const isSelected = selectedStudent?.id === student.id;
              
              return (
                <button
                  key={student.id}
                  id={`btn-student-${student.id}`}
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                    isSelected
                      ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-100 hover:bg-slate-800"
                      : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-white hover:border-slate-200"
                  }`}
                >
                  <img
                    referrerPolicy="no-referrer"
                    src={student.avatar}
                    alt={student.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{student.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md border font-medium ${
                        isSelected ? "bg-white/10 border-white/20 text-indigo-200" : trend.colorClass
                      }`}>
                        {trend.label}
                      </span>
                      {student.semiBoardingProfile.allergies !== "Không có" && (
                        <span className={`w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse`} title="Có dị ứng thực phẩm"></span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? "translate-x-1 text-white" : "text-slate-300"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Insights Cards */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center justify-between">
            MAPPING THÔNG TƯ 27 (DỮ LIỆU AI)
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-white rounded-xl border border-slate-100">
              <span className="block font-bold text-emerald-600 text-base">HTT</span>
              <span className="text-slate-400 text-[10px]">Hoàn thành tốt</span>
              <span className="block font-mono bg-emerald-50 text-emerald-700 text-[11px] rounded-sm py-0.5 mt-1 font-bold">Giá trị: 3</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-100 border-indigo-100">
              <span className="block font-bold text-blue-600 text-base">HT</span>
              <span className="text-slate-400 text-[10px]">Hoàn thành</span>
              <span className="block font-mono bg-blue-50 text-blue-700 text-[11px] rounded-sm py-0.5 mt-1 font-bold">Giá trị: 2</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-100">
              <span className="block font-bold text-amber-700 text-base">CHT</span>
              <span className="text-slate-400 text-[10px]">Chưa h.thành</span>
              <span className="block font-mono bg-amber-50 text-amber-800 text-[11px] rounded-sm py-0.5 mt-1 font-bold">Giá trị: 1</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 text-center italic">
            Hệ thống tự động quy đổi chuỗi tuần tự thành đồ thị toán giải tích giúp đo lường xu hướng (Slope) tiến bộ trực quan.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive 360° Profile Details */}
      {selectedStudent && selectedTrend && (
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50/50 to-transparent rounded-bl-full pointer-events-none" />

            {/* Main Header / Personal Card */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pb-6 border-b border-slate-100">
              <img
                referrerPolicy="no-referrer"
                src={selectedStudent.avatar}
                alt={selectedStudent.name}
                className="w-16 h-16 rounded-2xl object-cover border-4 border-slate-50 shadow-sm"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-800">{selectedStudent.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    selectedStudent.gender === "Nam" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                  }`}>
                    {selectedStudent.gender}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">
                    Lớp {selectedStudent.schoolGrade}{selectedStudent.schoolClass}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Ngày sinh: {new Date(selectedStudent.dob).toLocaleDateString("vi-VN")} • SĐT Phụ huynh: {selectedStudent.phone}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {/* Micro Actions triggering transition callbacks */}
                <button
                  id="action-remark-student"
                  onClick={() => onSelectForRemark(selectedStudent)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors"
                  title="Nhận xét tuần học"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Nhận xét
                </button>
                <button
                  id="action-parent-student"
                  onClick={() => onSelectForParent(selectedStudent)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors"
                  title="Thư gửi Phụ huynh"
                >
                  <Smile className="w-3.5 h-3.5" />
                  Gửi Phụ Huynh
                </button>
                {onSelectForForecast && (
                  <button
                    id="action-forecast-student"
                    onClick={() => onSelectForForecast(selectedStudent)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors"
                    title="Kết quả học tập"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Kết quả học tập
                  </button>
                )}
              </div>
            </div>

            {/* Grid details containing subsections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Box 1: Circular 27 & SVG Slope Trend */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    ĐÁNH GIÁ THÔNG TƯ 27 & XU HƯỚNG SỰ TIẾN BỘ
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${selectedTrend.colorClass}`}>
                    {selectedTrend.label}
                  </span>
                </div>

                {/* Weeks Listing */}
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                  {[1, 2, 3, 4].map((w) => {
                    const gradeVal = selectedStudent.circular27Grades[w];
                    const meta = getAssessmentLabel(gradeVal);
                    return (
                      <div key={w} className="text-center">
                        <span className="block text-[10px] text-slate-400 font-medium font-mono">Tuần {w}</span>
                        <span className={`inline-block text-[11px] font-bold px-1.5 py-0.5 rounded-md mt-1 ${meta.bg}`}>
                          {gradeVal === 3 ? "HTT" : gradeVal === 2 ? "HT" : "CHT"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* SVG Trendline Chart */}
                <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-medium mb-2 uppercase self-start">Biểu đồ tiến độ (Slope: {selectedTrend.slope.toFixed(2)})</span>
                  <div className="w-full h-24 flex items-center justify-center relative bg-slate-50/20 rounded-md py-2 px-6">
                    {/* SVG canvas */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                      {/* Grid Line */}
                      <line x1="0" y1="20" x2="100" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      
                      {/* Plotting points */}
                      {/* W1 to W4. Translate values (1=35, 2=20, 3=5) */}
                      {(() => {
                        const yPoints = selectedTrend.y.map(val => {
                          if (val === 1) return 33; // bottom
                          if (val === 2) return 20; // middle
                          if (val === 3) return 7;  // top
                          return 20;
                        });
                        
                        const pointsString = `5,${yPoints[0]} 35,${yPoints[1]} 65,${yPoints[2]} 95,${yPoints[3]}`;
                        const isAscending = selectedTrend.slope > 0.1;
                        const isDescending = selectedTrend.slope < -0.1;
                        let strokeColor = "#d97706"; // stable (amber)
                        if (isAscending) strokeColor = "#10b981"; // green
                        if (isDescending) strokeColor = "#f43f5e"; // rose

                        return (
                          <>
                            {/* Line path */}
                            <path
                              d={`M 5 ${yPoints[0]} L 35 ${yPoints[1]} L 65 ${yPoints[2]} L 95 ${yPoints[3]}`}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Decorative dots */}
                            <circle cx="5" cy={yPoints[0]} r="3" fill={strokeColor} />
                            <circle cx="35" cy={yPoints[1]} r="3" fill={strokeColor} />
                            <circle cx="65" cy={yPoints[2]} r="3" fill={strokeColor} />
                            <circle cx="95" cy={yPoints[3]} r="3" fill={strokeColor} />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 text-center">{selectedTrend.desc}</p>
                </div>
              </div>

              {/* Box 2: Psychological state & Behavior tracking */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    HỒ SƠ TÂM LÝ & SỰ TẬP TRUNG (BARS)
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Sociability */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Hòa đồng cùng bè bạn</span>
                        <span className="font-semibold">
                          {selectedStudent.psychologicalProfile?.sociability !== undefined && selectedStudent.psychologicalProfile.sociability > 0 
                            ? `${selectedStudent.psychologicalProfile.sociability}/5` 
                            : "—/5"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(selectedStudent.psychologicalProfile?.sociability || 0) * 20}%` }} />
                      </div>
                    </div>

                    {/* Shyness */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Rụt rè, nhút nhát</span>
                        <span className="font-semibold">
                          {selectedStudent.psychologicalProfile?.shyness !== undefined && selectedStudent.psychologicalProfile.shyness > 0 
                            ? `${selectedStudent.psychologicalProfile.shyness}/5` 
                            : "—/5"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full" style={{ width: `${(selectedStudent.psychologicalProfile?.shyness || 0) * 20}%` }} />
                      </div>
                    </div>

                    {/* Hyperactive */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Tăng động, hiếu động</span>
                        <span className="font-semibold">
                          {selectedStudent.psychologicalProfile?.hyperactive !== undefined && selectedStudent.psychologicalProfile.hyperactive > 0 
                            ? `${selectedStudent.psychologicalProfile.hyperactive}/5` 
                            : "—/5"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${(selectedStudent.psychologicalProfile?.hyperactive || 0) >= 4 ? "bg-amber-500 animate-pulse" : "bg-indigo-500"}`} style={{ width: `${(selectedStudent.psychologicalProfile?.hyperactive || 0) * 20}%` }} />
                      </div>
                    </div>

                    {/* Difficult Concentration */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Khó tập trung hăng say</span>
                        <span className="font-semibold">
                          {selectedStudent.psychologicalProfile?.focus !== undefined && selectedStudent.psychologicalProfile.focus > 0 
                            ? `${selectedStudent.psychologicalProfile.focus}/5` 
                            : "—/5"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${(selectedStudent.psychologicalProfile?.focus || 0) >= 4 ? "bg-rose-500 animate-pulse" : "bg-purple-500"}`} style={{ width: `${(selectedStudent.psychologicalProfile?.focus || 0) * 20}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-400">
                  <span>Trầm tính: Cần khích lệ nhóm</span>
                  <span>Nhạy cảm: Tránh quát mắng lớn</span>
                </div>
              </div>
            </div>

            {/* Row 2 of Details: Diet & Semi-boarding & Talents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Box 3: Semi-boarding alerts & health (CRITICAL HIGHLIGHTS FOR SAFETY) */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 text-rose-600">
                  <ShieldAlert className="w-3.5 h-3.5 animate-bounce" />
                  HỒ SƠ BÁN TRÚ & CẢNH BÁO SỨC KHỎE
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-500 min-w-[80px]">Dị ứng:</span>
                    <span className={`font-bold ${selectedStudent.semiBoardingProfile?.allergies && selectedStudent.semiBoardingProfile.allergies !== "Không có" ? "text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded" : "text-slate-700"}`}>
                      {selectedStudent.semiBoardingProfile?.allergies || "Không có dữ liệu"}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-500 min-w-[80px]">Ăn kiêng:</span>
                    <span className="text-slate-700">{selectedStudent.semiBoardingProfile?.diet || "Không có dữ liệu"}</span>
                  </div>

                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-500 min-w-[80px]">Lưu ý y tế:</span>
                    <span className="text-slate-700">{selectedStudent.semiBoardingProfile?.healthNotes || "Không có dữ liệu"}</span>
                  </div>
                </div>
              </div>

              {/* Box 4: Student Talents (Gifting profile) */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-indigo-500" />
                  HỒ SƠ NĂNG KHIẾU NỔI TRỘI
                </h4>

                <div className="flex flex-wrap gap-2">
                  {selectedStudent.talentProfile?.art && (
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      🎨 Mỹ thuật xuất sắc
                    </span>
                  )}
                  {selectedStudent.talentProfile?.music && (
                    <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      🎵 Âm nhạc oanh vàng
                    </span>
                  )}
                  {selectedStudent.talentProfile?.sports && (
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      ⚽ Thể thao xung kích
                    </span>
                  )}
                  {selectedStudent.talentProfile?.stem && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      🤖 Năng lực STEM vượt trội
                    </span>
                  )}
                  {(!selectedStudent.talentProfile?.art && 
                    !selectedStudent.talentProfile?.music && 
                    !selectedStudent.talentProfile?.sports && 
                    !selectedStudent.talentProfile?.stem) && (
                    <span className="text-xs text-slate-450 italic bg-slate-100/50 px-2.5 py-1 rounded-lg border border-dashed border-slate-200">
                      Chưa có ghi nhận năng khiếu.
                    </span>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 tracking-tight leading-relaxed">
                  <span className="font-semibold text-slate-700 block mb-0.5">Mô tả chi tiết:</span>
                  {selectedStudent.talentProfile?.notes || "Chưa cập nhật cụ thể."}
                </div>
              </div>
            </div>

            {/* Attendance tracking details */}
            <div className="mt-6 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-indigo-500 fill-indigo-200" />
                <div>
                  <h5 className="font-bold text-slate-800 text-sm">Chuyên cần & Hoạt động tập thể</h5>
                  <p className="text-xs text-slate-500">Thống kê tích lũy tổng kết chuyên cần dạy học tháng qua.</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-medium block">Đi đủ</span>
                  <span className="font-mono text-sm font-bold text-emerald-600">{selectedStudent.attendance.presentDays}đ</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-medium block">Tổng</span>
                  <span className="font-mono text-sm font-bold text-slate-700">{selectedStudent.attendance.totalDays}n</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-medium block">Đi muộn</span>
                  <span className={`font-mono text-sm font-bold ${selectedStudent.attendance.lateDays > 2 ? "text-amber-500" : "text-slate-600"}`}>
                    {selectedStudent.attendance.lateDays}l
                  </span>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-medium block">Nghỉ</span>
                  <span className={`font-mono text-sm font-bold ${selectedStudent.attendance.absentDays > 1 ? "text-rose-500" : "text-slate-600"}`}>
                    {selectedStudent.attendance.absentDays}n
                  </span>
                </div>
              </div>
            </div>

            {/* NHẬT KÝ RÈN LUYỆN (ĐỒNG BỘ SỔ ĐẦU BÀI AI) */}
            <div className="mt-6 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  NHẬT KÝ RÈN LUYỆN CÁ NHÂN (AI ĐỒNG BỘ)
                </h4>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded-md">Tự động liên kết Sổ Đầu Bài</span>
              </div>
              
              {!selectedStudent.diary || selectedStudent.diary.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-100 rounded-xl">
                  🕒 Chưa có ghi chép nhật ký rèn luyện nào từ sổ đầu bài AI.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {selectedStudent.diary.slice().reverse().map((entry) => (
                    <div 
                      key={entry.id} 
                      className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                        entry.type === "khen_thuong" 
                          ? "bg-emerald-50/50 border-emerald-100 text-emerald-950" 
                          : "bg-rose-50/50 border-rose-100 text-rose-950"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded-md ${entry.type === "khen_thuong" ? "bg-emerald-100/80 text-emerald-800" : "bg-rose-100/80 text-rose-800"}`}>
                          {entry.type === "khen_thuong" ? "✨ Tuyên dương" : "⚠️ Nhắc nhở vi phạm"}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 font-mono font-medium">
                          <span>Môn: {entry.subject || "Sinh hoạt"}</span>
                          <span>•</span>
                          <span>{entry.date}</span>
                        </div>
                      </div>
                      <p className="text-xs font-bold leading-relaxed">
                        {entry.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
