# Rebuild Audit

## 1. Kiến trúc hiện tại

### Tổng quan
- **Frontend**: Vite + React + TypeScript.
- **Backend hiện tại**: Express/Node chạy chung repo (`server.ts`, thư mục `backend/`).
- **Deploy hiện tại**: chưa được chuẩn hóa rõ cho mô hình Vercel frontend + serverless API.
- **Source control**: GitHub remote `origin: https://github.com/buihaivpvp-code/trolyai.git`.

### Cấu trúc thư mục hiện tại
- `src/`: frontend React.
- `backend/`: Express backend, middleware, routes, services, models.
- `data/`: dữ liệu JSON nội bộ đang đóng vai trò database.
- `uploads/`: file upload lưu cục bộ trên đĩa.
- `public/`, `assets/`: static assets.
- `server.ts`: entry backend runtime.
- `vite.config.ts`, `tsconfig.json`, `package.json`: cấu hình build.

### Route / màn hình frontend hiện tại
App chính hiện là tab-based SPA trong `src/App.tsx`, gồm:
- `manager` → `StudentManager`
- `repository` → `DocumentRepository`
- `slides` → `SlideGenerator`
- `tests` → `AITestCreator`
- `classroom_games` → `ClassroomGames`
- `journal` → `ClassJournal`

Các guard hiện tại:
- Auth guard qua `Auth`
- Onboarding guard qua `Onboarding`

### Auth hiện tại
- Frontend gọi:
  - `GET /api/auth/me`
  - `PUT /api/auth/profile`
  - `POST /api/auth/login`
  - `POST /api/auth/register`
- Token hiện tại:
  - sinh ở backend riêng
  - lưu ở `localStorage` với key `auth_token`
- Backend auth:
  - tự hash password
  - tự generate token
  - tự verify token qua middleware
- User hiện lưu trong `data/users.json`

### Database hiện tại
Không có database thực sự. Dự án đang dùng JSON file như database:
- `data/users.json`
- `data/students_base.json`
- `data/grades.json`
- `data/psychological_profiles.json`
- `data/semi_boarding_profiles.json`
- `data/talent_profiles.json`
- `data/attendances.json`
- `data/behavior_counts.json`
- `data/diaries.json`
- `data/journals_base.json`
- `data/journal_praises.json`
- `data/journal_infractions.json`
- `data/monthly_grades.json`

`backend/services/db.ts` đang đóng vai trò data access layer giả lập và tự seed dữ liệu mẫu.

### API hiện tại
Backend Express hiện cung cấp ít nhất các nhóm API:
- Auth: `/api/auth/*`
- Students: `/api/students*`
- Journal: `/api/journal*`
- Documents upload/download: `/api/documents/*`
- Gemini/AI: `/api/gemini/*`

### Lưu trữ file hiện tại
- File hiện đang lưu trực tiếp vào thư mục local `uploads/`
- Download qua route backend
- Chưa có Cloudflare R2 presigned upload flow
- Kiến trúc hiện tại không phù hợp Vercel serverless nếu phụ thuộc lưu file cục bộ lâu dài

### Browser storage hiện tại
Dùng `localStorage` ở nhiều nơi:
- `auth_token`
- `remember_email`
- `remember_password`
- `remember_me`
- `eduai_theme_mode`
- `eduai_font_scale`
- `eduai_thinking_mode`
- document repository theo user
- dữ liệu tài liệu trung gian cho slide / lesson flows

### Supabase hiện tại
- Chưa thấy kiến trúc Supabase Auth/Database được dùng làm nguồn thật.
- Nếu có cấu hình môi trường liên quan Supabase thì chưa phải luồng chính đang chạy.
- Frontend và backend hiện vẫn phụ thuộc backend auth cũ + JSON.

### Cloudflare R2 hiện tại
- Chưa thấy luồng upload an toàn qua presigned URL.
- Chưa thấy kiến trúc frontend → serverless API → R2.
- Lưu file local đang là luồng thực tế.

