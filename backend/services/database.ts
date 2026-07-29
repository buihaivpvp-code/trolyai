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
} from "../models/schema.js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase.js";

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", "eduai_password_salt_2026").update(password).digest("hex");
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

let usersCache: UserSchema[] = [...initialUsers];
let studentsCache: any[] = [...seedStudents];
let journalsCache: any[] = [...seedJournals];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

async function hydrateFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  try {
    const [{ data: users }, { data: students }, { data: journals }] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("students_base").select("*"),
      supabase.from("journals_base").select("*")
    ]);

    if (Array.isArray(users) && users.length > 0) usersCache = users as UserSchema[];
    if (Array.isArray(students) && students.length > 0) studentsCache = students as any[];
    if (Array.isArray(journals) && journals.length > 0) journalsCache = journals as any[];

    hydrated = true;
  } catch (error) {
    console.warn("[Database] Supabase hydrate failed:", error);
  }
}

function ensureHydrated(): void {
  if (hydrated || hydratePromise) return;
  hydratePromise = hydrateFromSupabase().finally(() => {
    hydrated = true;
  });
}

ensureHydrated();

function persistTable(table: string, rows: any[]): void {
  if (!isSupabaseConfigured()) return;

  void (async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.from(table).delete().neq("id", "__never__");
      if (rows.length > 0) {
        await supabase.from(table).insert(rows as any);
      }
    } catch (error) {
      console.warn(`[Database] Failed to persist ${table}:`, error);
    }
  })();
}

function filterOwner<T extends { ownerId?: string }>(items: T[], ownerId?: string): T[] {
  return ownerId ? items.filter((item) => item.ownerId === ownerId) : items;
}

export const Database = {
  async refresh(): Promise<void> {
    hydrated = false;
    hydratePromise = null;
    await hydrateFromSupabase();
  },

  getUsers(): UserSchema[] {
    ensureHydrated();
    return [...usersCache];
  },

  saveUsers(users: UserSchema[]): void {
    usersCache = [...users];
    persistTable("users", usersCache);
  },

  getStudents(ownerId?: string): any[] {
    ensureHydrated();
    return filterOwner(studentsCache, ownerId).map((student) => ({ ...student }));
  },

  saveStudents(students: any[], ownerId?: string): void {
    const normalized = ownerId
      ? students.map((student) => ({ ...student, ownerId: student.ownerId || ownerId }))
      : students;
    if (ownerId) {
      studentsCache = [...studentsCache.filter((student) => student.ownerId !== ownerId), ...normalized];
    } else {
      studentsCache = [...normalized];
    }
    persistTable("students_base", studentsCache);
  },

  getJournals(ownerId?: string): any[] {
    ensureHydrated();
    return filterOwner(journalsCache, ownerId).map((journal) => ({ ...journal }));
  },

  saveJournals(journals: any[], ownerId?: string): void {
    const normalized = ownerId
      ? journals.map((journal) => ({ ...journal, ownerId: journal.ownerId || ownerId }))
      : journals;
    if (ownerId) {
      journalsCache = [...journalsCache.filter((journal) => journal.ownerId !== ownerId), ...normalized];
    } else {
      journalsCache = [...normalized];
    }
    persistTable("journals_base", journalsCache);
  }
};

export type {
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
};