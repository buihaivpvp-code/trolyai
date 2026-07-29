-- SQL script to initialize the database tables on Supabase

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  "classCode" VARCHAR(50) NOT NULL,
  avatar VARCHAR(255),
  phone VARCHAR(50),
  dob VARCHAR(50),
  workplace VARCHAR(255),
  experience VARCHAR(255),
  achievements TEXT,
  bio TEXT,
  "hasCompletedOnboarding" BOOLEAN DEFAULT FALSE,
  "teacherCode" VARCHAR(50)
);

-- 2. Students Base Table
CREATE TABLE IF NOT EXISTS students_base (
  id VARCHAR(255) PRIMARY KEY,
  "ownerId" VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  dob VARCHAR(50) NOT NULL,
  avatar TEXT,
  phone VARCHAR(50) NOT NULL,
  "fatherName" VARCHAR(255),
  "fatherPhone" VARCHAR(50),
  "motherName" VARCHAR(255),
  "motherPhone" VARCHAR(50),
  "schoolGrade" INTEGER NOT NULL,
  "schoolClass" VARCHAR(50) NOT NULL
);

-- 3. Circular 27 Grades Table
CREATE TABLE IF NOT EXISTS grades (
  "studentId" VARCHAR(255) NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "gradeValue" INTEGER NOT NULL,
  PRIMARY KEY ("studentId", "weekNumber")
);

-- 4. Psychological Profiles Table
CREATE TABLE IF NOT EXISTS psychological_profiles (
  "studentId" VARCHAR(255) PRIMARY KEY,
  sociability INTEGER NOT NULL,
  shyness INTEGER NOT NULL,
  hyperactive INTEGER NOT NULL,
  focus INTEGER NOT NULL
);

-- 5. Semi Boarding Profiles Table
CREATE TABLE IF NOT EXISTS semi_boarding_profiles (
  "studentId" VARCHAR(255) PRIMARY KEY,
  allergies TEXT NOT NULL,
  diet TEXT NOT NULL,
  "healthNotes" TEXT NOT NULL
);

-- 6. Talent Profiles Table
CREATE TABLE IF NOT EXISTS talent_profiles (
  "studentId" VARCHAR(255) PRIMARY KEY,
  art BOOLEAN NOT NULL,
  music BOOLEAN NOT NULL,
  sports BOOLEAN NOT NULL,
  stem BOOLEAN NOT NULL,
  notes TEXT NOT NULL
);

-- 7. Attendances Table
CREATE TABLE IF NOT EXISTS attendances (
  "studentId" VARCHAR(255) PRIMARY KEY,
  "totalDays" INTEGER NOT NULL,
  "presentDays" INTEGER NOT NULL,
  "lateDays" INTEGER NOT NULL,
  "absentDays" INTEGER NOT NULL
);

-- 8. Behavior Counts Table
CREATE TABLE IF NOT EXISTS behavior_counts (
  "studentId" VARCHAR(255) PRIMARY KEY,
  "forgetHomework" INTEGER NOT NULL,
  "lateToSchool" INTEGER NOT NULL,
  "distraction" INTEGER NOT NULL
);

-- 9. Diaries Table
CREATE TABLE IF NOT EXISTS diaries (
  id VARCHAR(255) PRIMARY KEY,
  "studentId" VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  subject VARCHAR(255)
);

-- 10. Class Journals Base Table
CREATE TABLE IF NOT EXISTS journals_base (
  id VARCHAR(255) PRIMARY KEY,
  "ownerId" VARCHAR(255),
  date VARCHAR(50) NOT NULL,
  "lessonNumber" INTEGER NOT NULL,
  subject VARCHAR(255) NOT NULL,
  "lessonTopic" VARCHAR(255) NOT NULL,
  "teacherComment" TEXT,
  evaluation TEXT NOT NULL,
  orderliness VARCHAR(50) NOT NULL
);

-- 11. Class Journal Praises Table
CREATE TABLE IF NOT EXISTS journal_praises (
  id VARCHAR(255) PRIMARY KEY,
  "journalId" VARCHAR(255) NOT NULL,
  "studentId" VARCHAR(255),
  "studentName" VARCHAR(255) NOT NULL,
  note TEXT NOT NULL
);

-- 12. Class Journal Infractions Table
CREATE TABLE IF NOT EXISTS journal_infractions (
  id VARCHAR(255) PRIMARY KEY,
  "journalId" VARCHAR(255) NOT NULL,
  "studentId" VARCHAR(255),
  "studentName" VARCHAR(255) NOT NULL,
  note TEXT NOT NULL
);

-- 13. Documents Table (Metadata)
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(255) PRIMARY KEY,
  "ownerId" VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  "bookSeries" VARCHAR(255),
  "refGroup" VARCHAR(255),
  "fileName" VARCHAR(255) NOT NULL,
  "fileSize" VARCHAR(255) NOT NULL,
  "fileExtension" VARCHAR(50) NOT NULL,
  "uploadDate" VARCHAR(100) NOT NULL,
  notes TEXT,
  "lessonTopic" VARCHAR(255),
  "aiSummary" TEXT,
  "aiKeyActivities" TEXT[],
  "aiObjectives" TEXT[],
  "extractedText" TEXT,
  "isUploaded" BOOLEAN DEFAULT TRUE
);
