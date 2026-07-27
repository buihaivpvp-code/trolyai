/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ASSESSMENT VALUES FOR CIRCULAR 27 GRADES
 */
export enum AssessmentValue {
  CHT = 1, // Chưa hoàn thành (Uncompleted)
  HT = 2,  // Hoàn thành (Completed)
  HTT = 3  // Hoàn thành tốt (Excellently Completed)
}

/**
 * 1. USERS TABLE SCHEMA (Primary keys, hashed passwords, roles)
 */
export interface UserSchema {
  id: string;          // VARCHAR, PRIMARY KEY
  email: string;       // VARCHAR, UNIQUE, NOT NULL
  passwordHash: string; // VARCHAR, NOT NULL
  name: string;        // VARCHAR, NOT NULL
  role: "teacher" | "admin"; // VARCHAR, NOT NULL
  classCode: string;   // VARCHAR, NOT NULL (e.g. "4A", "all")
  avatar?: string;     // VARCHAR
  phone?: string;      // VARCHAR
  dob?: string;        // DATE (YYYY-MM-DD)
  workplace?: string;  // VARCHAR
  experience?: string; // VARCHAR
  achievements?: string; // VARCHAR
  bio?: string;        // VARCHAR
  hasCompletedOnboarding?: boolean; // BOOLEAN
}

/**
 * 2. STUDENTS BASE TABLE SCHEMA (Core demographics, parents' contact info)
 */
export interface StudentSchema {
  id: string;          // VARCHAR, PRIMARY KEY
  ownerId?: string;    // VARCHAR, partition key by authenticated account
  name: string;        // VARCHAR, NOT NULL
  gender: "Nam" | "Nữ"; // VARCHAR, NOT NULL
  dob: string;         // DATE (YYYY-MM-DD), NOT NULL
  avatar: string;      // VARCHAR
  phone: string;       // VARCHAR, NOT NULL
  fatherName: string;  // VARCHAR
  fatherPhone: string; // VARCHAR
  motherName: string;  // VARCHAR
  motherPhone: string; // VARCHAR
  schoolGrade: number; // INTEGER, NOT NULL (e.g. 4)
  schoolClass: string; // VARCHAR, NOT NULL (e.g. "4A")
}

/**
 * 3. CIRCULAR 27 GRADES RELATION TABLE (Week-by-week academic assessment)
 */
export interface Circular27GradeSchema {
  studentId: string;    // VARCHAR, PRIMARY KEY, FOREIGN KEY -> StudentSchema.id
  weekNumber: number;   // INTEGER, PRIMARY KEY (Composite Key: studentId + weekNumber)
  gradeValue: AssessmentValue; // INTEGER (1 | 2 | 3), NOT NULL
}

/**
 * 4. PSYCHOLOGICAL PROFILES RELATION TABLE (Behavior and mental analytics)
 */
export interface PsychologicalProfileSchema {
  studentId: string;    // VARCHAR, PRIMARY KEY, FOREIGN KEY -> StudentSchema.id
  sociability: number;  // INTEGER (1-5), NOT NULL
  shyness: number;      // INTEGER (1-5), NOT NULL
  hyperactive: number;  // INTEGER (1-5), NOT NULL
  focus: number;        // INTEGER (1-5), NOT NULL
}

/**
 * 5. SEMI-BOARDING PROFILES RELATION TABLE (Health and nutrition management)
 */
export interface SemiBoardingProfileSchema {
  studentId: string;    // VARCHAR, PRIMARY KEY, FOREIGN KEY -> StudentSchema.id
  allergies: string;    // TEXT, NOT NULL (e.g. "Hải sản vỏ cứng")
  diet: string;         // TEXT, NOT NULL (e.g. "Ăn ít mỡ")
  healthNotes: string;  // TEXT, NOT NULL
}

/**
 * 6. TALENT PROFILES RELATION TABLE (Extracurricular talents)
 */
export interface TalentProfileSchema {
  studentId: string;    // VARCHAR, PRIMARY KEY, FOREIGN KEY -> StudentSchema.id
  art: boolean;         // BOOLEAN, NOT NULL
  music: boolean;       // BOOLEAN, NOT NULL
  sports: boolean;      // BOOLEAN, NOT NULL
  stem: boolean;        // BOOLEAN, NOT NULL
  notes: string;        // TEXT, NOT NULL
}

/**
 * 7. ATTENDANCES RELATION TABLE (Monthly track record of presence)
 */
export interface AttendanceSchema {
  studentId: string;    // VARCHAR, PRIMARY KEY, FOREIGN KEY -> StudentSchema.id
  totalDays: number;    // INTEGER, NOT NULL
  presentDays: number;  // INTEGER, NOT NULL
  lateDays: number;     // INTEGER, NOT NULL
  absentDays: number;   // INTEGER, NOT NULL
}

/**
 * 8. BEHAVIOR COUNTS RELATION TABLE (Trackers of negative behavior frequency)
 */
export interface BehaviorCountSchema {
  studentId: string;    // VARCHAR, PRIMARY KEY, FOREIGN KEY -> StudentSchema.id
  forgetHomework: number; // INTEGER, NOT NULL
  lateToSchool: number;   // INTEGER, NOT NULL
  distraction: number;    // INTEGER, NOT NULL
}

/**
 * 9. STUDENT DIARIES RELATION TABLE (Individual events / logbook)
 */
export interface StudentDiarySchema {
  id: string;          // VARCHAR, PRIMARY KEY
  studentId: string;   // VARCHAR, FOREIGN KEY -> StudentSchema.id
  date: string;        // DATE, NOT NULL
  type: "khen_thuong" | "vi_pham"; // VARCHAR, NOT NULL
  content: string;     // TEXT, NOT NULL
  subject?: string;    // VARCHAR
}

/**
 * 10. CLASS JOURNALS TABLE SCHEMA (Daily educational logs for the class)
 */
export interface ClassJournalSchema {
  id: string;          // VARCHAR, PRIMARY KEY
  ownerId?: string;    // VARCHAR, partition key by authenticated account
  date: string;        // DATE, NOT NULL
  lessonNumber: number; // INTEGER, NOT NULL
  subject: string;     // VARCHAR, NOT NULL
  lessonTopic: string; // VARCHAR, NOT NULL
  teacherComment: string; // TEXT
  evaluation: string;  // TEXT, NOT NULL
  orderliness: "Tốt" | "Khá" | "Trung bình" | "Yếu"; // VARCHAR, NOT NULL
}

/**
 * 11. CLASS JOURNAL PRAISE RELATION TABLE (Weekly honors)
 */
export interface ClassJournalPraiseSchema {
  id: string;          // VARCHAR, PRIMARY KEY
  journalId: string;   // VARCHAR, FOREIGN KEY -> ClassJournalSchema.id
  studentId?: string;  // VARCHAR, FOREIGN KEY -> StudentSchema.id (NULLable)
  studentName: string; // VARCHAR, NOT NULL
  note: string;        // TEXT, NOT NULL
}

/**
 * 12. CLASS JOURNAL INFRACTIONS RELATION TABLE (Weekly reminders and notes)
 */
export interface ClassJournalInfractionSchema {
  id: string;          // VARCHAR, PRIMARY KEY
  journalId: string;   // VARCHAR, FOREIGN KEY -> ClassJournalSchema.id
  studentId?: string;  // VARCHAR, FOREIGN KEY -> StudentSchema.id (NULLable)
  studentName: string; // VARCHAR, NOT NULL
  note: string;        // TEXT, NOT NULL
}
