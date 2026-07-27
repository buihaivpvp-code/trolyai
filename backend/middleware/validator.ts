import { Request, Response, NextFunction } from "express";

/**
 * Validates the request body for creating or updating a student.
 */
export function validateStudent(req: Request, res: Response, next: NextFunction) {
  const { name, gender, dob, phone, fatherPhone, motherPhone } = req.body;

  if (req.method === "POST" || (req.method === "PUT" && (name !== undefined || gender !== undefined || dob !== undefined || phone !== undefined || fatherPhone !== undefined || motherPhone !== undefined))) {
    const errors: string[] = [];

    if (name !== undefined && name !== null) {
      if (typeof name !== "string" || name.trim().length < 2) {
        errors.push("Họ và tên phải là chuỗi văn bản và chứa ít nhất 2 ký tự.");
      }
    }
    
    if (gender !== undefined && gender !== null) {
      if (!["Nam", "Nữ"].includes(gender)) {
        errors.push("Giới tính phải là 'Nam' hoặc 'Nữ'.");
      }
    }
    
    if (dob !== undefined && dob !== null && dob !== "") {
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
        errors.push("Ngày sinh không hợp lệ hoặc không thể ở tương lai.");
      }
    }
    
    const finalPhone = phone || fatherPhone || motherPhone;
    if (finalPhone !== undefined && finalPhone !== null && finalPhone !== "") {
      if (typeof finalPhone !== "string" || !/^[0-9+() -]{9,15}$/.test(finalPhone.trim())) {
        errors.push("Số điện thoại liên hệ không đúng định dạng chuẩn.");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Dữ liệu học sinh không hợp lệ", details: errors });
    }
  }

  next();
}

/**
 * Validates the request body for creating a class journal entry.
 */
export function validateJournal(req: Request, res: Response, next: NextFunction) {
  const { date, subject, lessonTopic, evaluation } = req.body;

  if (req.method === "POST") {
    const errors: string[] = [];

    if (!date || isNaN(new Date(date).getTime())) {
      errors.push("Ngày ghi sổ đầu bài không hợp lệ hoặc bị thiếu.");
    }

    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      errors.push("Tên môn học bắt buộc không được để trống.");
    }

    if (!lessonTopic || typeof lessonTopic !== "string" || lessonTopic.trim().length === 0) {
      errors.push("Tên đầu bài học bắt buộc không được để trống.");
    }

    if (!evaluation || typeof evaluation !== "string" || evaluation.trim().length === 0) {
      errors.push("Đánh giá nhận xét tiết học bắt buộc không được để trống.");
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Dữ liệu sổ đầu bài không hợp lệ", details: errors });
    }
  }

  next();
}