### Vercel hiện tại
- Chưa xác nhận có `vercel.json` tối ưu.
- Chưa xác nhận rewrite/API route cho mô hình frontend + serverless.
- Có rủi ro app đang thiết kế theo kiểu chạy local server truyền thống hơn là Vercel-native.

### GitHub / CI hiện tại
- Chưa xác nhận workflow CI chuẩn hóa cho:
  - `npm ci`
  - lint
  - typecheck
  - test
  - build
- Chưa xác nhận secret hygiene ở workflow.

---

## 2. Framework và package hiện trạng

### Framework
- **React**
- **TypeScript**
- **Vite**
- **Express**

### Đặc điểm kiến trúc hiện tại
- Monorepo đơn giản nhưng chưa tách rõ:
  - UI
  - auth/session
  - data service
  - file storage
  - AI integration

---

## 3. Dữ liệu nghiệp vụ hiện tại

## Entity đã xác định từ code/schema
### User
Field hiện dùng:
- `id`
- `email`
- `passwordHash`
- `name`
- `role`
- `classCode`
- `avatar`
- `phone`
- `dob`
- `workplace`
- `experience`
- `achievements`
- `bio`
- `hasCompletedOnboarding`

### Student
Field hiện dùng:
- `id`
- `ownerId`
- `name`
- `gender`
- `dob`
- `avatar`
- `phone`
- `fatherName`
- `fatherPhone`
- `motherName`
- `motherPhone`
- `schoolGrade`
- `schoolClass`

### Student-related sub-entities
- `Circular27Grade`
- `PsychologicalProfile`
- `SemiBoardingProfile`
- `TalentProfile`
- `Attendance`
- `BehaviorCount`
- `StudentDiary`
- `MonthlyGrades` (được dùng trong `db.ts`)

### Journal-related entities
- `ClassJournal`
- `ClassJournalPraise`
- `ClassJournalInfraction`

### Document/file data
- Document repository hiện có dữ liệu lưu ở localStorage
- Upload file metadata chưa được chuẩn hóa thành entity database thật

---

## 4. Phần cần giữ nguyên

Các phần cần giữ nguyên theo yêu cầu:
- Giao diện hiện tại
- Bố cục, màu sắc, typography, animation, nội dung
- Tên route/tab và luồng người dùng hiện có
- Các component giao diện đang render trong `App.tsx`
- Form đăng nhập/đăng ký về mặt UI
- Form hồ sơ giáo viên / onboarding về mặt UI
- Luồng quản lý học sinh, tài liệu, AI slide, AI test, sổ đầu bài về mặt UX

---

## 5. Vấn đề hiện tại

### 5.1 Auth
- Auth hoàn toàn custom, không dùng Supabase Auth
- Lưu `auth_token` ở `localStorage`
- Regenerate token thủ công khi update profile
- Có luồng “remember password” lưu cả mật khẩu trong `localStorage`
- Session hiện tại không theo chuẩn Supabase session lifecycle

### 5.2 Database
- Dữ liệu nghiệp vụ đang lưu trong JSON file
- Không phù hợp production multi-user
- Không phù hợp deploy serverless
- Không có transaction thực sự
- Không có RLS
- Khó scale và dễ phát sinh race condition

### 5.3 File storage
- Upload local vào `uploads/`
- Không phù hợp Vercel serverless
- Không phù hợp kiến trúc cloud production
- Chưa có presigned URL
- Chưa tách metadata file vào DB chuẩn

### 5.4 Frontend data layer
- Component gọi `/api/*` trực tiếp ở nhiều nơi
- Logic dữ liệu và UI đang trộn
- `localStorage` đang chứa cả dữ liệu nghiệp vụ, không chỉ preference
- Không có service/repository layer thống nhất

### 5.5 Error handling
- Xử lý lỗi phân tán theo component
- Chưa có cơ chế thống nhất cho loading/success/error/retry/unauthorized/network error

### 5.6 Cấu trúc dự án
- Chưa chuẩn hóa rõ theo nhóm trách nhiệm
- `App.tsx` đang ôm quá nhiều state và logic auth/session/profile/settings
- Ranh giới frontend/backend/storage/auth chưa rõ

