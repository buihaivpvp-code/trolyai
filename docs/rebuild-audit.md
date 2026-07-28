# Rebuild Audit

## 1. Kiến trúc hiện tại

### Tổng quan công nghệ
- Frontend: React 19 + Vite 6 + TypeScript.
- Backend hiện tại: Express chạy chung repo qua `server.ts`.
- Build:
  - Frontend: `vite build`
  - Backend: `esbuild server.ts --bundle --platform=node --format=cjs`
- Runtime hiện tại:
  - `npm run dev`: chạy `tsx server.ts`
  - `npm run dev:fe`: Vite dev server cổng `2629`
  - `npm run dev:be`: backend cổng `2630`

### Cấu trúc thư mục hiện tại
- `src/`: frontend React.
- `src/components/`: UI chính và luồng nghiệp vụ.
- `src/utils/`: helper frontend, gồm API wrapper.
- `backend/`: mã backend theo nhóm `middleware`, `models`, `routes`, `services`.
- `data/`: nhiều file JSON dữ liệu nghiệp vụ.
- `uploads/`: file tải lên đang lưu trực tiếp trong repo/máy chủ.
- `public/`, `assets/`: static assets.
- `server.ts`: entrypoint backend/server.
- `env.local`, `.env.local`, `env.r2.example`: cấu hình môi trường rải rác.

### Tổ chức frontend hiện tại
- App chính nằm trong `src/App.tsx`.
- Điều hướng hiện tại không dùng router URL-based; dùng tab state nội bộ:
  - `manager`
  - `repository`
  - `slides`
  - `tests`
  - `classroom_games`
  - `journal`
- Các component màn hình chính:
  - `StudentManager`
  - `DocumentRepository`
  - `SlideGenerator`
  - `AITestCreator`
  - `ClassroomGames`
  - `ClassJournal`
  - `Auth`
  - `Onboarding`

### Xác thực hiện tại
- Form đăng nhập/đăng ký ở `src/components/Auth.tsx`.
- Frontend đang gọi backend cũ:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `GET /api/auth/me`
  - `PUT /api/auth/profile`
- Session hiện tại dựa vào `auth_token` lưu trong `localStorage`.
- `App.tsx` đọc `auth_token` từ localStorage khi load lại trang.
- `Onboarding.tsx` và `App.tsx` đều có logic ghi đè token mới vào localStorage sau khi cập nhật profile.
- Có “remember me” đang lưu cả email và password trong localStorage:
  - `remember_email`
  - `remember_password`
  - `remember_me`

### Dữ liệu hiện tại
- Dữ liệu nghiệp vụ đang tồn tại trong `data/*.json`, ví dụ:
  - `students_base.json`
  - `users.json`
  - `attendances.json`
  - `grades.json`
  - `diaries.json`
  - `journals_base.json`
  - `journal_infractions.json`
  - `journal_praises.json`
  - `monthly_grades.json`
  - `psychological_profiles.json`
  - `semi_boarding_profiles.json`
  - `talent_profiles.json`
  - `behavior_counts.json`
- Đây là dấu hiệu dữ liệu đang phụ thuộc JSON nội bộ thay vì database thực thụ.
- Frontend cũng đang giữ nhiều dữ liệu nghiệp vụ ở state tạm trong UI, đặc biệt ở onboarding.

### Upload/file storage hiện tại
- Repo có thư mục `uploads/` chứa nhiều tài liệu thật.
- Đây là dấu hiệu upload/file đang lưu cục bộ trên server hoặc trực tiếp trong project.
- Chưa đạt mục tiêu Cloudflare R2.
- Ảnh avatar hiện tại đang có thể lưu dạng base64 trực tiếp trong dữ liệu người dùng từ frontend.

### Supabase hiện tại
- Package `@supabase/supabase-js` đã được cài.
- Chưa xác nhận được một kiến trúc Supabase hoàn chỉnh đang hoạt động thống nhất.
- Có dấu hiệu dự án đang “nửa cũ nửa mới”: đã có dependency Supabase nhưng auth runtime hiện tại vẫn dựa backend token riêng + localStorage.

### Cloudflare R2 hiện tại
- Có package `@aws-sdk/client-s3`.
- Có file `env.r2.example`.
- Chưa xác nhận được luồng presigned URL chuẩn đang dùng.
- Khả năng cao lưu file vẫn đang phụ thuộc `uploads/` nội bộ hoặc backend cũ.

### Vercel / GitHub / CI
- Chưa thấy rõ:
  - `vercel.json`
  - GitHub Actions workflow
- Remote origin:
  - `https://github.com/buihaivpvp-code/trolyai.git`
- Branch hiện tại:
  - `main`
- Trạng thái Git:
  - branch `main` đang ahead `origin/main` 6 commit
  - working tree hiện tại sạch theo `git status --porcelain`

## 2. Vấn đề hiện tại

