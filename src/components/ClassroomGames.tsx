import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../utils/api";
import { 
  Trophy, 
  RefreshCw, 
  Play, 
  RotateCcw, 
  Award, 
  HelpCircle, 
  Users, 
  CheckSquare, 
  Square, 
  ArrowDown, 
  Bookmark, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Grid, 
  UserCheck, 
  Shuffle, 
  ChevronRight,
  Sparkle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Student } from "../types";

// Helper to render beautiful inline SVGs for ducks with various vibrant colors
const renderDuckSvg = (color: string, bodyWingColor: string = "#FFFFFF") => (
  <svg className="w-12 h-12 drop-shadow-md" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <path d="M12 36C12 28 18 24 26 24C34 24 38 28 42 36C45 42 41 46 36 46H18C13 46 12 42 12 36Z" fill={color} />
    {/* Tail */}
    <path d="M12 36C8 36 6 32 8 28C10 24 14 26 14 30" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Head */}
    <circle cx="38" cy="20" r="10" fill={color} />
    {/* Eye */}
    <circle cx="41" cy="18" r="2" fill="white" />
    <circle cx="41" cy="18" r="0.8" fill="black" />
    {/* Beak */}
    <path d="M46 18C48 18 52 19 52 21C52 23 48 24 46 24" fill="#FF6B6B" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Wing */}
    <path d="M22 36C22 32 26 30 30 30C34 30 34 34 32 36C30 38 24 38 22 36Z" fill={bodyWingColor} opacity="0.75" />
    {/* Water Splash */}
    <path d="M10 46C15 48 25 48 35 47C45 46 50 48 54 46" stroke="#54A0FF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const DUCK_COLORS = [
  "#FF9F43", // Orange
  "#FF6B6B", // Coral Red
  "#48DBFB", // Soft Blue
  "#1DD1A1", // Mint Green
  "#9D8DF1", // Pastel Purple
  "#FF9FF3", // Candy Pink
  "#FECA57", // Sun Yellow
  "#54A0FF", // Bright Blue
  "#10AC84", // Deep Emerald
  "#FF7675", // Rose Pink
];

const DUCK_WINGS = [
  "#FFF08A", "#FFE0E6", "#DFF9FB", "#E3FAF1", "#F5EFFF", "#FFF5F5"
];

// Fallback high-fidelity student data to ensure beautiful gameplay even if API is empty
const SAMPLE_STUDENTS: Student[] = [
  { id: "s1", name: "Nguyễn Minh Anh", gender: "Nam", dob: "2018-04-12", avatar: "", phone: "0912345678", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 4, shyness: 2, hyperactive: 1, focus: 5 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: true, music: false, sports: false, stem: true, notes: "" }, attendance: { totalDays: 30, presentDays: 29, lateDays: 1, absentDays: 0 }, behaviorCount: { forgetHomework: 0, lateToSchool: 0, distraction: 1 } },
  { id: "s2", name: "Trần Lê Thảo Chi", gender: "Nữ", dob: "2018-08-22", avatar: "", phone: "0912345679", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 5, shyness: 1, hyperactive: 3, focus: 4 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: false, music: true, sports: false, stem: false, notes: "" }, attendance: { totalDays: 30, presentDays: 30, lateDays: 0, absentDays: 0 }, behaviorCount: { forgetHomework: 1, lateToSchool: 0, distraction: 2 } },
  { id: "s3", name: "Phạm Quốc Bảo", gender: "Nam", dob: "2018-11-05", avatar: "", phone: "0912345680", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 3, shyness: 4, hyperactive: 2, focus: 3 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: false, music: false, sports: true, stem: true, notes: "" }, attendance: { totalDays: 30, presentDays: 28, lateDays: 0, absentDays: 2 }, behaviorCount: { forgetHomework: 0, lateToSchool: 1, distraction: 0 } },
  { id: "s4", name: "Lê Hoàng Nam", gender: "Nam", dob: "2018-01-15", avatar: "", phone: "0912345681", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 5, shyness: 1, hyperactive: 4, focus: 2 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: false, music: false, sports: true, stem: false, notes: "" }, attendance: { totalDays: 30, presentDays: 30, lateDays: 0, absentDays: 0 }, behaviorCount: { forgetHomework: 2, lateToSchool: 0, distraction: 3 } },
  { id: "s5", name: "Vũ Khánh An", gender: "Nữ", dob: "2018-05-30", avatar: "", phone: "0912345682", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 4, shyness: 3, hyperactive: 1, focus: 5 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: true, music: true, sports: false, stem: false, notes: "" }, attendance: { totalDays: 30, presentDays: 29, lateDays: 1, absentDays: 0 }, behaviorCount: { forgetHomework: 0, lateToSchool: 0, distraction: 0 } },
  { id: "s6", name: "Đặng Hồng Phúc", gender: "Nam", dob: "2018-10-18", avatar: "", phone: "0912345683", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 3, shyness: 2, hyperactive: 5, focus: 2 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: false, music: false, sports: true, stem: false, notes: "" }, attendance: { totalDays: 30, presentDays: 30, lateDays: 0, absentDays: 0 }, behaviorCount: { forgetHomework: 0, lateToSchool: 0, distraction: 4 } },
  { id: "s7", name: "Bùi Thị Mai Anh", gender: "Nữ", dob: "2018-02-28", avatar: "", phone: "0912345684", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 4, shyness: 3, hyperactive: 2, focus: 4 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: false, music: true, sports: false, stem: true, notes: "" }, attendance: { totalDays: 30, presentDays: 27, lateDays: 2, absentDays: 1 }, behaviorCount: { forgetHomework: 1, lateToSchool: 0, distraction: 1 } },
  { id: "s8", name: "Hoàng Đức Duy", gender: "Nam", dob: "2018-09-03", avatar: "", phone: "0912345685", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 5, shyness: 1, hyperactive: 3, focus: 3 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: false, music: false, sports: true, stem: true, notes: "" }, attendance: { totalDays: 30, presentDays: 30, lateDays: 0, absentDays: 0 }, behaviorCount: { forgetHomework: 0, lateToSchool: 0, distraction: 1 } },
  { id: "s9", name: "Ngô Gia Huy", gender: "Nam", dob: "2018-07-14", avatar: "", phone: "0912345686", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 4, shyness: 2, hyperactive: 2, focus: 5 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: true, music: false, sports: false, stem: true, notes: "" }, attendance: { totalDays: 30, presentDays: 29, lateDays: 0, absentDays: 1 }, behaviorCount: { forgetHomework: 0, lateToSchool: 1, distraction: 0 } },
  { id: "s10", name: "Phùng Mỹ Linh", gender: "Nữ", dob: "2018-03-25", avatar: "", phone: "0912345687", schoolGrade: 2, schoolClass: "2A", circular27Grades: {}, psychologicalProfile: { sociability: 3, shyness: 5, hyperactive: 1, focus: 4 }, semiBoardingProfile: { allergies: "", diet: "", healthNotes: "" }, talentProfile: { art: false, music: true, sports: false, stem: false, notes: "" }, attendance: { totalDays: 30, presentDays: 30, lateDays: 0, absentDays: 0 }, behaviorCount: { forgetHomework: 1, lateToSchool: 0, distraction: 2 } }
];

