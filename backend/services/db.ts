import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  UserSchema,
  StudentSchema,
  Circular27GradeSchema,
  PsychologicalProfileSchema,
  SemiBoardingProfileSchema,
  TalentProfileSchema,
  AttendanceSchema,
  BehaviorCountSchema,
  StudentDiarySchema,
  ClassJournalSchema,
  ClassJournalPraiseSchema,
  ClassJournalInfractionSchema,
  AssessmentValue
} from "../models/schema";

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");

// Initialize directories if they do not exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// -------------------------------------------------------------
// NORMALIZED FILE PATHS (Relational DB Tables mapped to JSON storage)
// -------------------------------------------------------------
const USERS_FILE = path.join(DATA_DIR, "users.json");
const STUDENTS_BASE_FILE = path.join(DATA_DIR, "students_base.json");
const GRADES_FILE = path.join(DATA_DIR, "grades.json");
const PSYCHOLOGICAL_PROFILES_FILE = path.join(DATA_DIR, "psychological_profiles.json");
const SEMI_BOARDING_PROFILES_FILE = path.join(DATA_DIR, "semi_boarding_profiles.json");
const TALENT_PROFILES_FILE = path.join(DATA_DIR, "talent_profiles.json");
const ATTENDANCES_FILE = path.join(DATA_DIR, "attendances.json");
const BEHAVIOR_COUNTS_FILE = path.join(DATA_DIR, "behavior_counts.json");
const DIARIES_FILE = path.join(DATA_DIR, "diaries.json");
const JOURNALS_BASE_FILE = path.join(DATA_DIR, "journals_base.json");
const JOURNAL_PRAISES_FILE = path.join(DATA_DIR, "journal_praises.json");
const JOURNAL_INFRACTIONS_FILE = path.join(DATA_DIR, "journal_infractions.json");
const MONTHLY_GRADES_FILE = path.join(DATA_DIR, "monthly_grades.json");

// Old files used for backward compatibility migrations
const OLD_STUDENTS_FILE = path.join(DATA_DIR, "students.json");
const OLD_JOURNALS_FILE = path.join(DATA_DIR, "journals.json");

// Helper for atomic file writing
function writeJsonAtomic(filePath: string, data: any) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