### Vấn đề kiến trúc
1. Frontend và backend đang dính chặt nhau trong cùng repo nhưng chưa có ranh giới trách nhiệm rõ.
2. `App.tsx` đang ôm quá nhiều trách nhiệm:
   - bootstrap session
   - auth guard
   - onboarding guard
   - profile editor
   - settings UI
   - tab navigation
3. Logic auth, profile và session bị rải ở nhiều nơi:
   - `App.tsx`
   - `Auth.tsx`
   - `Onboarding.tsx`

### Vấn đề bảo mật
1. `auth_token` đang được lưu trong localStorage.
2. Password “ghi nhớ đăng nhập” đang bị lưu trong localStorage.
3. Avatar có thể bị lưu base64 trực tiếp trong dữ liệu profile.
4. Dữ liệu quan trọng chưa tách hẳn khỏi browser storage.
5. Cần rà soát secret trong file env mở sẵn (`.env.local`) và các file env khác để bảo đảm không bị đưa vào frontend.

### Vấn đề dữ liệu
1. Dữ liệu nghiệp vụ đang dựa nhiều vào JSON file cục bộ.
2. `uploads/` đang là lưu trữ file cục bộ, không phù hợp deploy serverless/Vercel.
3. Chưa có data layer thống nhất kiểu:
   - UI
   - hook/service
   - repository/data service
   - datasource
4. Nguy cơ component gọi API/backend trực tiếp rải rác.

### Vấn đề auth/session
1. Auth hiện tại không dùng Supabase Auth làm nguồn sự thật duy nhất.
2. Session restore đang dựa localStorage token thủ công.
3. `Onboarding` cập nhật profile rồi nhận token mới từ backend cũ.
4. Route guard hiện tại phụ thuộc object `user` local state, chưa có auth provider/store chung.

### Vấn đề upload
1. File đang lưu cục bộ trong `uploads/`.
2. Chưa có serverless API phát presigned upload URL cho R2.
3. Chưa có metadata file chuẩn đưa vào database.
4. Chưa có chiến lược private/public object rõ ràng.

### Vấn đề vận hành/deploy
1. Chưa xác nhận cấu hình Vercel tương thích kiến trúc mới.
2. Chưa có workflow CI tối thiểu để lint/build/check.
3. Script `lint` hiện tại thực chất là `tsc --noEmit`, chưa phải lint thực thụ.
4. Script `clean` dùng `rm -rf`, không phù hợp Windows nếu chạy trực tiếp bằng shell mặc định.

## 3. Phần cần giữ nguyên

Các phần sau cần ưu tiên giữ nguyên để không làm sai yêu cầu:
- Giao diện hiện tại của toàn bộ màn hình.
- Bố cục, màu sắc, typography, animation và wording tiếng Việt.
- Luồng đăng nhập/đăng ký về mặt UX.
- Luồng onboarding 2 bước về mặt UX.
- Hệ tab trong `App.tsx` nếu chưa cần đổi kiến trúc route.
- Tên màn hình/chức năng hiện tại:
  - Danh Sách Lớp Học
  - Kho Tài Liệu
  - AI Tạo Slide Bài Giảng
  - AI Tạo Đề Kiểm Tra
  - Kiểm tra bài cũ
  - Sổ Đầu Bài AI
- Các field dữ liệu đang được UI sử dụng:
  - user: `name`, `email`, `classCode`, `avatar`, `phone`, `dob`, `workplace`, `experience`, `achievements`, `bio`, `role`, `hasCompletedOnboarding`
  - student: `name`, `gender`, `dob`, `phone`, `fatherName`, `fatherPhone`, `motherName`, `motherPhone`, `schoolGrade`, `schoolClass`

## 4. Phần cần sửa

### Auth
- Thay logic backend auth cũ bằng Supabase Auth:
  - `signUp`
  - `signInWithPassword`
  - `signOut`
  - `getSession`
  - `getUser`
  - `onAuthStateChange`
- Tạo một Supabase client duy nhất.
- Tạo một auth provider/store duy nhất.
- Bỏ lưu `auth_token` trong localStorage thủ công.
- Bỏ lưu `remember_password`.

### Data layer
- Tách data access khỏi component.
- Chuẩn hóa service/repository tối thiểu cho:
  - profile người dùng
  - students
  - documents/files
  - journal dữ liệu chính
- Chuyển dần từ JSON/backend cũ sang Supabase Database.
- Giữ fallback an toàn nếu chưa đủ schema.

### Upload
- Thay `uploads/` local bằng:
  - frontend upload service
  - API serverless tạo presigned URL
  - Cloudflare R2
  - metadata lưu trong Supabase

### Cấu hình
- Chuẩn hóa file env:
  - frontend chỉ dùng `VITE_*` an toàn
  - server giữ secret R2/Supabase service-side