export default function ClassroomGames({ user }: { user?: any } = {}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState("2A");
  const [activeGame, setActiveGame] = useState<"duck_race" | "spin_wheel">("duck_race");
  const [presentMap, setPresentMap] = useState<{ [id: string]: boolean }>({});
  
  // Checking History
  const [calledHistory, setCalledHistory] = useState<{ student: Student; time: string; game: string }[]>([]);
  const [excludeCalled, setExcludeCalled] = useState(false);

  // sound setting
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Duck Race State
  const [duckPositions, setDuckPositions] = useState<{ [id: string]: number }>({});
  const [duckColorsMap, setDuckColorsMap] = useState<{ [id: string]: string }>({});
  const [duckWingColorsMap, setDuckWingColorsMap] = useState<{ [id: string]: string }>({});
  const [raceStatus, setRaceStatus] = useState<"idle" | "racing" | "finished">("idle");
  const [winner, setWinner] = useState<Student | null>(null);
  const [raceTimeElapsed, setRaceTimeElapsed] = useState(0); // 0 to 60 seconds

  useEffect(() => {
    if (user && user.classCode) {
      setSelectedClass(user.classCode);
    }
  }, [user]);
  const [targetWinnerId, setTargetWinnerId] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const DUCK_RACE_CAMERA_ZOOM = 2.5;
  
  // Spin Wheel State
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinWinner, setSpinWinner] = useState<Student | null>(null);

  // AI quick questions helpers (simulated pedagogical prompt ideas)
  const [selectedTopic, setSelectedTopic] = useState("Toán Học - Phép Cộng Trừ");
  const [aiQuestionText, setAiQuestionText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const raceTimer = useRef<NodeJS.Timeout | null>(null);

  // Audio synthetics
  const playSoundEffect = (type: "tick" | "win" | "splash" | "cheer") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "tick") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === "splash") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === "win") {
        // High melody
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } else if (type === "cheer") {
        // White noise-like effect
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      }
    } catch (e) {
      console.warn("Audio Context failed: web browser requires user gesture interaction first.", e);
    }
  };

  // 1. Fetch classroom students list
  useEffect(() => {
    async function loadStudents() {
      try {
        const resp = await apiFetch("/api/students");
        if (resp.ok) {
          let list = await resp.json() as Student[];
          if (user && user.classCode) {
            // For logged-in teachers, strictly show their class's students (even if empty)
            const filtered = list.filter(s => s.schoolClass === user.classCode);
            setStudents(filtered);
            initializeAttendance(filtered);
          } else {
            // For guest/demo users, fallback to sample students if database is empty
            if (list && list.length > 0) {
              setStudents(list);
              initializeAttendance(list);
            } else {
              setStudents(SAMPLE_STUDENTS);
              initializeAttendance(SAMPLE_STUDENTS);
            }
          }
        } else {
          if (user && user.classCode) {
            setStudents([]);
            initializeAttendance([]);
          } else {
            setStudents(SAMPLE_STUDENTS);
            initializeAttendance(SAMPLE_STUDENTS);
          }
        }
      } catch (e) {
        console.error("Error reading students roster:", e);
        if (user && user.classCode) {
          setStudents([]);
          initializeAttendance([]);
        } else {
          setStudents(SAMPLE_STUDENTS);
          initializeAttendance(SAMPLE_STUDENTS);
        }
      }
    }
    loadStudents();
  }, [user]);

  const initializeAttendance = (list: Student[]) => {
    const map: { [id: string]: boolean } = {};
    list.forEach(s => {
      map[s.id] = true; // by default everyone is present and active
    });
    setPresentMap(map);

    // Seed colors
    const colors: { [id: string]: string } = {};
    const wings: { [id: string]: string } = {};
    list.forEach((s, idx) => {
      colors[s.id] = DUCK_COLORS[idx % DUCK_COLORS.length];
      wings[s.id] = DUCK_WINGS[idx % DUCK_WINGS.length];
    });
    setDuckColorsMap(colors);
    setDuckWingColorsMap(wings);
  };

  // Filter students based on chosen class and current presence toggles
  const getActiveContestants = (): Student[] => {
    // Filter active class students
    const classFiltered = students.filter(
      (s) => s.schoolClass === selectedClass || selectedClass === "Tất cả"
    );

    // Exclude those marked as absent
    let active = classFiltered.filter(s => presentMap[s.id] !== false);

    // If exclude option is toggled, also filter out those already called in current session
    if (excludeCalled && calledHistory.length > 0) {
      const calledIds = calledHistory.map(h => h.student.id);
      active = active.filter(s => !calledIds.includes(s.id));
    }

    return active;
  };

  // Toggle present status
  const toggleStudentPresence = (id: string) => {
    setPresentMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectAll = (isPresent: boolean) => {
    const classFiltered = students.filter(
      (s) => s.schoolClass === selectedClass || selectedClass === "Tất cả"
    );
    const updated = { ...presentMap };
    classFiltered.forEach(s => {
      updated[s.id] = isPresent;
    });
    setPresentMap(updated);
  };

  // Keep every duck visible inside the camera frame even when race view is zoomed
  const getDuckCameraLayout = (index: number, totalContestants: number) => {
    const duckVisualHeightPx = 64 * (isZoomed ? DUCK_RACE_CAMERA_ZOOM : 0.9);
    const trackHeightPx = 340;
    const edgePaddingPx = isZoomed ? 18 : 22;
    const usableHeightPx = Math.max(0, trackHeightPx - edgePaddingPx * 2 - duckVisualHeightPx);
    const laneGapPx = totalContestants > 1 ? usableHeightPx / (totalContestants - 1) : 0;
    const centerYOffsetPx = totalContestants > 1 ? index * laneGapPx : usableHeightPx / 2;
    const topPercent = ((edgePaddingPx + duckVisualHeightPx / 2 + centerYOffsetPx) / trackHeightPx) * 100;

    const leftBasePx = isZoomed ? 108 : 48;
    const usableTrackPercent = isZoomed ? 20 : 82;

    return {
      topPercent,
      left: `calc(${leftBasePx}px + ${(usableTrackPercent / 100).toFixed(4)} * var(--duck-progress))`,
      scale: isZoomed ? DUCK_RACE_CAMERA_ZOOM : 0.9,
    };
  };

  // ==========================================
  // GAME 1: DUCK RACE CONTROLLER
  // ==========================================
  const startDuckRace = () => {
    const contestants = getActiveContestants();
    if (contestants.length === 0) {
      alert("Không có học sinh nào hoạt động trong danh sách! Vui lòng chọn hoặc bật điểm danh học sinh.");
      return;
    }

    // Reset positions
    const initialPositions: { [id: string]: number } = {};
    contestants.forEach(s => {
      initialPositions[s.id] = 0;
    });
    setDuckPositions(initialPositions);
    setWinner(null);
    setRaceTimeElapsed(0);
    
    // Choose winner randomly at the start to guide them smoothly to finish line at exactly 60.0s
    const chosenWinner = contestants[Math.floor(Math.random() * contestants.length)];
    setTargetWinnerId(chosenWinner.id);
    
    setRaceStatus("racing");
    playSoundEffect("splash");

    // Clear existing timer
    if (raceTimer.current) clearInterval(raceTimer.current);

    let elapsed = 0;
    // High-precision 100ms game loop for exactly 60 seconds (600 ticks)
    raceTimer.current = setInterval(() => {
      elapsed = Math.round((elapsed + 0.1) * 10) / 10;
      
      if (elapsed >= 60) {
        if (raceTimer.current) clearInterval(raceTimer.current);
        
        // Finish line reach
        const finalPositions: { [id: string]: number } = {};
        contestants.forEach(s => {
          if (s.id === chosenWinner.id) {
            finalPositions[s.id] = 100;
          } else {
            const idx = contestants.indexOf(s);
            finalPositions[s.id] = 88 + (idx % 8); // nice scatter at the end
          }
        });
        
        setDuckPositions(finalPositions);
        setRaceTimeElapsed(60);

        setTimeout(() => {
          setWinner(chosenWinner);
          setRaceStatus("finished");
          playSoundEffect("win");
          playSoundEffect("cheer");

          // Save to history
          const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setCalledHistory(prevHistory => [
            { student: chosenWinner, time: timeStr, game: "Đua Vịt Sư Phạm" },
            ...prevHistory
          ]);
        }, 300);

        return;
      }

      setRaceTimeElapsed(elapsed);

      // Compute dynamic positions based on a beautiful fluid wave mechanics model
      setDuckPositions(() => {
        const next: { [id: string]: number } = {};
        const startEase = Math.min(1, elapsed / 4.0); // smooth start over 4s
        const dampening = Math.max(0, (60 - elapsed) / 60); // dampens fluctuations as they reach finish line

        contestants.forEach((s, idx) => {
          // Water wave oscillation + speed fluctuation
          const wave = Math.sin(elapsed * 1.5 + idx * 2.0) * 3;
          const speedFluc = Math.cos(elapsed * 0.5 + idx * 3.5) * 5;
          const fluctuation = (wave + speedFluc) * dampening * startEase;

          if (s.id === chosenWinner.id) {
            const baseProgress = (elapsed / 60) * 100;
            const pos = baseProgress + fluctuation;
            next[s.id] = Math.max(0, Math.min(97, pos)); // cap slightly below 100 until exactly 60.0s
          } else {
            const maxTarget = 86 + (idx % 7); // end just behind
            const baseProgress = (elapsed / 60) * maxTarget;
            const pos = baseProgress + fluctuation;
            next[s.id] = Math.max(0, Math.min(maxTarget, pos));
          }
        });

        return next;
      });
    }, 100);
  };

  const resetDuckRace = () => {
    if (raceTimer.current) clearInterval(raceTimer.current);
    setRaceStatus("idle");
    setWinner(null);
    setRaceTimeElapsed(0);
    setTargetWinnerId(null);
    setIsZoomed(false); // Reset back to overview
    const contestants = getActiveContestants();
    const initialPositions: { [id: string]: number } = {};
    contestants.forEach(s => {
      initialPositions[s.id] = 0;
    });
    setDuckPositions(initialPositions);
  };

  // ==========================================
  // GAME 2: SPIN WHEEL CONTROLLER
  // ==========================================
  const startSpinWheel = () => {
    const contestants = getActiveContestants();
    if (contestants.length === 0) {
      alert("Không có học sinh nào hoạt động để đưa vào Vòng Quay! Vui lòng chọn hoặc bật điểm danh.");
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setSpinWinner(null);

    // 1. Fully independent random calculations
    const N = contestants.length;
    const anglePerSegment = 360 / N;
    
    // Choose a truly random index
    const winningIdx = Math.floor(Math.random() * N);
    const winningStudent = contestants[winningIdx];

    // Align pointer is at the top (270 degrees).
    // Let's force the spin to rotate multiple full rounds plus the angle that lines up the winner segment at 270 degrees.
    // Middle angle of winning sector: (winningIdx + 0.5) * anglePerSegment
    // To make this sector end up at 270 degrees top, the rotation should satisfy:
    // (270 - wheelRotation) % 360 = middleAngleOfWinningSector
    // => wheelRotation = 270 - middleAngleOfWinningSector
    const middleAngle = (winningIdx + 0.5) * anglePerSegment;
    const targetOffset = (270 - middleAngle + 360) % 360;

    const extraRounds = 5 + Math.floor(Math.random() * 3); // 5 to 7 full circles
    const targetRotation = extraRounds * 360 + targetOffset;

    // Trigger visual rotation
    setWheelRotation(targetRotation);

    // Simulate sound ticks during spin
    let currentTickAngle = 0;
    const tickInterval = setInterval(() => {
      playSoundEffect("tick");
    }, 250);

    // Rotation takes 4 seconds (cubic-bezier css easeout)
    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setSpinWinner(winningStudent);
      playSoundEffect("win");
      playSoundEffect("cheer");

      // Save to history
      const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCalledHistory(prevHistory => [
        { student: winningStudent, time: timeStr, game: "Vòng Quay Kỳ Diệu" },
        ...prevHistory
      ]);
    }, 4000);
  };

  const resetSpinWheel = () => {
    if (isSpinning) return;
    setWheelRotation(0);
    setSpinWinner(null);
  };



  // Clear session history
  const clearSessionHistory = () => {
    if (window.confirm("Bạn có muốn đặt lại toàn bộ lịch sử gọi tên bài cũ trong phiên này không?")) {
      setCalledHistory([]);
    }
  };

  const contestants = getActiveContestants();

  return (
    <div className="space-y-6" id="classroom-games-root">
      
      {/* CLASSROOM CONTROL PANEL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE ROSTER AND CLASS SELECTION (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            
            {/* Filter and class selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  Danh sách sỹ số lớp
                </h3>
                
                {/* Class selector */}
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-2 py-1 focus:outline-hidden"
                >
                  {user && user.classCode && (
                    <option value={user.classCode}>Lớp chủ nhiệm ({user.classCode})</option>
                  )}
                  <option value="2A">Lớp 2A</option>
                  <option value="3A">Lớp 3A</option>
                  <option value="4A">Lớp 4A</option>
                  <option value="5A">Lớp 5A</option>
                  <option value="Tất cả">Tất cả các khối</option>
                </select>
              </div>

              {/* Attendance and session rules */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Thiết lập gọi ngẫu nhiên</span>
                
                {/* Exclude called toggler */}
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={excludeCalled}
                    onChange={(e) => setExcludeCalled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Loại bỏ học sinh đã kiểm tra</span>
                </label>
                <p className="text-[9px] text-slate-400 pl-6 italic leading-snug">
                  Học sinh sau khi đã lên bảng sẽ không bị trùng lặp trong lượt đua tiếp theo của tiết học này.
                </p>
              </div>

              {/* Quick presence actions */}
              <div className="flex justify-between items-center text-[10px] text-indigo-600 font-bold px-1">
                <button onClick={() => selectAll(true)} className="hover:underline cursor-pointer">✓ Có mặt tất cả</button>
                <button onClick={() => selectAll(false)} className="hover:underline text-slate-500 cursor-pointer">✗ Vắng tất cả</button>
              </div>

              {/* Students attendance scrolling checklist */}
              <div className="border border-slate-100 rounded-xl max-h-64 overflow-y-auto scrollbar-thin divide-y divide-slate-50 pr-1">
                {students.filter(s => s.schoolClass === selectedClass || selectedClass === "Tất cả").length === 0 ? (
                  <div className="p-6 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-500">Danh sách học sinh đang trống</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Lớp <span className="font-bold text-indigo-600">{selectedClass}</span> chưa có học sinh nào. 
                      Vui lòng quay lại tab <strong className="text-indigo-600 font-bold">Danh Sách Lớp Học</strong> để nhập hoặc thêm học sinh mới trước khi chơi game gọi tên.
                    </p>
                  </div>
                ) : (
                  students
                    .filter(s => s.schoolClass === selectedClass || selectedClass === "Tất cả")
                    .map((s) => {
                      const isPresent = presentMap[s.id] !== false;
                      const hasBeenCalled = calledHistory.some(h => h.student.id === s.id);

                      return (
                        <div 
                          key={s.id} 
                          onClick={() => toggleStudentPresence(s.id)}
                          className={`flex items-center justify-between p-2.5 transition-all cursor-pointer text-xs ${
                            isPresent 
                              ? "bg-white hover:bg-slate-50" 
                              : "bg-red-50/40 opacity-55 text-slate-400 line-through"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isPresent ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className="font-bold truncate text-slate-800">{s.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasBeenCalled && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                Đã gọi
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {s.gender === "Nam" ? "👦" : "👧"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* STATISTICS ACCORDION */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 font-bold flex justify-between items-center">
                <span>Số lượng tham gia quay:</span>
                <span className="bg-indigo-600 text-white font-black px-2 py-0.5 rounded-md">
                  {contestants.length} / {students.filter(s => s.schoolClass === selectedClass || selectedClass === "Tất cả").length} HS
                </span>
              </div>
            </div>

          </div>

          {/* HISTORICAL LOGS CARD */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-slate-500" />
                Lịch sử gọi bài tiết này
              </h3>
              {calledHistory.length > 0 && (
                <button 
                  onClick={clearSessionHistory}
                  className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Xóa sạch
                </button>
              )}
            </div>

            {calledHistory.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400 italic">Chưa gọi học sinh nào bài cũ.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                {calledHistory.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 truncate">{item.student.name}</p>
                      <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{item.game}</span>
                        <span>•</span>
                        <span>{item.time}</span>
                      </p>
                    </div>
                    <span className="text-[14px] shrink-0">⭐</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE GAME STAGE (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* GAME SELECTION BAR */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200 flex justify-between items-center gap-2 shadow-xs">
            <button
              onClick={() => {
                setActiveGame("duck_race");
                resetDuckRace();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeGame === "duck_race"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              🐥 TRÒ CHƠI ĐUA VỊT SƯ PHẠM
            </button>
            <button
              onClick={() => {
                setActiveGame("spin_wheel");
                resetSpinWheel();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeGame === "spin_wheel"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              🎯 VÒNG QUAY KỲ DIỆU (SPIN)
            </button>
          </div>

          {/* ACTIVE GAME WINDOW */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden min-h-[480px] flex flex-col justify-between">
            
            {/* ABSOLUTE DECORATIONS */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500" />

            {/* STAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Trò chơi tương tác
                </span>
                <h3 className="font-extrabold text-slate-900 text-base mt-1">
                  {activeGame === "duck_race" ? "🐥 Đường Đua Vịt Vàng Kỳ Thú" : "🎯 Vòng Quay Gọi Tên Ngẫu Nhiên"}
                </h3>
              </div>

            </div>

            {/* GAME 1 CONTENT: DUCK RACING FIELD */}
            {activeGame === "duck_race" && (
              <div className="my-6 flex-1 flex flex-col justify-between">
                
                {/* 1-Minute Countdown Clock Display */}
                <div className="mb-4 bg-sky-50/80 border border-sky-100 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl filter drop-shadow-sm">⏱️</span>
                    <div>
                      <p className="font-extrabold text-slate-850">Thời gian thi đấu: 1 phút (60 giây)</p>
                      <p className="text-[10px] text-slate-500 font-medium">Dự đoán chú vịt đồ chơi nhiều màu bơi nhanh nhất để lên kiểm tra bài cũ!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-mono bg-slate-900 text-yellow-400 font-bold px-3 py-1.5 rounded-xl text-sm border border-slate-800 shadow-inner">
                      {Math.max(0, 60 - Math.floor(raceTimeElapsed))}s
                    </div>
                    <div className="w-28 bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner relative">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-300"
                        style={{ width: `${(raceTimeElapsed / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Real-time Top 3 Leaderboard */}
                {contestants.length > 0 && (
                  <div className="mb-4 bg-slate-900/95 text-white rounded-2xl p-4 border border-slate-800 shadow-md">
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10">
                      <Trophy className="w-4 h-4 text-yellow-400 animate-pulse" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">Bảng Xếp Hạng Top 3 Dẫn Đầu (Thời gian thực)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const sorted = [...contestants].sort((a, b) => (duckPositions[b.id] || 0) - (duckPositions[a.id] || 0));
                        const topThree = sorted.slice(0, 3);
                        const medals = ["🥇", "🥈", "🥉"];
                        const badgeColors = ["bg-amber-500/10 border-amber-500/30 text-amber-300", "bg-slate-400/10 border-slate-400/30 text-slate-300", "bg-amber-700/10 border-amber-700/30 text-amber-400"];
                        return topThree.map((s, idx) => {
                          const pos = Math.round(duckPositions[s.id] || 0);
                          return (
                            <div key={s.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[11px] font-extrabold ${badgeColors[idx] || "bg-slate-800 border-slate-700"}`}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm shrink-0">{medals[idx]}</span>
                                <span className="truncate text-white text-xs" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{s.name.split(" ").pop()}</span>
                              </div>
                              <span className="font-mono text-[10px] bg-slate-950/50 px-1.5 py-0.5 rounded text-slate-300 shrink-0">
                                {pos}%
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Sông nước Lane layout (Camera Viewport) */}
                <div className="rounded-2xl overflow-hidden relative min-h-[340px] shadow-inner select-none border border-sky-500/25 bg-sky-950/20 w-full">
                  
                  {/* Scrolling track container */}
                  <div 
                    className="relative min-h-[340px] select-none river-bg"
                    style={{
                      width: "100%",
                      transform: "none",
                      transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
                      willChange: "transform",
                    }}
                  >
                    
                    {/* CSS STYLES FOR LANDSCAPE AND WAVES */}
                    <style dangerouslySetInnerHTML={{ __html: `
                      @keyframes river-flow {
                        0% { background-position-x: 0px; }
                        100% { background-position-x: 1000px; }
                      }
                      @keyframes bobbing {
                        0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
                        25% { transform: translate3d(0, -2px, 0) rotate(1deg); }
                        50% { transform: translate3d(0, 3px, 0) rotate(2.2deg); }
                        75% { transform: translate3d(0, -1px, 0) rotate(0.5deg); }
                      }
                      .river-bg {
                        background: linear-gradient(180deg, #38bdf8 0%, #0284c7 35%, #0369a1 75%, #075985 100%);
                        position: relative;
                      }
                      .river-stream {
                        position: absolute;
                        inset: 0;
                        background-image: radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.12) 0%, transparent 50%),
                                          radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
                        pointer-events: none;
                      }
                      .river-waves-1 {
                        position: absolute;
                        inset: 0;
                        opacity: 0.22;
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='24' viewBox='0 0 80 24'%3E%3Cpath d='M0 12 Q 20 6, 40 12 T 80 12' fill='none' stroke='white' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
                        background-repeat: repeat;
                        animation: river-flow 12s linear infinite;
                        pointer-events: none;
                      }
                      .river-waves-2 {
                        position: absolute;
                        inset: 0;
                        opacity: 0.14;
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='30' viewBox='0 0 120 30'%3E%3Cpath d='M0 15 Q 30 7.5, 60 15 T 120 15' fill='none' stroke='white' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E");
                        background-repeat: repeat;
                        animation: river-flow 20s linear infinite reverse;
                        pointer-events: none;
                      }
                      .duck-swimming {
                        animation: bobbing 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                        will-change: transform, left;
                      }
                      .water-lily {
                        position: absolute;
                        width: 24px;
                        height: 24px;
                        opacity: 0.85;
                        pointer-events: none;
                        z-index: 5;
                      }
                    `}} />

                    {/* Water stream, waves overlays */}
                    <div className="river-stream" />
                    <div className="river-waves-1" />
                    <div className="river-waves-2" />

                    {/* Starting Wooden Dock background on the left */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-amber-800/40 border-r border-amber-900/25 z-10 flex flex-col justify-around py-6 items-center shadow-md">
                      <div className="w-1.5 h-12 bg-amber-950/50 rounded-full" />
                      <div className="w-1.5 h-12 bg-amber-950/50 rounded-full" />
                      <div className="w-1.5 h-12 bg-amber-950/50 rounded-full" />
                    </div>

                    {/* Decorative clover icons with broad emoji/font support */}
                    <div className="water-lily top-2.5 left-[10%]">🍀</div>
                    <div className="water-lily bottom-6 left-[30%]">🍀</div>
                    <div className="water-lily top-4 left-[50%]">🍀</div>
                    <div className="water-lily bottom-4 left-[70%]">🍀</div>
                    <div className="water-lily top-3.5 left-[88%]">🍀</div>
                    
                    {/* FINISH LINE BANNER */}
                    <div className="absolute right-14 top-0 bottom-0 w-1.5 bg-gradient-to-b from-red-500 via-white to-red-500 z-30 shadow-sm flex items-center justify-center">
                      <div className="absolute -top-1.5 bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-md border border-red-500 rotate-6 shadow-md uppercase tracking-widest whitespace-nowrap">ĐÍCH 🏁</div>
                    </div>

                    {contestants.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-white/85 text-xs text-center space-y-2 relative z-20">
                        <HelpCircle className="w-8 h-8 text-white/60 animate-pulse" />
                        <p>Vui lòng kích hoạt ít nhất 1 học sinh ở cột bên trái để bắt đầu đường đua.</p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 z-20 overflow-hidden">
                        {contestants.map((s, idx) => {
                          const positionPercent = duckPositions[s.id] || 0;
                          const duckColor = duckColorsMap[s.id] || "#FF9F43";
                          const duckWingColor = duckWingColorsMap[s.id] || "#FFFFFF";

                          const totalContestants = contestants.length;
                          const { topPercent, left, scale } = getDuckCameraLayout(idx, totalContestants);

                          return (
                            <div 
                              key={s.id} 
                              className="absolute flex flex-col items-center z-20 duck-swimming group" 
                                style={{ 
                                  ["--duck-progress" as any]: `${positionPercent}%`,
                                  top: `${topPercent}%`,
                                  left,
                                transform: `translate(-50%, -50%) scale(${scale})`,
                                transformOrigin: "center center",
                                transition: raceStatus === "racing" 
                                  ? "left 0.26s cubic-bezier(0.22, 1, 0.36, 1), top 0.45s ease-out, transform 0.65s ease-out" 
                                  : "left 0.6s cubic-bezier(0.22, 1, 0.36, 1), top 0.45s ease-out, transform 0.55s ease-out",
                                willChange: "left, transform",
                                zIndex: 10 + Math.floor(topPercent)
                              }}
                            >
                              {/* Floating Student Name Plate */}
                              <div className="mb-1 bg-slate-950/85 group-hover:bg-indigo-900 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap transition-all flex items-center gap-1 scale-95 origin-bottom">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: duckColor }} />
                                {s.name.split(" ").pop()}
                              </div>

                              {/* Beautiful Animated Duck representation */}
                              <div className="relative hover:scale-110 transition-transform">
                                {renderDuckSvg(duckColor, duckWingColor)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={startDuckRace}
                    disabled={raceStatus === "racing" || contestants.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white font-black text-xs tracking-wider px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:bg-slate-200 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    BẮT ĐẦU ĐUA VỊT!
                  </button>
                  <button
                    onClick={resetDuckRace}
                    disabled={raceStatus === "racing"}
                    className="bg-slate-100 hover:bg-slate-200 active:bg-slate-250 border border-slate-250 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Xếp hàng lại
                  </button>
                    <button
                      onClick={() => {
                        setIsZoomed(!isZoomed);
                        playSoundEffect("tick");
                      }}
                      className={`font-extrabold text-xs px-4 py-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isZoomed 
                          ? "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🔍 Camera: {isZoomed ? "Zoom 250%" : "Toàn Cảnh"}
                  </button>
                </div>

              </div>
            )}

            {/* GAME 2 CONTENT: SPIN WHEEL */}
            {activeGame === "spin_wheel" && (
              <div className="my-6 flex-1 flex flex-col justify-between items-center">
                
                {/* SVG SPIN WHEEL CONSTRUCT */}
                <div className="relative w-80 h-80 flex items-center justify-center select-none">
                  
                  {/* UPPER POINTER ARROW */}
                  <div className="absolute -top-3 z-30 animate-bounce" style={{ animationDuration: "1s" }}>
                    <ArrowDown className="w-8 h-8 text-rose-600 filter drop-shadow-md" />
                  </div>

                  {/* ROTATING PIE GROUP */}
                  {contestants.length === 0 ? (
                    <div className="w-64 h-64 rounded-full border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center space-y-1">
                      <HelpCircle className="w-8 h-8 text-slate-300 animate-pulse" />
                      <p>Không có học sinh hoạt động nào để đưa lên bánh xe.</p>
                    </div>
                  ) : (
                    <div 
                      className="w-72 h-72 rounded-full shadow-2xl relative border-8 border-slate-900 overflow-hidden"
                      style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        transition: isSpinning 
                          ? "transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)" 
                          : "transform 0.5s ease-out"
                      }}
                    >
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {contestants.map((s, idx) => {
                          const N = contestants.length;
                          const anglePerSegment = 360 / N;
                          const startAngle = idx * anglePerSegment;
                          const endAngle = (idx + 1) * anglePerSegment;
                          
                          // Convert polar to Cartesian for SVG path
                          const rad = (deg: number) => (deg - 90) * Math.PI / 180;
                          const x1 = 100 + 100 * Math.cos(rad(startAngle));
                          const y1 = 100 + 100 * Math.sin(rad(startAngle));
                          const x2 = 100 + 100 * Math.cos(rad(endAngle));
                          const y2 = 100 + 100 * Math.sin(rad(endAngle));
                          
                          const largeArcFlag = anglePerSegment > 180 ? 1 : 0;
                          const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                          
                          // Distinct color slice
                          const sliceColor = DUCK_COLORS[idx % DUCK_COLORS.length];
                          
                          // Calculate text label position (middle of sector)
                          const middleRad = rad(startAngle + anglePerSegment / 2);
                          const textX = 100 + 65 * Math.cos(middleRad);
                          const textY = 100 + 65 * Math.sin(middleRad);
                          const textRotation = startAngle + anglePerSegment / 2;

                          return (
                            <g key={s.id}>
                              {/* Sector Path */}
                              <path 
                                d={pathData} 
                                fill={sliceColor} 
                                stroke="#FFFFFF" 
                                strokeWidth="1.5" 
                              />
                              {/* Student Name rotated nicely */}
                              <text
                                x={textX}
                                y={textY}
                                fill="#FFFFFF"
                                fontSize="6"
                                fontWeight="black"
                                textAnchor="middle"
                                transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                                className="font-sans drop-shadow-xs select-none"
                              >
                                {s.name.split(" ").pop()}
                              </text>
                            </g>
                          );
                        })}
                        {/* Center golden pin */}
                        <circle cx="100" cy="100" r="14" fill="#FECA57" stroke="#1E272C" strokeWidth="2.5" />
                        <circle cx="100" cy="100" r="6" fill="#FFFFFF" />
                      </svg>
                    </div>
                  )}

                  {/* CENTER SPIN ACTION CAP */}
                  {contestants.length > 0 && (
                    <button
                      onClick={startSpinWheel}
                      disabled={isSpinning}
                      className="absolute w-16 h-16 rounded-full bg-slate-950 text-white font-black text-[11px] flex flex-col items-center justify-center shadow-lg border-4 border-amber-400 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-90 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>QUAY</span>
                      <span className="text-[7px] text-amber-300">NGAY</span>
                    </button>
                  )}
                </div>

                {/* SPIN WHEEL CONTROLS */}
                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={startSpinWheel}
                    disabled={isSpinning || contestants.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white font-black text-xs tracking-wider px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:bg-slate-200 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSpinning ? "animate-spin" : ""}`} />
                    BẮT ĐẦU QUAY BÁNH XE
                  </button>
                  <button
                    onClick={resetSpinWheel}
                    disabled={isSpinning}
                    className="bg-slate-100 hover:bg-slate-200 active:bg-slate-250 border border-slate-250 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Đặt lại góc 0°
                  </button>
                </div>

              </div>
            )}

            {/* PEDAGOGICAL FAIRNESS GUARANTEE FOOTNOTE */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-500 italic text-center mt-3 flex items-center justify-center gap-2">
              <Shuffle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>
                (*) Thuật toán xáo trộn ngẫu nhiên độc lập 100%. Xác suất mỗi học sinh được chọn ở mỗi lượt là công bằng khách quan và không chịu ảnh hưởng của các lượt gọi trước.
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* DETAILED WINNER AND SMART AI ORAL QUIZ MODAL */}
      <AnimatePresence>
        {(winner || spinWinner) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-150 relative"
            >
              {/* STYLISH ACCENT BAR */}
              <div className="h-2 bg-gradient-to-r from-yellow-400 via-indigo-500 to-emerald-500" />
              
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* CONGRATULATION LOGO */}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                      <Trophy className="w-8 h-8 text-amber-500 animate-bounce" />
                    </div>
                    <Sparkle className="w-5 h-5 text-indigo-500 absolute top-0 right-0 animate-spin" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-full">
                      Học sinh may mắn lên bảng
                    </span>
                    <h3 className="font-black text-2xl text-slate-900 mt-1.5">
                      {(winner || spinWinner)?.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sỹ số lớp: <b className="text-slate-800">{(winner || spinWinner)?.schoolClass}</b> | Giới tính: <b className="text-slate-800">{(winner || spinWinner)?.gender}</b>
                    </p>
                  </div>
                </div>



                {/* CLOSE ACTIONS */}
                <div className="flex justify-end gap-2.5">
                  <button
                    onClick={() => {
                      resetDuckRace();
                      resetSpinWheel();
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-250 active:bg-slate-350 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Bỏ qua lượt
                  </button>
                  <button
                    onClick={() => {
                      resetDuckRace();
                      resetSpinWheel();
                    }}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    Đã hoàn thành kiểm tra
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