### 5.7 Security
- Password lưu “remember password” ở localStorage
- JSON/file storage dễ lộ hoặc hỏng dữ liệu
- Secret/backend-private flow chưa được chứng minh là tách khỏi frontend đầy đủ
- File upload local không phù hợp môi trường production serverless

---

## 6. Phần cần sửa

### Auth
- Thay backend auth cũ bằng Supabase Auth:
  - `signUp`
  - `signInWithPassword`
  - `signOut`
  - `getSession`
  - `getUser`
  - `onAuthStateChange`

### Session / user state
- Tạo một Supabase client duy nhất
- Tạo một auth provider/store duy nhất
- Bỏ lưu access token thủ công trong `localStorage`

### Data layer
- Tách service layer khỏi component
- Chuẩn hóa:
  - UI
  - feature hook/service
  - data service
  - Supabase

### Storage
- Thay local upload bằng Cloudflare R2 presigned upload
- Lưu metadata file trong Supabase

### Backend/API
- Giữ backend/serverless ở mức tối thiểu cần thiết:
  - verify Supabase session
  - tạo presigned upload/download URL
  - các API private cần secret

### CI/Deploy
- Chuẩn hóa GitHub Action kiểm tra chất lượng
- Chuẩn hóa build/deploy cho Vercel

---

## 7. Phần cần thay thế

- Custom auth token backend → **Supabase Auth**
- `data/*.json` làm database → **Supabase Database**
- `uploads/` local storage → **Cloudflare R2**
- Component gọi data trực tiếp rải rác → **service/repository layer**
- Xử lý lỗi rời rạc → **error handling thống nhất**

---

## 8. Phần cần xóa (sau khi chứng minh không còn dùng)

Chưa xóa ngay ở giai đoạn audit. Dự kiến xóa có kiểm soát:
- backend auth cũ
- token middleware cũ
- JSON database cũ
- mock/local document repository
- duplicate session logic
- env cũ không còn dùng
- package không còn dùng
- dead code và import thừa

---

## 9. Rủi ro

### Rủi ro cao
1. **Chưa có schema Supabase thực tế**
   - Dù đã xác định entity từ code, vẫn cần xác nhận schema triển khai cuối cùng và migration strategy.

2. **Chưa có xác nhận RLS và role model cuối cùng**
   - Hiện code có `teacher` và `admin`, nhưng quyền admin chi tiết chưa đủ rõ.

3. **UI phụ thuộc backend cũ ở nhiều điểm**
   - Không chỉ auth mà cả students, journal, documents, upload, AI API.

4. **Document repository đang phụ thuộc localStorage**
   - Chuyển sang DB/file storage có thể làm thay đổi hành vi nếu không viết adapter tương thích.

5. **Avatar hiện lưu dạng base64 trong profile**
   - Cần chuyển về upload file + URL an toàn mà không đổi trải nghiệm UI.

6. **Dữ liệu seed/mẫu có thể đang được người dùng dùng như dữ liệu thật**
   - Cần strategy migration sang Supabase, tránh mất dữ liệu.

7. **Deploy Vercel**
   - Luồng lưu file local và backend server truyền thống có thể không tương thích.

### Rủi ro vận hành
- Mất dữ liệu khi migrate JSON → Supabase nếu không có import script kiểm soát
- Gãy session nếu thay auth không có adapter chuyển tiếp
- Gãy UI nếu response shape thay đổi

---

## 10. Thứ tự thực hiện đề xuất

1. **Checkpoint + bảo toàn trạng thái Git**
2. **Chuẩn hóa tài liệu tiến độ**
3. **Tạo hạ tầng dùng chung**
   - Supabase client
   - auth provider/store
   - env contract
   - shared error model
4. **Refactor auth**
   - Auth form giữ UI, đổi logic sang Supabase
   - App session guard dùng Supabase
   - Backend profile endpoint chuyển sang verify Supabase session
5. **Refactor user profile/onboarding**
   - lưu profile vào Supabase
6. **Refactor data layer**
   - students
   - journals
   - document metadata