// Helper to safely read files
function readJsonSafe<T>(filePath: string, defaultData: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      writeJsonAtomic(filePath, defaultData);
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}, restoring defaults:`, err);
    writeJsonAtomic(filePath, defaultData);
    return defaultData;
  }
}

// Helper to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function matchesOwner<T extends { ownerId?: string }>(item: T, ownerId?: string): boolean {
  if (!ownerId) {
    return true;
  }
  return item.ownerId === ownerId;
}

function withOwnerId<T extends Record<string, any>>(item: T, ownerId?: string): T {
  if (!ownerId) {
    return { ...item };
  }
  return {
    ...item,
    ownerId
  };
}

// Helper to hash passwords securely
function hashPassword(password: string): string {
  return crypto.createHmac("sha256", "eduai_password_salt_2026").update(password).digest("hex");
}

// -------------------------------------------------------------
// SEED INITIAL USERS
// -------------------------------------------------------------
const initialUsers: UserSchema[] = [
  {
    id: "usr-1",
    email: "giaovien@eduai.vn",
    passwordHash: hashPassword("password123"),
    name: "Cô Trịnh Thị Lan Anh",
    role: "teacher",
    classCode: "4A",
    avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=400&h=400&fit=crop&q=80",
    phone: "0987654321",
    experience: "5 năm kinh nghiệm dạy học tiểu học, Chuyên môn Giỏi cấp Quận",
    achievements: "Giáo viên dạy giỏi cấp Quận, Chiến sĩ thi đua cơ sở",
    bio: "Chủ nhiệm lớp 4A. Nhiệt huyết, tận tâm và luôn hướng tới sự phát triển toàn diện, khơi dậy tiềm năng của từng học sinh.",
    hasCompletedOnboarding: true
  },
  {
    id: "usr-2",
    email: "admin@eduai.vn",
    passwordHash: hashPassword("adminpassword"),
    name: "Quản Trị Viên EduAI",
    role: "admin",
    classCode: "all",
    hasCompletedOnboarding: true
  }
];

// -------------------------------------------------------------
// INITIAL DENORMALIZED SEED DATA (Used for fresh setups and migration)
// -------------------------------------------------------------
const seedStudents = [
  {
    id: "std-1",
    name: "Nguyễn Hoàng Nam",
    gender: "Nam" as const,
    dob: "2016-08-15",
    avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80",
    phone: "0912345678",
    fatherName: "Nguyễn Hoàng Đức",
    fatherPhone: "0912345678",
    motherName: "Trần Thị Mai",
    motherPhone: "0911223344",
    schoolGrade: 4,
    schoolClass: "4A",
    circular27Grades: { 1: 2, 2: 2, 3: 3, 4: 3 },
    psychologicalProfile: { sociability: 4, shyness: 2, hyperactive: 5, focus: 2 },
    semiBoardingProfile: { allergies: "Hải sản vỏ cứng", diet: "Không có", healthNotes: "Nhạy cảm thời tiết giao mùa" },
    talentProfile: { art: true, music: false, sports: true, stem: false, notes: "Vẽ chân dung cực đẹp, chạy nhanh nhất khối 4." },
    attendance: { totalDays: 20, presentDays: 19, lateDays: 1, absentDays: 0 },
    behaviorCount: { forgetHomework: 3, lateToSchool: 1, distraction: 5 },
    diary: [
      {
        id: "dry-init-1",
        date: "2026-06-25",
        type: "vi_pham" as const,
        content: "Nói chuyện riêng trong giờ học Toán, bị nhắc nhở",
        subject: "Toán"
      }
    ]
  },
  {
    id: "std-2",
    name: "Lê Mỹ Anh",
    gender: "Nữ" as const,
    dob: "2016-11-20",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    phone: "0345678912",
    fatherName: "Lê Tuấn Anh",
    fatherPhone: "0345678912",
    motherName: "Nguyễn Thị Lan",
    motherPhone: "0344556677",
    schoolGrade: 4,
    schoolClass: "4A",
    circular27Grades: { 1: 1, 2: 2, 3: 2, 4: 3 },
    psychologicalProfile: { sociability: 2, shyness: 5, hyperactive: 1, focus: 4 },
    semiBoardingProfile: { allergies: "Nhộng tằm", diet: "Ăn ít mỡ", healthNotes: "Thỉnh thoảng choáng nhẹ khi hoạt động thể dục nắng gắt" },
    talentProfile: { art: false, music: true, sports: false, stem: false, notes: "Đánh đàn dạo nhạc hay, hát đơn ca giọng oanh vàng." },
    attendance: { totalDays: 20, presentDays: 17, lateDays: 3, absentDays: 0 },
    behaviorCount: { forgetHomework: 1, lateToSchool: 4, distraction: 2 },
    diary: [
      {
        id: "dry-init-2",
        date: "2026-06-25",
        type: "khen_thuong" as const,
        content: "Đọc bài thơ diễn cảm, truyền cảm xúc cho cả lớp",
        subject: "Tiếng Việt"
      }
    ]
  },
  {
    id: "std-3",
    name: "Phạm Đức Minh",
    gender: "Nam" as const,
    dob: "2016-04-05",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    phone: "0987654321",
    fatherName: "Phạm Minh Đức",
    fatherPhone: "0987654321",
    motherName: "Phạm Thị Hồng",
    motherPhone: "0988776655",
    schoolGrade: 4,
    schoolClass: "4A",
    circular27Grades: { 1: 3, 2: 3, 3: 2, 4: 2 },
    psychologicalProfile: { sociability: 3, shyness: 1, hyperactive: 3, focus: 1 },
    semiBoardingProfile: { allergies: "Tôm bóc vỏ", diet: "Tránh nêm phụ gia bột ngọt", healthNotes: "Săn chắc thể hình" },
    talentProfile: { art: false, music: false, sports: false, stem: true, notes: "Lắp ráp robot nhanh, tư duy giải ô chữ toán xuất thần." },
    attendance: { totalDays: 20, presentDays: 20, lateDays: 0, absentDays: 0 },
    behaviorCount: { forgetHomework: 5, lateToSchool: 0, distraction: 7 },
    diary: [
      {
        id: "dry-init-3",
        date: "2026-06-25",
        type: "khen_thuong" as const,
        content: "Phát biểu xuất sắc và giải chính xác bài toán nâng cao",
        subject: "Toán"
      }
    ]
  },
  {
    id: "std-4",
    name: "Hoàng Khánh Vy",
    gender: "Nữ" as const,
    dob: "2016-02-14",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80",
    phone: "0905558888",
    fatherName: "Hoàng Minh Vy",
    fatherPhone: "0905558888",
    motherName: "Nguyễn Khánh Ly",
    motherPhone: "0906667777",
    schoolGrade: 4,
    schoolClass: "4A",
    circular27Grades: { 1: 3, 2: 3, 3: 3, 4: 3 },
    psychologicalProfile: { sociability: 5, shyness: 1, hyperactive: 2, focus: 5 },
    semiBoardingProfile: { allergies: "Đậu phộng", diet: "Ăn đa dạng rau xanh", healthNotes: "Sức khỏe dẻo dai" },
    talentProfile: { art: true, music: true, sports: false, stem: true, notes: "Toàn diện MC trường lớp, tích cực điều phối văn nghệ thiếu nhi." },
    attendance: { totalDays: 20, presentDays: 20, lateDays: 0, absentDays: 0 },
    behaviorCount: { forgetHomework: 0, lateToSchool: 0, distraction: 0 },
    diary: []
  },
  {
    id: "std-5",
    name: "Đỗ Gia Bảo",
    gender: "Nam" as const,
    dob: "2016-01-29",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    phone: "0966778899",
    fatherName: "Đỗ Gia Hùng",
    fatherPhone: "0966778899",
    motherName: "Lê Thị Thảo",
    motherPhone: "0967788990",
    schoolGrade: 4,
    schoolClass: "4A",
    circular27Grades: { 1: 1, 2: 1, 3: 2, 4: 2 },
    psychologicalProfile: { sociability: 2, shyness: 4, hyperactive: 2, focus: 3 },
    semiBoardingProfile: { allergies: "Không có", diet: "Không có", healthNotes: "Hơi gầy, mắt cận thị nhẹ" },
    talentProfile: { art: false, music: false, sports: true, stem: false, notes: "Cờ vua lớp xuất sắc, hay vẽ phác họa ngộ nghĩnh." },
    attendance: { totalDays: 20, presentDays: 16, lateDays: 0, absentDays: 4 },
    behaviorCount: { forgetHomework: 2, lateToSchool: 0, distraction: 3 },
    diary: []
  }
];

const seedJournals: any[] = [];

// -------------------------------------------------------------
// NORMALIZATION WRITING HELPERS (Deconstruct rich objects into separate tables)
// -------------------------------------------------------------
function saveStudentsRelational(richStudents: any[], ownerId?: string) {
  const baseTable: StudentSchema[] = [];
  const gradesTable: Circular27GradeSchema[] = [];
  const psychologicalTable: PsychologicalProfileSchema[] = [];
  const semiBoardingTable: SemiBoardingProfileSchema[] = [];
  const talentTable: TalentProfileSchema[] = [];
  const attendanceTable: AttendanceSchema[] = [];
  const behaviorTable: BehaviorCountSchema[] = [];
  const diaryTable: StudentDiarySchema[] = [];
  const monthlyGradesTable: any[] = [];

  richStudents.forEach((s) => {
    // 1. Demographics & base details
    baseTable.push({
      id: s.id,
      ownerId: s.ownerId || ownerId,
      name: s.name,
      gender: s.gender,
      dob: s.dob,
      avatar: s.avatar,
      phone: s.phone,
      fatherName: s.fatherName || "",
      fatherPhone: s.fatherPhone || "",
      motherName: s.motherName || "",
      motherPhone: s.motherPhone || "",
      schoolGrade: Number(s.schoolGrade) || 4,
      schoolClass: s.schoolClass || "4A"
    });

    // 2. Grades
    if (s.circular27Grades) {
      Object.entries(s.circular27Grades).forEach(([week, value]) => {
        gradesTable.push({
          studentId: s.id,
          weekNumber: Number(week),
          gradeValue: Number(value) as AssessmentValue
        });
      });
    }

    // 3. Psychological profile
    if (s.psychologicalProfile) {
      psychologicalTable.push({
        studentId: s.id,
        sociability: Number(s.psychologicalProfile.sociability) || 3,
        shyness: Number(s.psychologicalProfile.shyness) || 2,
        hyperactive: Number(s.psychologicalProfile.hyperactive) || 2,
        focus: Number(s.psychologicalProfile.focus) || 3
      });
    }

    // 4. Semi-boarding profile
    if (s.semiBoardingProfile) {
      semiBoardingTable.push({
        studentId: s.id,
        allergies: s.semiBoardingProfile.allergies || "Không có",
        diet: s.semiBoardingProfile.diet || "Không có",
        healthNotes: s.semiBoardingProfile.healthNotes || "Bình thường"
      });
    }

    // 5. Talent profile
    if (s.talentProfile) {
      talentTable.push({
        studentId: s.id,
        art: !!s.talentProfile.art,
        music: !!s.talentProfile.music,
        sports: !!s.talentProfile.sports,
        stem: !!s.talentProfile.stem,
        notes: s.talentProfile.notes || ""
      });
    }

    // 6. Attendance record
    if (s.attendance) {
      attendanceTable.push({
        studentId: s.id,
        totalDays: Number(s.attendance.totalDays) || 20,
        presentDays: Number(s.attendance.presentDays) || 20,
        lateDays: Number(s.attendance.lateDays) || 0,
        absentDays: Number(s.attendance.absentDays) || 0
      });
    }

    // 7. Behavior counts
    if (s.behaviorCount) {
      behaviorTable.push({
        studentId: s.id,
        forgetHomework: Number(s.behaviorCount.forgetHomework) || 0,
        lateToSchool: Number(s.behaviorCount.lateToSchool) || 0,
        distraction: Number(s.behaviorCount.distraction) || 0
      });
    }

    // 8. Static diaries (excluding transient class journal entries)
    if (Array.isArray(s.diary)) {
      s.diary.forEach((d: any) => {
        if (d && d.id && !d.id.startsWith("jr-praise-") && !d.id.startsWith("jr-infraction-")) {
          diaryTable.push({
            id: d.id,
            studentId: s.id,
            date: d.date,
            type: d.type,
            content: d.content,
            subject: d.subject
          });
        }
      });
    }

    // 9. Monthly grades list
    if (Array.isArray(s.monthlyGradesList)) {
      s.monthlyGradesList.forEach((item: any) => {
        monthlyGradesTable.push({
          studentId: s.id,
          subject: item.subject,
          monthlyGrades: item.monthlyGrades || {},
          yearlySummary: Number(item.yearlySummary) || 0
        });
      });
    }
  });

  writeJsonAtomic(STUDENTS_BASE_FILE, baseTable);
  writeJsonAtomic(GRADES_FILE, gradesTable);
  writeJsonAtomic(PSYCHOLOGICAL_PROFILES_FILE, psychologicalTable);
  writeJsonAtomic(SEMI_BOARDING_PROFILES_FILE, semiBoardingTable);
  writeJsonAtomic(TALENT_PROFILES_FILE, talentTable);
  writeJsonAtomic(ATTENDANCES_FILE, attendanceTable);
  writeJsonAtomic(BEHAVIOR_COUNTS_FILE, behaviorTable);
  writeJsonAtomic(DIARIES_FILE, diaryTable);
  writeJsonAtomic(MONTHLY_GRADES_FILE, monthlyGradesTable);
}

function saveJournalsRelational(richJournals: any[], ownerId?: string) {
  const baseTable: ClassJournalSchema[] = [];
  const praisesTable: ClassJournalPraiseSchema[] = [];
  const infractionsTable: ClassJournalInfractionSchema[] = [];

  richJournals.forEach((j) => {
    // 1. Base log details
      baseTable.push({
        id: j.id,
        ownerId: j.ownerId || ownerId,
        date: j.date,
        lessonNumber: Number(j.lessonNumber) || 1,
        subject: j.subject,
        lessonTopic: j.lessonTopic,
        teacherComment: j.teacherComment || "",
        evaluation: j.evaluation,
        orderliness: j.orderliness || "Tốt"
      });

    // 2. Praises
    if (Array.isArray(j.studentPraise)) {
      j.studentPraise.forEach((p: any) => {
        praisesTable.push({
          id: p.id || `pr-${generateId()}`,
          journalId: j.id,
          studentId: p.studentId || undefined,
          studentName: p.studentName,
          note: p.note
        });
      });
    }

    // 3. Infractions
    if (Array.isArray(j.studentInfractions)) {
      j.studentInfractions.forEach((i: any) => {
        infractionsTable.push({
          id: i.id || `inf-${generateId()}`,
          journalId: j.id,
          studentId: i.studentId || undefined,
          studentName: i.studentName,
          note: i.note
        });
      });
    }
  });

  writeJsonAtomic(JOURNALS_BASE_FILE, baseTable);
  writeJsonAtomic(JOURNAL_PRAISES_FILE, praisesTable);
  writeJsonAtomic(JOURNAL_INFRACTIONS_FILE, infractionsTable);
}

// -------------------------------------------------------------
// DATABASE INITIALIZATION / RELATIONAL AUTO-MIGRATION LAYER
// -------------------------------------------------------------
export function runMigrationsAndSeeding() {
  console.log("[Database] Checking schema migrations & seeding status...");

  // Seed Users if not present
  if (!fs.existsSync(USERS_FILE)) {
    console.log("[Database] Seeding users table...");
    writeJsonAtomic(USERS_FILE, initialUsers);
  }

  const hasNewBaseStudents = fs.existsSync(STUDENTS_BASE_FILE);
  const hasNewBaseJournals = fs.existsSync(JOURNALS_BASE_FILE);

  // Perform student relational migration or seed if not exists
  if (!hasNewBaseStudents) {
    let studentsDataToSeed = seedStudents;
    if (fs.existsSync(OLD_STUDENTS_FILE)) {
      try {
        console.log("[Database] Found legacy students file. Attempting normalization migration...");
        const oldRaw = fs.readFileSync(OLD_STUDENTS_FILE, "utf8");
        const parsed = JSON.parse(oldRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          studentsDataToSeed = parsed;
          console.log(`[Database] Migrating ${parsed.length} legacy student profiles...`);
        }
      } catch (e) {
        console.error("[Database] Failed to read legacy student file for migration:", e);
      }
    }
    saveStudentsRelational(studentsDataToSeed);
    console.log("[Database] Student relational tables seeded successfully.");
  } else {
    console.log("[Database] Student relational tables already exist.");
  }

  // Perform journal relational migration or seed if not exists
  if (!hasNewBaseJournals) {
    let journalsDataToSeed = seedJournals;
    if (fs.existsSync(OLD_JOURNALS_FILE)) {
      try {
        console.log("[Database] Found legacy journals file. Attempting normalization migration...");
        const oldRaw = fs.readFileSync(OLD_JOURNALS_FILE, "utf8");
        const parsed = JSON.parse(oldRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          journalsDataToSeed = parsed;
          console.log(`[Database] Migrating ${parsed.length} legacy class journal logs...`);
        }
      } catch (e) {
        console.error("[Database] Failed to read legacy journal file for migration:", e);
      }
    }
    saveJournalsRelational(journalsDataToSeed);
    console.log("[Database] Journal relational tables seeded successfully.");
  } else {
    console.log("[Database] Journal relational tables already exist.");
  }

  // Safely clean up old files if they exist to prevent confusion
  try {
    if (fs.existsSync(OLD_STUDENTS_FILE)) {
      fs.renameSync(OLD_STUDENTS_FILE, `${OLD_STUDENTS_FILE}.backup`);
      console.log("[Database] Archived legacy students.json to backup.");
    }
    if (fs.existsSync(OLD_JOURNALS_FILE)) {
      fs.renameSync(OLD_JOURNALS_FILE, `${OLD_JOURNALS_FILE}.backup`);
      console.log("[Database] Archived legacy journals.json to backup.");
    }
  } catch (e) {
    console.warn("[Database] Could not backup old file structures:", e);
  }

  console.log("[Database] Relational Normalization Migration Completed Successfully.");
}

// Automatically trigger migration when database file is loaded
runMigrationsAndSeeding();

// -------------------------------------------------------------
// PUBLIC DATABASE ACCESS METHODS (Maintains 100% boundary compatibility)
// -------------------------------------------------------------
export const Database = {
  getUsers(): UserSchema[] {
    return readJsonSafe<UserSchema[]>(USERS_FILE, initialUsers);
  },

  saveUsers(users: UserSchema[]) {
    writeJsonAtomic(USERS_FILE, users);
  },

  getStudents(ownerId?: string): any[] {
    const allBases = readJsonSafe<StudentSchema[]>(STUDENTS_BASE_FILE, []);
    const grades = readJsonSafe<Circular27GradeSchema[]>(GRADES_FILE, []);
    const psychs = readJsonSafe<PsychologicalProfileSchema[]>(PSYCHOLOGICAL_PROFILES_FILE, []);
    const semiBoardings = readJsonSafe<SemiBoardingProfileSchema[]>(SEMI_BOARDING_PROFILES_FILE, []);
    const talents = readJsonSafe<TalentProfileSchema[]>(TALENT_PROFILES_FILE, []);
    const attendances = readJsonSafe<AttendanceSchema[]>(ATTENDANCES_FILE, []);
    const behaviors = readJsonSafe<BehaviorCountSchema[]>(BEHAVIOR_COUNTS_FILE, []);
    const diaries = readJsonSafe<StudentDiarySchema[]>(DIARIES_FILE, []);
    const monthlyGrades = readJsonSafe<any[]>(MONTHLY_GRADES_FILE, []);
    const allJournalsBases = readJsonSafe<ClassJournalSchema[]>(JOURNALS_BASE_FILE, []);
    const journalPraises = readJsonSafe<ClassJournalPraiseSchema[]>(JOURNAL_PRAISES_FILE, []);
    const journalInfractions = readJsonSafe<ClassJournalInfractionSchema[]>(JOURNAL_INFRACTIONS_FILE, []);
    const bases = allBases.filter((student) => matchesOwner(student, ownerId));
    const journalsBases = allJournalsBases.filter((journal) => matchesOwner(journal, ownerId));

    // Perform highly efficient relational joins in memory to construct backwards-compatible structures
    return bases.map((student) => {
      // 1. Get weekly grades
      const sGradesObj: { [week: number]: number } = {};
      grades
        .filter((g) => g.studentId === student.id)
        .forEach((g) => {
          sGradesObj[g.weekNumber] = g.gradeValue;
        });

      const isOriginal = ["std-1", "std-2", "std-3", "std-4", "std-5"].includes(student.id);

      // 2. Get psychological analytics
      const psychObj = psychs.find((p) => p.studentId === student.id) || {
        studentId: student.id,
        sociability: isOriginal ? 3 : 0,
        shyness: isOriginal ? 2 : 0,
        hyperactive: isOriginal ? 2 : 0,
        focus: isOriginal ? 3 : 0
      };

      // 3. Get semi-boarding healthcare profile
      const semiObj = semiBoardings.find((s) => s.studentId === student.id) || {
        studentId: student.id,
        allergies: isOriginal ? "Không có" : "",
        diet: isOriginal ? "Không có" : "",
        healthNotes: isOriginal ? "Bình thường" : ""
      };

      // 4. Get talent profile
      const talObj = talents.find((t) => t.studentId === student.id) || {
        studentId: student.id,
        art: false,
        music: false,
        sports: false,
        stem: false,
        notes: isOriginal ? "Chưa cập nhật" : ""
      };

      // 5. Get attendance statistics
      const attObj = attendances.find((a) => a.studentId === student.id) || {
        studentId: student.id,
        totalDays: isOriginal ? 20 : 0,
        presentDays: isOriginal ? 20 : 0,
        lateDays: 0,
        absentDays: 0
      };

      // 6. Get behavior incident counts
      const behObj = behaviors.find((b) => b.studentId === student.id) || {
        studentId: student.id,
        forgetHomework: 0,
        lateToSchool: 0,
        distraction: 0
      };

      // 7. Get student diary log entries (statically loaded + dynamically joined from class journals)
      const journalPraisesAsDiary = journalPraises
        .filter((p) => p.studentId === student.id)
        .map((p) => {
          const j = journalsBases.find((b) => b.id === p.journalId);
          return {
            id: `jr-praise-${p.id}`,
            date: j ? j.date : "",
            type: "khen_thuong",
            content: p.note,
            subject: j ? j.subject : ""
          };
        });

      const journalInfractionsAsDiary = journalInfractions
        .filter((i) => i.studentId === student.id)
        .map((i) => {
          const j = journalsBases.find((b) => b.id === i.journalId);
          return {
            id: `jr-infraction-${i.id}`,
            date: j ? j.date : "",
            type: "vi_pham",
            content: i.note,
            subject: j ? j.subject : ""
          };
        });

      const diaryList = [
        ...diaries
          .filter((d) => d.studentId === student.id)
          .map((d) => ({
            id: d.id,
            date: d.date,
            type: d.type,
            content: d.content,
            subject: d.subject
          })),
        ...journalPraisesAsDiary,
        ...journalInfractionsAsDiary
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 8. Get monthly grades list
      const sMonthlyGrades = monthlyGrades
        .filter((g) => g.studentId === student.id)
        .map((g) => ({
          subject: g.subject,
          monthlyGrades: g.monthlyGrades || {},
          yearlySummary: g.yearlySummary || 0
        }));

      return {
        id: student.id,
        ownerId: student.ownerId,
        name: student.name,
        gender: student.gender,
        dob: student.dob,
        avatar: student.avatar,
        phone: student.phone,
        fatherName: student.fatherName,
        fatherPhone: student.fatherPhone,
        motherName: student.motherName,
        motherPhone: student.motherPhone,
        schoolGrade: student.schoolGrade,
        schoolClass: student.schoolClass,
        circular27Grades: sGradesObj,
        monthlyGradesList: sMonthlyGrades,
        psychologicalProfile: {
          sociability: psychObj.sociability,
          shyness: psychObj.shyness,
          hyperactive: psychObj.hyperactive,
          focus: psychObj.focus
        },
        semiBoardingProfile: {
          allergies: semiObj.allergies,
          diet: semiObj.diet,
          healthNotes: semiObj.healthNotes
        },
        talentProfile: {
          art: talObj.art,
          music: talObj.music,
          sports: talObj.sports,
          stem: talObj.stem,
          notes: talObj.notes
        },
        attendance: {
          totalDays: attObj.totalDays,
          presentDays: attObj.presentDays,
          lateDays: attObj.lateDays,
          absentDays: attObj.absentDays
        },
        behaviorCount: {
          forgetHomework: behObj.forgetHomework,
          lateToSchool: behObj.lateToSchool,
          distraction: behObj.distraction
        },
        diary: diaryList
      };
    });
  },

  saveStudents(students: any[], ownerId?: string) {
    const scopedStudents = ownerId
      ? students.map((student) => withOwnerId(student, ownerId))
      : students;
    const allStudents = this.getStudents();
    const preservedStudents = ownerId
      ? allStudents.filter((student) => student.ownerId !== ownerId)
      : [];
    saveStudentsRelational([...preservedStudents, ...scopedStudents], undefined);
  },

  getJournals(ownerId?: string): any[] {
    const allBases = readJsonSafe<ClassJournalSchema[]>(JOURNALS_BASE_FILE, []);
    const praises = readJsonSafe<ClassJournalPraiseSchema[]>(JOURNAL_PRAISES_FILE, []);
    const infractions = readJsonSafe<ClassJournalInfractionSchema[]>(JOURNAL_INFRACTIONS_FILE, []);
    const bases = allBases.filter((journal) => matchesOwner(journal, ownerId));

    // Assemble rich class journal entries relationally
    return bases.map((journal) => {
      const journalPraises = praises
        .filter((p) => p.journalId === journal.id)
        .map((p) => ({
          id: p.id,
          studentId: p.studentId,
          studentName: p.studentName,
          note: p.note
        }));

      const journalInfractions = infractions
        .filter((i) => i.journalId === journal.id)
        .map((i) => ({
          id: i.id,
          studentId: i.studentId,
          studentName: i.studentName,
          note: i.note
        }));

      return {
        id: journal.id,
        ownerId: journal.ownerId,
        date: journal.date,
        lessonNumber: journal.lessonNumber,
        subject: journal.subject,
        lessonTopic: journal.lessonTopic,
        teacherComment: journal.teacherComment,
        evaluation: journal.evaluation,
        orderliness: journal.orderliness,
        studentPraise: journalPraises,
        studentInfractions: journalInfractions
      };
    });
  },

  saveJournals(journals: any[], ownerId?: string) {
    const scopedJournals = ownerId
      ? journals.map((journal) => withOwnerId(journal, ownerId))
      : journals;
    const allJournals = this.getJournals();
    const preservedJournals = ownerId
      ? allJournals.filter((journal) => journal.ownerId !== ownerId)
      : [];
    saveJournalsRelational([...preservedJournals, ...scopedJournals], undefined);
  }
};
