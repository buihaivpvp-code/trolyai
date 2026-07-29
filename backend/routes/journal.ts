import { Router, Response } from "express";
import { Database } from "../services/db.ts";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.ts";
import { validateJournal } from "../middleware/validator.ts";
import { Logger } from "../middleware/logger.ts";

const router = Router();

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * @route GET /api/journal
 * @desc Get all class journals
 * @access Private
 */
router.get("/", authenticateToken as any, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const journals = Database.getJournals(ownerId);
    res.json(journals);
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/journal
 * @desc Save a new class journal log and sync student infractions
 * @access Private
 */
router.post("/", authenticateToken as any, validateJournal, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { date, lessonNumber, subject, lessonTopic, teacherComment, evaluation, orderliness, studentPraise, studentInfractions } = req.body;

    const newJournalEntry = {
      id: "jr-" + generateId(),
      date,
      lessonNumber: Number(lessonNumber) || 1,
      subject,
      lessonTopic,
      teacherComment: teacherComment || "",
      evaluation,
      orderliness: orderliness || "Tốt",
      studentPraise: studentPraise || [],
      studentInfractions: studentInfractions || []
    };

    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const journals = Database.getJournals(ownerId);
    journals.push({
      ...newJournalEntry,
      ownerId
    });
    await Database.saveJournals(journals, ownerId);

    // Sync infractions to student behavior metrics
    if (Array.isArray(studentInfractions) && studentInfractions.length > 0) {
      const students = Database.getStudents(ownerId);
      
      studentInfractions.forEach((item: any) => {
        let student = null;
        if (item.studentId) {
          student = students.find(s => s.id === item.studentId);
        }
        if (!student && item.studentName) {
          const cleanName = item.studentName.toLowerCase().trim();
          student = students.find(s => s.name.toLowerCase() === cleanName);
          if (!student) {
            student = students.find(s => s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase()));
          }
        }

        if (student) {
          if (!student.behaviorCount) {
            student.behaviorCount = { forgetHomework: 0, lateToSchool: 0, distraction: 0 };
          }
          const noteLower = (item.note || "").toLowerCase();
          if (noteLower.includes("quên") || noteLower.includes("thiếu") || noteLower.includes("bài tập") || noteLower.includes("vở")) {
            student.behaviorCount.forgetHomework = (student.behaviorCount.forgetHomework || 0) + 1;
          } else if (noteLower.includes("muộn") || noteLower.includes("trễ")) {
            student.behaviorCount.lateToSchool = (student.behaviorCount.lateToSchool || 0) + 1;
          } else {
            student.behaviorCount.distraction = (student.behaviorCount.distraction || 0) + 1;
          }
        }
      });
      
      await Database.saveStudents(students, ownerId);
    }

    Logger.info(`Saved journal entry: ${newJournalEntry.subject} - ${newJournalEntry.lessonTopic}`);
    res.status(201).json(newJournalEntry);
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/journal/:id
 * @desc Remove a class journal log
 * @access Private
 */
router.delete("/:id", authenticateToken as any, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const journals = Database.getJournals(ownerId);

    const idx = journals.findIndex(j => j.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy mục sổ đầu bài cần xóa." });
    }

    const [deleted] = journals.splice(idx, 1);
    await Database.saveJournals(journals, ownerId);

    // Sync / Revert infractions for the deleted journal entry
    const studentInfractions = deleted.studentInfractions;
    if (Array.isArray(studentInfractions) && studentInfractions.length > 0) {
      const students = Database.getStudents(ownerId);
      let studentsChanged = false;

      studentInfractions.forEach((item: any) => {
        let student = null;
        if (item.studentId) {
          student = students.find(s => s.id === item.studentId);
        }
        if (!student && item.studentName) {
          const cleanName = item.studentName.toLowerCase().trim();
          student = students.find(s => s.name.toLowerCase() === cleanName);
          if (!student) {
            student = students.find(s => s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase()));
          }
        }

        if (student && student.behaviorCount) {
          const noteLower = (item.note || "").toLowerCase();
          if (noteLower.includes("quên") || noteLower.includes("thiếu") || noteLower.includes("bài tập") || noteLower.includes("vở")) {
            student.behaviorCount.forgetHomework = Math.max(0, (student.behaviorCount.forgetHomework || 0) - 1);
          } else if (noteLower.includes("muộn") || noteLower.includes("trễ")) {
            student.behaviorCount.lateToSchool = Math.max(0, (student.behaviorCount.lateToSchool || 0) - 1);
          } else {
            student.behaviorCount.distraction = Math.max(0, (student.behaviorCount.distraction || 0) - 1);
          }
          studentsChanged = true;
        }
      });

      if (studentsChanged) {
        await Database.saveStudents(students, ownerId);
      }
    }

    Logger.warn(`Deleted class journal entry: ${deleted.id} - ${deleted.subject}`);
    res.json({ message: "Xóa mục sổ đầu bài thành công", entry: deleted });
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/journal/:id
 * @desc Update an existing class journal log and sync student infractions
 * @access Private
 */
router.put("/:id", authenticateToken as any, validateJournal, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { date, lessonNumber, subject, lessonTopic, teacherComment, evaluation, orderliness, studentPraise, studentInfractions } = req.body;

    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const journals = Database.getJournals(ownerId);
    const idx = journals.findIndex(j => j.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy mục sổ đầu bài cần sửa." });
    }

    const oldJournalEntry = journals[idx];

    const updatedJournalEntry = {
      id,
      date,
      lessonNumber: Number(lessonNumber) || 1,
      subject,
      lessonTopic,
      teacherComment: teacherComment || "",
      evaluation,
      orderliness: orderliness || "Tốt",
      studentPraise: studentPraise || [],
      studentInfractions: studentInfractions || []
    };

    journals[idx] = {
      ...updatedJournalEntry,
      ownerId
    };
    await Database.saveJournals(journals, ownerId);

    // Sync student behavior metrics: Revert old infractions, then apply new infractions
    const students = Database.getStudents(ownerId);
    let studentsChanged = false;

    // 1. Revert old infractions
    if (oldJournalEntry && Array.isArray(oldJournalEntry.studentInfractions) && oldJournalEntry.studentInfractions.length > 0) {
      oldJournalEntry.studentInfractions.forEach((item: any) => {
        let student = null;
        if (item.studentId) {
          student = students.find(s => s.id === item.studentId);
        }
        if (!student && item.studentName) {
          const cleanName = item.studentName.toLowerCase().trim();
          student = students.find(s => s.name.toLowerCase() === cleanName);
          if (!student) {
            student = students.find(s => s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase()));
          }
        }

        if (student && student.behaviorCount) {
          const noteLower = (item.note || "").toLowerCase();
          if (noteLower.includes("quên") || noteLower.includes("thiếu") || noteLower.includes("bài tập") || noteLower.includes("vở")) {
            student.behaviorCount.forgetHomework = Math.max(0, (student.behaviorCount.forgetHomework || 0) - 1);
          } else if (noteLower.includes("muộn") || noteLower.includes("trễ")) {
            student.behaviorCount.lateToSchool = Math.max(0, (student.behaviorCount.lateToSchool || 0) - 1);
          } else {
            student.behaviorCount.distraction = Math.max(0, (student.behaviorCount.distraction || 0) - 1);
          }
          studentsChanged = true;
        }
      });
    }

    // 2. Apply new infractions
    if (Array.isArray(studentInfractions) && studentInfractions.length > 0) {
      studentInfractions.forEach((item: any) => {
        let student = null;
        if (item.studentId) {
          student = students.find(s => s.id === item.studentId);
        }
        if (!student && item.studentName) {
          const cleanName = item.studentName.toLowerCase().trim();
          student = students.find(s => s.name.toLowerCase() === cleanName);
          if (!student) {
            student = students.find(s => s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase()));
          }
        }

        if (student) {
          if (!student.behaviorCount) {
            student.behaviorCount = { forgetHomework: 0, lateToSchool: 0, distraction: 0 };
          }
          const noteLower = (item.note || "").toLowerCase();
          if (noteLower.includes("quên") || noteLower.includes("thiếu") || noteLower.includes("bài tập") || noteLower.includes("vở")) {
            student.behaviorCount.forgetHomework = (student.behaviorCount.forgetHomework || 0) + 1;
          } else if (noteLower.includes("muộn") || noteLower.includes("trễ")) {
            student.behaviorCount.lateToSchool = (student.behaviorCount.lateToSchool || 0) + 1;
          } else {
            student.behaviorCount.distraction = (student.behaviorCount.distraction || 0) + 1;
          }
          studentsChanged = true;
        }
      });
    }

    if (studentsChanged) {
      await Database.saveStudents(students, ownerId);
    }

    Logger.info(`Updated journal entry: ${updatedJournalEntry.subject} - ${updatedJournalEntry.lessonTopic}`);
    res.json(updatedJournalEntry);
  } catch (err) {
    next(err);
  }
});

export default router;