- Rà soát build/start phù hợp Vercel.

## 5. Phần cần thay thế

- Cơ chế token backend cũ → Supabase session.
- local JSON làm nguồn dữ liệu chính → Supabase Database.
- local file upload folder → Cloudflare R2.
- gọi API trực tiếp từ component → service layer/repository thống nhất.
- logic auth phân tán → auth provider/store duy nhất.

## 6. Phần cần xóa

Chỉ xóa sau khi xác nhận không còn reference:
- auth flow backend cũ chỉ dùng cho login/register/me nếu đã thay hoàn toàn bằng Supabase.
- `auth_token` localStorage flow.
- `remember_password` localStorage flow.
- duplicate Supabase client nếu tồn tại.
- local upload flow cũ phụ thuộc `uploads/`.
- mock/JSON service không còn được gọi.
- env cũ không còn dùng.
- package không còn dùng sau khi refactor có kiểm soát.

## 7. Rủi ro

1. **Thiếu thông tin schema nghiệp vụ thực tế**  
   Chưa đủ cơ sở để chuyển toàn bộ `data/*.json` sang Supabase mà không đoán schema.

2. **Thiếu thông tin quyền hạn user/admin**  
   UI có `role`, nhưng chưa đủ chắc về quyền dữ liệu thực tế để viết RLS chuẩn.

3. **Thiếu thông tin Supabase env thực tế**  
   Cần ít nhất:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Thiếu thông tin R2 thực tế**  
   Cần:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_BASE_URL` hoặc quy ước private bucket

5. **Nguy cơ mất dữ liệu nếu xóa JSON/local upload quá sớm**  
   Cần migration/fallback hoặc ít nhất giữ song song giai đoạn chuyển tiếp.

6. **UI đang phụ thuộc backend cũ ngoài auth**  
   Cần xác định rõ component nào còn gọi API cũ trước khi cắt bỏ.

7. **Ahead 6 commit so với origin/main**  
   Không phải lỗi, nhưng cần cẩn thận khi tạo checkpoint và commit nhỏ tiếp theo.

## 8. Thứ tự thực hiện

### Giai đoạn 1 — Hoàn tất audit
- Hoàn tất tài liệu này.
- Không sửa code trước khi chốt audit.

### Giai đoạn 2 — Checkpoint Git
- Xác nhận working tree sạch.
- Tạo commit:
  - `chore: checkpoint before controlled rebuild`

### Giai đoạn 3 — Chuẩn hóa hạ tầng chung tối thiểu
- Tạo/chuẩn hóa:
  - `src/lib/supabase.ts`
  - `src/contexts` hoặc `src/stores` cho auth
  - util xử lý lỗi API thống nhất
- Không đổi UI.

### Giai đoạn 4 — Rebuild auth bằng Supabase
- Giữ nguyên UI `Auth.tsx`, `App.tsx`, `Onboarding.tsx`.
- Chỉ thay logic phía sau:
  - login/register/logout/session restore
  - profile sync
  - auth guard
- Backend cũ chỉ giữ phần dữ liệu/profile nếu còn cần tạm thời.

### Giai đoạn 5 — Rebuild data layer tối thiểu để vào được web
- Tách service cho profile + students trước.
- Giảm phụ thuộc `auth_token`.
- Chuẩn bị đường chuyển sang Supabase DB.

### Giai đoạn 6 — Chuẩn bị upload an toàn
- Thiết kế API presigned URL cho R2.
- Chưa cắt hẳn upload cũ nếu chưa có đủ secret/env.

### Giai đoạn 7 — Chuẩn hóa build/CI/Vercel
- Rà script build
- bổ sung workflow check
- chuẩn hóa env/example
- xác nhận serverless path nếu cần

### Giai đoạn 8 — Dọn code cũ có kiểm soát
- Chỉ xóa sau khi:
  - tìm reference
  - build pass
  - chức năng không vỡ

## 9. Điều kiện dừng hiện tại

Phải dừng và báo cáo nếu gặp một trong các trường hợp sau trong quá trình refactor tiếp:
- thiếu `VITE_SUPABASE_URL`
- thiếu `VITE_SUPABASE_ANON_KEY`
- không xác định được schema Supabase cần tạo
- không xác định được quyền user/admin
- không có thông tin bucket/domain R2
- phát hiện luồng dữ liệu sống đang phụ thuộc backend cũ theo cách chưa thể thay an toàn

## 10. Kế hoạch thực hiện ngay sau audit

1. Tạo checkpoint Git.
2. Refactor auth tối thiểu để:
   - không còn phụ thuộc `auth_token` localStorage
   - dùng Supabase session restore
   - giữ nguyên UI đăng nhập/onboarding
3. Giữ backend hiện tại ở mức tối thiểu để profile/students chưa gãy ngay.
4. Sau khi auth ổn định, mới tiếp tục bóc data layer và upload.