7. **Refactor upload**
   - serverless presigned URL
   - upload trực tiếp R2
   - metadata vào Supabase
8. **Chuẩn hóa Vercel config**
9. **Chuẩn hóa GitHub Action**
10. **Dọn code cũ có kiểm soát**
11. **Lint / typecheck / test / build sau từng giai đoạn**

---

## 11. Frontend đang gọi backend cũ

Đã xác định các điểm gọi backend cũ hoặc storage cũ nổi bật:
- `src/App.tsx`
  - `/api/auth/me`
  - `/api/auth/profile`
  - `/api/students`
  - `localStorage.auth_token`
- `src/components/Auth.tsx`
  - `/api/auth/login`
  - `/api/auth/register`
  - `remember_email`
  - `remember_password`
  - `remember_me`
- `src/components/Onboarding.tsx`
  - `/api/auth/profile`
  - `/api/students`
- `src/components/StudentManager.tsx`
  - `/api/students`
- `src/components/StudentProfiles.tsx`
  - `/api/students`
- `src/components/AcademicChart.tsx`
  - `/api/students`
- `src/components/ClassroomGames.tsx`
  - `/api/students`
- `src/components/ClassJournal.tsx`
  - `/api/students`
  - `/api/journal`
- `src/components/DocumentRepository.tsx`
  - `/api/documents/upload`
  - `/api/documents/download/:id`
  - localStorage documents
- `src/components/SlideGenerator.tsx`
  - localStorage documents
- `src/components/LessonPlanEditor.tsx`
  - localStorage documents

---

## 12. localStorage / dữ liệu giả lập / dữ liệu trình duyệt

### Chấp nhận giữ tạm
- `eduai_theme_mode`
- `eduai_font_scale`
- `eduai_thinking_mode`

### Không phù hợp, cần thay
- `auth_token`
- `remember_password`
- document repository data
- các dữ liệu nghiệp vụ đang bị lưu theo user trong browser

---

## 13. File/nhóm file đáng chú ý

### Nhóm auth
- `src/App.tsx`
- `src/components/Auth.tsx`
- `src/components/Onboarding.tsx`
- `src/utils/api.ts`
- `backend/routes/auth.ts`
- `backend/middleware/auth.ts`

### Nhóm data
- `backend/services/db.ts`
- `backend/models/schema.ts`
- student/journal related backend routes
- các component frontend gọi `/api/students` và `/api/journal`

### Nhóm upload
- `src/components/DocumentRepository.tsx`
- `backend/routes/documents*` (cần rà soát tiếp khi triển khai)
- `uploads/`

---

## 14. Trạng thái Git trước checkpoint
- `git status --short --branch` cho thấy:
  - nhánh `main`
  - đang `ahead 4` so với `origin/main`
  - không thấy file modified/untracked trong output hiện tại
- Cần tạo checkpoint riêng trước refactor có kiểm soát, sau khi tài liệu audit hoàn tất.

---

## 15. Kết luận audit

Dự án hiện **chưa đạt kiến trúc mục tiêu** vì:
- auth chưa dùng Supabase Auth
- database chưa dùng Supabase Database
- file storage chưa dùng Cloudflare R2
- còn lưu dữ liệu nhạy cảm/nghiệp vụ trong browser và JSON local
- chưa phù hợp deploy production theo mô hình Vercel + GitHub + cloud storage

Tuy nhiên, dự án có lợi thế:
- UI hiện tại đã khá hoàn chỉnh
- entity nghiệp vụ đã tương đối rõ
- route/luồng người dùng đã ổn định
- có thể refactor từng lớp phía sau mà vẫn giữ nguyên giao diện

## 16. Phạm vi triển khai ngay sau audit
- Không đổi UI.
- Không đổi tên route/tab/component nếu không bắt buộc.
- Ưu tiên refactor hạ tầng dùng chung trước:
  - Supabase client
  - auth store/provider
  - service layer
  - serverless upload bridge
- Mọi thay đổi tiếp theo phải đi theo commit nhỏ và build kiểm tra từng giai đoạn.