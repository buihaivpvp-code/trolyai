import { Router, Response } from "express";
import { Database } from "../services/db.ts";
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from "../middleware/auth.ts";
import { validateStudent } from "../middleware/validator.ts";
import { Logger } from "../middleware/logger.ts";

const router = Router();

/**
 * Generate a randomized ID for new entities
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Helper to compute dynamic student diary from class journals
 */
export function getStudentDiary(student: any, classJournals: any[]) {
  const staticDiary = (student.diary || []).filter((d: any) => 
    d && d.id && !d.id.startsWith("jr-praise-") && !d.id.startsWith("jr-infraction-")
  );
  
  const diaryList = [...staticDiary];
  
  classJournals.forEach(j => {
    if (Array.isArray(j.studentPraise)) {
      j.studentPraise.forEach((item: any) => {
        const isMatch = (item.studentId && item.studentId === student.id) || 
                        (!item.studentId && item.studentName && item.studentName.toLowerCase().trim() === student.name.toLowerCase().trim());
        if (isMatch) {
          const entryId = `jr-praise-${j.id}-${student.id}`;
          const exists = diaryList.some(d => d.id === entryId);
          if (!exists) {
            diaryList.push({
              id: entryId,
              date: j.date,
              type: "khen_thuong",
              content: `Được tuyên dương trong giờ Sổ Đầu Bài môn ${j.subject}: ${item.note}`,
              subject: j.subject
            });
          }
        }
      });
    }

    if (Array.isArray(j.studentInfractions)) {
      j.studentInfractions.forEach((item: any) => {
        const isMatch = (item.studentId && item.studentId === student.id) || 
                        (!item.studentId && item.studentName && item.studentName.toLowerCase().trim() === student.name.toLowerCase().trim());
        if (isMatch) {
          const entryId = `jr-infraction-${j.id}-${student.id}`;
          const exists = diaryList.some(d => d.id === entryId);
          if (!exists) {
            diaryList.push({
              id: entryId,
              date: j.date,
              type: "vi_pham",
              content: `Bị nhắc nhở lỗi trong giờ Sổ Đầu Bài môn ${j.subject}: ${item.note}`,
              subject: j.subject
            });
          }
        }
      });
    }
  });

  return diaryList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * @route GET /api/students
 * @desc Get list of all students under authorization scopes
 * @access Private (Teacher or Admin)
 */
router.get("/", authenticateToken as any, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const students = Database.getStudents(ownerId);
    const journals = Database.getJournals(ownerId);
    
    // Apply Authorization filtering
    let allowedStudents = students;
    if (req.user && req.user.role === "teacher" && req.user.classCode !== "all") {
      const teacherClass = req.user.classCode.toUpperCase().trim();
      allowedStudents = students.filter(s => s.schoolClass && s.schoolClass.toUpperCase().trim() === teacherClass);
    }

    const studentsWithDiary = allowedStudents.map(s => ({
      ...s,
      diary: getStudentDiary(s, journals)
    }));

    res.json(studentsWithDiary);
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/students
 * @desc Add a new student record
 * @access Private (Teacher or Admin)
 */
router.post("/", authenticateToken as any, validateStudent, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { 
      name, gender, dob, phone, fatherName, fatherPhone, motherName, motherPhone, 
      schoolGrade, schoolClass, avatar, circular27Grades, psychologicalProfile, 
      semiBoardingProfile, talentProfile, attendance, behaviorCount 
    } = req.body;
    
    const finalPhone = phone || fatherPhone || motherPhone;
    if (!name || !gender || !dob || !finalPhone) {
      return res.status(400).json({ error: "Thiếu thông tin cá nhân bắt buộc (Họ tên, Giới tính, Ngày sinh, Số điện thoại liên hệ)." });
    }

    const defaultAvatar = gender === "Nam" 
      ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80";

    const targetClass = (schoolClass || (req.user ? req.user.classCode : "4A")).toString().toUpperCase().trim();

    const newStudent = {
      id: "std-" + generateId(),
      name: name.trim(),
      gender,
      dob,
      phone: finalPhone.trim(),
      fatherName: fatherName || "",
      fatherPhone: fatherPhone || "",
      motherName: motherName || "",
      motherPhone: motherPhone || "",
      schoolGrade: Number(schoolGrade) || 4,
      schoolClass: targetClass,
      avatar: avatar || defaultAvatar,
      circular27Grades: circular27Grades || {},
      psychologicalProfile: psychologicalProfile || { sociability: 0, shyness: 0, hyperactive: 0, focus: 0 },
      semiBoardingProfile: semiBoardingProfile || { allergies: "", diet: "", healthNotes: "" },
      talentProfile: talentProfile || { art: false, music: false, sports: false, stem: false, notes: "" },
      attendance: attendance || { totalDays: 0, presentDays: 0, lateDays: 0, absentDays: 0 },
      behaviorCount: behaviorCount || { forgetHomework: 0, lateToSchool: 0, distraction: 0 },
      diary: req.body.diary || []
    };

    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const students = Database.getStudents(ownerId);
    students.push({
      ...newStudent,
      ownerId
    });
    Database.saveStudents(students, ownerId);

    Logger.info(`Student registered: ${newStudent.name} in class ${newStudent.schoolClass}`);
    res.status(201).json(newStudent);
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/students/bulk
 * @desc Add multiple student records at once
 * @access Private (Teacher or Admin)
 */
router.post("/bulk", authenticateToken as any, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const studentsArray = req.body;
    if (!Array.isArray(studentsArray)) {
      return res.status(400).json({ error: "Dữ liệu gửi lên phải là một danh sách học sinh." });
    }

    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const currentStudents = Database.getStudents(ownerId);
    const addedStudents = [];

    for (const student of studentsArray) {
      const { 
        name, gender, dob, phone, fatherName, fatherPhone, motherName, motherPhone, 
        schoolGrade, schoolClass, avatar, circular27Grades, psychologicalProfile, 
        semiBoardingProfile, talentProfile, attendance, behaviorCount 
      } = student;
      
      const finalPhone = phone || fatherPhone || motherPhone;
      if (!name || !gender || !dob || !finalPhone) {
        continue;
      }

      const defaultAvatar = gender === "Nam" 
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
        : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80";

      const targetClass = (schoolClass || (req.user ? req.user.classCode : "4A")).toString().toUpperCase().trim();

      const newStudent = {
        id: "std-" + generateId(),
        name: name.trim(),
        gender,
        dob,
        phone: finalPhone.trim(),
        fatherName: fatherName || "",
        fatherPhone: fatherPhone || "",
        motherName: motherName || "",
        motherPhone: motherPhone || "",
        schoolGrade: Number(schoolGrade) || 4,
        schoolClass: targetClass,
        avatar: avatar || defaultAvatar,
        circular27Grades: circular27Grades || {},
        psychologicalProfile: psychologicalProfile || { sociability: 0, shyness: 0, hyperactive: 0, focus: 0 },
        semiBoardingProfile: semiBoardingProfile || { allergies: "", diet: "", healthNotes: "" },
        talentProfile: talentProfile || { art: false, music: false, sports: false, stem: false, notes: "" },
        attendance: attendance || { totalDays: 0, presentDays: 0, lateDays: 0, absentDays: 0 },
        behaviorCount: behaviorCount || { forgetHomework: 0, lateToSchool: 0, distraction: 0 },
        diary: student.diary || [],
        ownerId
      };

      currentStudents.push(newStudent);
      addedStudents.push(newStudent);
    }

    Database.saveStudents(currentStudents, ownerId);
    Logger.info(`Bulk registered ${addedStudents.length} students`);
    res.status(201).json(addedStudents);
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/students/:id
 * @desc Update an existing student profile
 * @access Private (Teacher or Admin)
 */
router.put("/:id", authenticateToken as any, validateStudent, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const students = Database.getStudents(ownerId);
    const journals = Database.getJournals(ownerId);

    const idx = students.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy học sinh cần cập nhật." });
    }

    const current = students[idx];

    // Authorization Guard: Check if teacher has access to edit this student
    if (req.user && req.user.role === "teacher" && req.user.classCode !== "all" && current.schoolClass.toUpperCase().trim() !== req.user.classCode.toUpperCase().trim()) {
      return res.status(403).json({ error: "Bạn không có quyền sửa thông tin học sinh thuộc lớp học khác." });
    }

    let cleanDiary = req.body.diary;
    if (Array.isArray(cleanDiary)) {
      cleanDiary = cleanDiary.filter((d: any) => d && d.id && !d.id.startsWith("jr-praise-") && !d.id.startsWith("jr-infraction-"));
    }

    const updatedClass = req.body.schoolClass !== undefined 
      ? req.body.schoolClass.toString().toUpperCase().trim() 
      : current.schoolClass;

    students[idx] = {
      ...current,
      ...req.body,
      diary: cleanDiary !== undefined ? cleanDiary : current.diary,
      phone: req.body.phone || req.body.fatherPhone || req.body.motherPhone || current.phone,
      id: current.id, // ID is immutable
      schoolGrade: req.body.schoolGrade !== undefined ? Number(req.body.schoolGrade) : current.schoolGrade,
      schoolClass: updatedClass,
    };

    Database.saveStudents(students, ownerId);
    Logger.info(`Student updated: ${students[idx].name}`);

    res.json({
      ...students[idx],
      diary: getStudentDiary(students[idx], journals)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/students/:id
 * @desc Remove a student from class list
 * @access Private (Admin or Class Teacher)
 */
router.delete("/:id", authenticateToken as any, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const students = Database.getStudents(ownerId);

    const idx = students.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy học sinh cần xóa khỏi danh sách." });
    }

    const current = students[idx];

    // Authorization Guard: Check if teacher has access to delete this student
    if (req.user && req.user.role === "teacher" && req.user.classCode !== "all" && current.schoolClass.toUpperCase().trim() !== req.user.classCode.toUpperCase().trim()) {
      return res.status(403).json({ error: "Bạn không có quyền xóa học sinh thuộc lớp học khác." });
    }

    const [deleted] = students.splice(idx, 1);
    Database.saveStudents(students, ownerId);

    Logger.warn(`Student removed: ${deleted.name} from class ${deleted.schoolClass}`);
    res.json({ message: "Xóa học sinh thành công", student: deleted });
  } catch (err) {
    next(err);
  }
});

export default router;
