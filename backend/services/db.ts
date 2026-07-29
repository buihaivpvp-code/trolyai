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
  AssessmentValue,
  DocumentSchema
} from "../models/schema";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
const DOCUMENTS_FILE = path.join(DATA_DIR, "documents.json");

const OLD_STUDENTS_FILE = path.join(DATA_DIR, "students.json");
const OLD_JOURNALS_FILE = path.join(DATA_DIR, "journals.json");

function writeJsonAtomic(filePath: string, data: any) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function readJsonSafe<T>(filePath: string, defaultData: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      writeJsonAtomic(filePath, defaultData);
      return defaultData;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}, restoring defaults:`, err);
    writeJsonAtomic(filePath, defaultData);
    return defaultData;
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", "eduai_password_salt_2026").update(password).digest("hex");
}

function matchesOwner<T extends { ownerId?: string }>(item: T, ownerId?: string): boolean {
  return !ownerId || item.ownerId === ownerId;
}

function withOwnerId<T extends Record<string, any>>(item: T, ownerId?: string): T {
  return ownerId ? { ...item, ownerId } : { ...item };
}

async function tableExists(table: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(table).select("id").limit(1);
  return !error;
}

async function readTable<T>(table: string, fallback: T, shouldSeed = false): Promise<T> {
  if (!isSupabaseConfigured()) {
    return fallback;
  }
  try {
    if (!(await tableExists(table))) return fallback;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    return (Array.isArray(data) ? data : fallback) as T;
  } catch (err) {
    console.warn(`[Database] Falling back from Supabase table ${table}:`, err);
    return fallback;
  }
}

async function replaceTable(table: string, rows: any[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const exists = await tableExists(table);
  if (!exists) return;
  const { error: deleteError } = await supabase.from(table).delete().neq("id", "__never__");
  if (deleteError) throw deleteError;
  if (rows.length === 0) return;
  const { error: insertError } = await supabase.from(table).insert(rows as any);
  if (insertError) throw insertError;
}

const initialUsers: UserSchema[] = [
  {
    id: "usr-1",
    email: "giaovien@eduai.vn",
    passwordHash: hashPassword("password123"),
    name: "Cô Trịnh Thị Lan Anh",
    role: "teacher",
    classCode: "4A",
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

const seedStudents: any[] = [
  {
    id: "std-1",
    ownerId: "usr-1",
    name: "Nguyễn Hoàng Nam",
    gender: "Nam",
    dob: "2016-08-15",
    avatar: "",
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
    diary: [{ id: "dry-init-1", date: "2026-06-25", type: "vi_pham", content: "Nói chuyện riêng trong giờ học Toán, bị nhắc nhở", subject: "Toán" }]
  }
];

const seedJournals: any[] = [];

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
    baseTable.push({
      id: s.id,
      ownerId: s.ownerId || ownerId,
      name: s.name,
      gender: s.gender,
      dob: s.dob,
      avatar: s.avatar || "",
      phone: s.phone || "",
      fatherName: s.fatherName || "",
      fatherPhone: s.fatherPhone || "",
      motherName: s.motherName || "",
      motherPhone: s.motherPhone || "",
      schoolGrade: Number(s.schoolGrade) || 4,
      schoolClass: s.schoolClass || "4A"
    });

    Object.entries(s.circular27Grades || {}).forEach(([week, value]) => {
      gradesTable.push({ studentId: s.id, weekNumber: Number(week), gradeValue: Number(value) as AssessmentValue });
    });

    if (s.psychologicalProfile) psychologicalTable.push({ studentId: s.id, ...s.psychologicalProfile });
    if (s.semiBoardingProfile) semiBoardingTable.push({ studentId: s.id, ...s.semiBoardingProfile });
    if (s.talentProfile) talentTable.push({ studentId: s.id, ...s.talentProfile });
    if (s.attendance) attendanceTable.push({ studentId: s.id, ...s.attendance });
    if (s.behaviorCount) behaviorTable.push({ studentId: s.id, ...s.behaviorCount });

    if (Array.isArray(s.diary)) {
      s.diary.forEach((d: any) => {
        if (d?.id && !String(d.id).startsWith("jr-praise-") && !String(d.id).startsWith("jr-infraction-")) {
          diaryTable.push({ id: d.id, studentId: s.id, date: d.date, type: d.type, content: d.content, subject: d.subject });
        }
      });
    }

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

    (j.studentPraise || []).forEach((p: any) => {
      praisesTable.push({ id: p.id || `pr-${generateId()}`, journalId: j.id, studentId: p.studentId, studentName: p.studentName, note: p.note });
    });

    (j.studentInfractions || []).forEach((i: any) => {
      infractionsTable.push({ id: i.id || `inf-${generateId()}`, journalId: j.id, studentId: i.studentId, studentName: i.studentName, note: i.note });
    });
  });

  writeJsonAtomic(JOURNALS_BASE_FILE, baseTable);
  writeJsonAtomic(JOURNAL_PRAISES_FILE, praisesTable);
  writeJsonAtomic(JOURNAL_INFRACTIONS_FILE, infractionsTable);
}

let lastRefreshed = 0;
const CACHE_TTL = 15000; // 15 seconds

export async function refreshCacheFromSupabase(force = false) {
  if (!isSupabaseConfigured()) return;
  const now = Date.now();
  if (!force && now - lastRefreshed < CACHE_TTL) {
    return;
  }
  try {
    const [users, students, journals, documents] = await Promise.all([
      readTable<UserSchema[]>("users", []),
      readTable<StudentSchema[]>("students_base", []),
      readTable<ClassJournalSchema[]>("journals_base", []),
      readTable<DocumentSchema[]>("documents", [])
    ]);
    
    if (users.length > 0) {
      writeJsonAtomic(USERS_FILE, users);
    }
    if (students.length > 0) {
      saveStudentsRelational(students, undefined);
    }
    if (journals.length > 0) {
      saveJournalsRelational(journals, undefined);
    }
    if (documents.length > 0) {
      writeJsonAtomic(DOCUMENTS_FILE, documents);
    }
    lastRefreshed = now;
  } catch (e) {
    console.warn("[Database] Failed to refresh cache from Supabase:", e);
  }
}

export async function runMigrationsAndSeeding() {
  console.log("[Database] Checking schema migrations & seeding status...");

  if (!isSupabaseConfigured()) {
    if (!fs.existsSync(USERS_FILE)) writeJsonAtomic(USERS_FILE, initialUsers);
    if (!fs.existsSync(STUDENTS_BASE_FILE)) saveStudentsRelational(seedStudents);
    if (!fs.existsSync(JOURNALS_BASE_FILE)) saveJournalsRelational(seedJournals);
    if (!fs.existsSync(DOCUMENTS_FILE)) writeJsonAtomic(DOCUMENTS_FILE, []);
    return;
  }

  try {
    const users = await readTable<UserSchema[]>("users", []);
    if (users.length === 0) {
      await replaceTable("users", initialUsers);
    }

    const students = await readTable<StudentSchema[]>("students_base", []);
    if (students.length === 0) {
      saveStudentsRelational(seedStudents);
    }

    const journals = await readTable<ClassJournalSchema[]>("journals_base", []);
    if (journals.length === 0) {
      saveJournalsRelational(seedJournals);
    }

    const documents = await readTable<DocumentSchema[]>("documents", []);
    if (documents.length === 0) {
      await replaceTable("documents", []);
    }
    
    await refreshCacheFromSupabase(true);
  } catch (e) {
    console.warn("[Database] Supabase initialization failed, continuing with local fallback:", e);
  }
}

runMigrationsAndSeeding();

export const Database = {
  async refreshCacheFromSupabase(force = false) {
    await refreshCacheFromSupabase(force);
  },

  getUsers(): UserSchema[] {
    if (!isSupabaseConfigured()) return readJsonSafe<UserSchema[]>(USERS_FILE, initialUsers);
    // Synchronous compatibility fallback; routes call this synchronously.
    const raw = fs.existsSync(USERS_FILE) ? readJsonSafe<UserSchema[]>(USERS_FILE, initialUsers) : initialUsers;
    return raw;
  },

  async saveUsers(users: UserSchema[]) {
    writeJsonAtomic(USERS_FILE, users);
    if (isSupabaseConfigured()) {
      await replaceTable("users", users);
    }
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

    return bases.map((student) => {
      const sGradesObj: { [week: number]: number } = {};
      grades.filter((g) => g.studentId === student.id).forEach((g) => { sGradesObj[g.weekNumber] = g.gradeValue; });
      const psychObj = psychs.find((p) => p.studentId === student.id) || { sociability: 3, shyness: 2, hyperactive: 2, focus: 3 };
      const semiObj = semiBoardings.find((s) => s.studentId === student.id) || { allergies: "", diet: "", healthNotes: "" };
      const talObj = talents.find((t) => t.studentId === student.id) || { art: false, music: false, sports: false, stem: false, notes: "" };
      const attObj = attendances.find((a) => a.studentId === student.id) || { totalDays: 0, presentDays: 0, lateDays: 0, absentDays: 0 };
      const behObj = behaviors.find((b) => b.studentId === student.id) || { forgetHomework: 0, lateToSchool: 0, distraction: 0 };
      const diaryList = [
        ...diaries.filter((d) => d.studentId === student.id).map((d) => ({ id: d.id, date: d.date, type: d.type, content: d.content, subject: d.subject })),
        ...journalPraises.filter((p) => p.studentId === student.id).map((p) => ({ id: `jr-praise-${p.id}`, date: journalsBases.find((b) => b.id === p.journalId)?.date || "", type: "khen_thuong", content: p.note, subject: journalsBases.find((b) => b.id === p.journalId)?.subject || "" })),
        ...journalInfractions.filter((i) => i.studentId === student.id).map((i) => ({ id: `jr-infraction-${i.id}`, date: journalsBases.find((b) => b.id === i.journalId)?.date || "", type: "vi_pham", content: i.note, subject: journalsBases.find((b) => b.id === i.journalId)?.subject || "" }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        ...student,
        circular27Grades: sGradesObj,
        monthlyGradesList: monthlyGrades.filter((g) => g.studentId === student.id).map((g) => ({ subject: g.subject, monthlyGrades: g.monthlyGrades || {}, yearlySummary: g.yearlySummary || 0 })),
        psychologicalProfile: psychObj,
        semiBoardingProfile: semiObj,
        talentProfile: talObj,
        attendance: attObj,
        behaviorCount: behObj,
        diary: diaryList
      };
    });
  },

  async saveStudents(students: any[], ownerId?: string) {
    const scopedStudents = ownerId ? students.map((student) => withOwnerId(student, ownerId)) : students;
    const allStudents = this.getStudents();
    const preservedStudents = ownerId ? allStudents.filter((student) => student.ownerId !== ownerId) : [];
    const merged = [...preservedStudents, ...scopedStudents];
    saveStudentsRelational(merged, undefined);
    if (isSupabaseConfigured()) {
      await Promise.all([
        replaceTable("students_base", readJsonSafe<StudentSchema[]>(STUDENTS_BASE_FILE, [])),
        replaceTable("grades", readJsonSafe<Circular27GradeSchema[]>(GRADES_FILE, [])),
        replaceTable("psychological_profiles", readJsonSafe<PsychologicalProfileSchema[]>(PSYCHOLOGICAL_PROFILES_FILE, [])),
        replaceTable("semi_boarding_profiles", readJsonSafe<SemiBoardingProfileSchema[]>(SEMI_BOARDING_PROFILES_FILE, [])),
        replaceTable("talent_profiles", readJsonSafe<TalentProfileSchema[]>(TALENT_PROFILES_FILE, [])),
        replaceTable("attendances", readJsonSafe<AttendanceSchema[]>(ATTENDANCES_FILE, [])),
        replaceTable("behavior_counts", readJsonSafe<BehaviorCountSchema[]>(BEHAVIOR_COUNTS_FILE, [])),
        replaceTable("diaries", readJsonSafe<StudentDiarySchema[]>(DIARIES_FILE, [])),
        replaceTable("monthly_grades", readJsonSafe<any[]>(MONTHLY_GRADES_FILE, []))
      ]);
    }
  },

  getJournals(ownerId?: string): any[] {
    const allBases = readJsonSafe<ClassJournalSchema[]>(JOURNALS_BASE_FILE, []);
    const praises = readJsonSafe<ClassJournalPraiseSchema[]>(JOURNAL_PRAISES_FILE, []);
    const infractions = readJsonSafe<ClassJournalInfractionSchema[]>(JOURNAL_INFRACTIONS_FILE, []);
    const bases = allBases.filter((journal) => matchesOwner(journal, ownerId));

    return bases.map((journal) => ({
      ...journal,
      studentPraise: praises.filter((p) => p.journalId === journal.id).map((p) => ({ id: p.id, studentId: p.studentId, studentName: p.studentName, note: p.note })),
      studentInfractions: infractions.filter((i) => i.journalId === journal.id).map((i) => ({ id: i.id, studentId: i.studentId, studentName: i.studentName, note: i.note }))
    }));
  },

  async saveJournals(journals: any[], ownerId?: string) {
    const scopedJournals = ownerId ? journals.map((journal) => withOwnerId(journal, ownerId)) : journals;
    const allJournals = this.getJournals();
    const preservedJournals = ownerId ? allJournals.filter((journal) => journal.ownerId !== ownerId) : [];
    const merged = [...preservedJournals, ...scopedJournals];
    saveJournalsRelational(merged, undefined);
    if (isSupabaseConfigured()) {
      await Promise.all([
        replaceTable("journals_base", readJsonSafe<ClassJournalSchema[]>(JOURNALS_BASE_FILE, [])),
        replaceTable("journal_praises", readJsonSafe<ClassJournalPraiseSchema[]>(JOURNAL_PRAISES_FILE, [])),
        replaceTable("journal_infractions", readJsonSafe<ClassJournalInfractionSchema[]>(JOURNAL_INFRACTIONS_FILE, []))
      ]);
    }
  },

  getDocuments(ownerId?: string): DocumentSchema[] {
    const all = readJsonSafe<DocumentSchema[]>(DOCUMENTS_FILE, []);
    return all.filter((doc) => matchesOwner(doc, ownerId));
  },

  async saveDocuments(documents: DocumentSchema[], ownerId?: string) {
    const scoped = ownerId ? documents.map((doc) => withOwnerId(doc, ownerId)) : documents;
    const all = readJsonSafe<DocumentSchema[]>(DOCUMENTS_FILE, []);
    const preserved = ownerId ? all.filter((doc) => doc.ownerId !== ownerId) : [];
    const merged = [...preserved, ...scoped];
    writeJsonAtomic(DOCUMENTS_FILE, merged);
    if (isSupabaseConfigured()) {
      await replaceTable("documents", merged);
    }
  }
};