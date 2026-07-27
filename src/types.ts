/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AssessmentValue {
  CHT = 1, // Chưa hoàn thành
  HT = 2,  // Hoàn thành
  HTT = 3  // Hoàn thành tốt
}

export interface SubjectGradeItem {
  subject: string;
  monthlyGrades: { [month: string]: number };
  yearlySummary: number;
}

export interface ConductEvaluation {
  conduct: "Tốt" | "Khá" | "Trung bình" | "Yếu";
  teacherAssessment: string;
  extraCurricularActivities: string[];
}

export interface Student {
  id: string;
  name: string;
  gender: "Nam" | "Nữ";
  dob: string;
  avatar: string;
  phone: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  schoolGrade: number; // e.g. 4
  schoolClass: string; // e.g. "4A"
  circular27Grades: { [weekNumber: number]: AssessmentValue }; // week 1 to 4
  psychologicalProfile: {
    sociability: number; // 1-5
    shyness: number;     // 1-5
    hyperactive: number; // 1-5
    focus: number;       // 1-5
  };
  semiBoardingProfile: {
    allergies: string;
    diet: string;
    healthNotes: string;
  };
  talentProfile: {
    art: boolean;
    music: boolean;
    sports: boolean;
    stem: boolean;
    notes: string;
  };
  attendance: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
  };
  behaviorCount: {
    forgetHomework: number;
    lateToSchool: number;
    distraction: number;
  };
  monthlyGradesList?: SubjectGradeItem[];
  conductEvaluation?: ConductEvaluation;
  diary?: StudentDiaryEntry[];
}

export interface LessonPlanActivity {
  title: string;
  teacherActions: string; // Action of Teacher
  studentActions: string; // Action of Student
  duration: string;       // e.g. "10 phút"
}

export interface LessonPlan {
  grade: number;
  subject: string;
  topic: string;
  curriculum: "Kết nối tri thức" | "Chân trời sáng tạo" | "Cánh diều";
  activities: {
    warmup: LessonPlanActivity;
    explore: LessonPlanActivity;
    practice: LessonPlanActivity;
    apply: LessonPlanActivity;
  };
  objectives: string[];
  materials: {
    teacher: string[];
    student: string[];
  };
  isFromCache: boolean;
}

export interface SlideItem {
  slideNumber: number;
  part?: string;
  title: string;
  points: string[];
  illustrationPrompt: string;
  illustrationStyleBase: string;
  speakingScript: string;
  activityLabel: string;
  activityContent: string;
  simulatedImage?: string; // Seeded illustrations suitable for Vietnamese schools
  objective?: string;      // Mục tiêu slide
  layout?: string;         // Bố cục đề xuất
  illustration?: string;   // Hình minh họa đề xuất
  searchKeyword?: string;  // Từ khóa tìm ảnh
  animation?: string;      // Hiệu ứng chuyển động (nếu có)
}

export interface ReportCommentInput {
  praise: string;
  feedback: string;
  encouragement: string;
}

export interface ReportCommentOutput {
  rawComment: string;
  cleanedComment: string;
  wordGuardViolations: string[];
  hasBeenCleaned: boolean;
  stepComments: {
    praise: string;
    feedback: string;
    encouragement: string;
  };
}

export interface ParentMemo {
  studentId: string;
  weekNumber: number;
  date: string;
  content: string; // Sandwich style
  history: string;
}

export interface InterventionPlan {
  riskScore: number; // 0-100%
  summary: string;
  keyIssues: string[];
  actions: {
    school: string[];
    family: string[];
  };
}

export interface StudentDiaryEntry {
  id: string;
  date: string;
  type: "khen_thuong" | "vi_pham";
  content: string;
  subject?: string;
}

export interface ClassJournalEntry {
  id: string;
  date: string;
  lessonNumber: number;
  subject: string;
  lessonTopic: string;
  teacherComment: string;
  evaluation: string;
  orderliness: "Tốt" | "Khá" | "Trung bình" | "Yếu";
  studentPraise: { studentId?: string; studentName: string; note: string }[];
  studentInfractions: { studentId?: string; studentName: string; note: string }[];
}

