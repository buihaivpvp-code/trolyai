# Rebuild Audit

## 1. Kiến trúc hiện tại

### Tổng quan
- **Frontend**: Vite + React + TypeScript, SPA render phía client.
- **Backend hiện tại**: Express/Node TypeScript, chạy qua `server.ts`.
- **Lưu trữ dữ liệu hiện tại**:
  - JSON files trong thư mục `data/`
  - file upload lưu trên ổ đĩa cục bộ trong `uploads/`
- **Triển khai hiện tại**:
  - Có dấu hiệu phục vụ frontend + backend cùng miền hoặc qua `VITE_API_BASE_URL`
  - Chưa theo mô hình mục tiêu Vercel + Supabase + R2
- **Auth hiện tại**:
  - Custom auth ở backend `/api/auth/*`
  - Token tự phát hành từ backend
  - Frontend lưu `auth_token` trong `localStorage`
- **File storage hiện tại**:
  - backend local uploads
  - avatar giáo viên có thể lưu dạng base64 trực tiếp vào hồ sơ user
- **AI integration hiện tại**:
  - Có backend proxy `/api/gemini...`
  - UI mô tả API key AI được giữ ở backend

### Framework / phiên bản / package
- Dự án dùng `vite`, `react`, `typescript`.
- Có backend Express viết bằng TypeScript.
- Cần giữ nguyên framework hiện tại, chưa có lý do bắt buộc phải đổi.

### Cấu trúc thư mục hiện tại
- `src/`: frontend app
- `src/components/`: các màn hình/chức năng chính
- `src/utils/`: utility như API wrapper
- `backend/`: backend Express
- `backend/routes/`: API routes
- `backend/services/`: data/db service
- `backend/models/`: model backend
- `backend/middleware/`: auth, logging, ...
- `data/`: JSON data nghiệp vụ
- `uploads/`: file được upload lên local disk
- `public/`, `assets/`: static assets

### Routes / màn hình / luồng giao diện chính
Frontend đang là **single-page app theo tab nội bộ**, chưa phải router nhiều path:
- Auth screen
- Onboarding screen
- Các tab chính trong app:
  - `manager` → quản lý danh sách lớp học / học sinh
  - `repository` → kho tài liệu
  - `slides` → AI tạo slide bài giảng
  - `tests` → AI tạo đề kiểm tra
  - `classroom_games` → kiểm tra bài cũ / trò chơi lớp học
  - `journal` → sổ đầu bài AI

### Components giao diện chính đã xác định
- `Auth`
- `Onboarding`
- `StudentManager`
- `DocumentRepository`
- `SlideGenerator`
- `AITestCreator`
- `ClassroomGames`
- `ClassJournal`

### API frontend hiện tại
Frontend dùng `apiFetch()` trong `src/utils/api.ts`:
- đọc `VITE_API_BASE_URL`
- tự động gắn `Authorization: Bearer <auth_token>` từ `localStorage`
- gọi backend cũ qua `/api/*`

### Auth hiện tại
Đã xác định từ `src/components/Auth.tsx`, `src/App.tsx`, `backend/routes/auth.ts`:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- session được khôi phục bằng cách đọc `auth_token` trong `localStorage`
- `remember me` đang lưu **email và password** vào `localStorage`
- logout chỉ xóa token local

### Database hiện tại
- Không có DB thật.
- Dữ liệu đang lưu trong JSON files ở `data/`.
- Backend đọc/ghi qua `Database` service.

### Local storage / session storage / mock / JSON data
Đã xác định:
- `localStorage.auth_token`
- `localStorage.remember_email`
- `localStorage.remember_password`
- `localStorage.remember_me`
- `localStorage.eduai_theme_mode`
- `localStorage.eduai_font_scale`
- `localStorage.eduai_thinking_mode`
- dữ liệu JSON ở `data/*.json`
- business data không nên tiếp tục ở JSON/localStorage theo kiến trúc mục tiêu

### Supabase client
- Chưa thấy Supabase client thật trong luồng đang dùng.
- Nếu có code liên quan Supabase cũ thì chưa phải luồng chính.
- Kiến trúc hiện tại **chưa vận hành bằng Supabase Auth / Database**.

### Cloudflare R2
- Chưa có kiến trúc presigned URL chuẩn.
- Hiện tại upload/file storage đang lệ thuộc local disk `uploads/`.
- Có file `env.r2.example`, cho thấy đã có ý định tích hợp R2 nhưng chưa hoàn thiện đúng chuẩn mục tiêu.

### Vercel config
- Chưa xác nhận có `vercel.json` hoạt động đúng mục tiêu.
- Chưa thấy bằng chứng app đã chuẩn hóa cho:
  - frontend deploy Vercel
  - API serverless trên Vercel
  - env tách biệt frontend/server
  - rewrite/proxy chuẩn cho SPA + API

### GitHub workflow
- Chưa thấy workflow CI tối thiểu được xác nhận.
- Repo đã gắn remote GitHub:
  - `origin: https://github.com/buihaivpvp-code/trolyai.git`

### Biến môi trường hiện tại
Đã xác định hoặc suy ra:
- `VITE_API_BASE_URL`
- có file `.env.local`
- có `env.local`
- có `env.r2.example`
- chưa xác nhận chuẩn tách frontend env và server env
- chưa thấy `.env.example` chuẩn cho Supabase/Vercel/R2

### Entity nghiệp vụ đã suy ra từ code
Từ `src/types.ts` và UI hiện tại, hệ thống đang có các nhóm entity:
- `User/Teacher profile`
- `Student`
- `StudentDiaryEntry`
- `ClassJournalEntry`
- `SubjectGradeItem`
- `ConductEvaluation`
- `LessonPlan`
- `SlideItem`
- `ParentMemo`
- `InterventionPlan`
- tài liệu / file repository

## 2. Vấn đề hiện tại

### 2.1 Auth và session
- Auth là hệ thống custom, không dùng Supabase Auth như mục tiêu.
- `auth_token` lưu trong `localStorage`.
- `remember me` đang lưu cả **mật khẩu plaintext** trong `localStorage`.
- Không có `supabase.auth.getSession()` / `onAuthStateChange()` chuẩn.
- Không có một auth provider/store thống nhất theo Supabase.

### 2.2 Data layer
- Dữ liệu nghiệp vụ đang phụ thuộc JSON files cục bộ.
- Không phù hợp deploy serverless/Vercel.
- Chưa có repository/service layer chuẩn giữa UI và nguồn dữ liệu.
- Nguy cơ query / fetch / state business logic rải rác trong component.
- Chưa có schema DB thật và RLS rõ ràng.

### 2.3 File storage
- Upload đang dùng local disk `uploads/`, không phù hợp Vercel.
- Avatar hiện có thể lưu thành base64 trong profile, làm phình dữ liệu và sai trách nhiệm lưu trữ.
- Chưa có presigned upload URL.
- Chưa có metadata file lưu trên DB chuẩn.

### 2.4 Frontend gọi backend cũ
- `src/utils/api.ts` đang gắn token custom và gọi `/api/*`.
- `Auth.tsx` gọi trực tiếp `/api/auth/login`, `/api/auth/register`.
- `App.tsx` gọi `/api/auth/me`, `/api/auth/profile`, `/api/students`.
- UI hiện đang phụ thuộc backend cũ theo cách khá sâu.

### 2.5 Secret / cấu hình
- Có nguy cơ cấu hình env đang lẫn lộn giữa frontend/server.
- Chưa xác nhận có secret nào đang để sai chỗ trong frontend bundle.
- `VITE_API_BASE_URL` đang là nguồn lỗi phổ biến khi backend trả HTML thay vì JSON API.
- Chưa thấy mô hình env chuẩn cho:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `R2_*` server env only

### 2.6 Kiến trúc deploy
- Local JSON + local uploads không tương thích với deploy serverless ổn định.
- Chưa xác nhận build/rewrite/API route trên Vercel.
- Chưa xác nhận CI validate lint/typecheck/test/build.

### 2.7 Khả năng bảo trì
- Logic UI, auth, persistence đang gắn chặt vào component lớn như `App.tsx`.
- `App.tsx` đang kiêm quá nhiều trách nhiệm:
  - session restore
  - route guard
  - teacher profile
  - local preferences
  - upload avatar
  - settings modal
- Cần tách theo nhóm trách nhiệm nhưng không đổi UI.

## 3. Phần cần giữ nguyên

Theo yêu cầu, cần giữ nguyên tối đa:
- Giao diện hiện tại
- Bố cục
- Màu sắc
- Typography
- Animation
- Nội dung hiển thị
- Trải nghiệm người dùng
- Các tab/chức năng:
  - quản lý học sinh
  - kho tài liệu
  - AI tạo slide
  - AI tạo đề kiểm tra
  - kiểm tra bài cũ
  - sổ đầu bài
- Luồng auth hiện nhìn từ UI:
  - đăng ký
  - đăng nhập
  - đăng xuất
  - onboarding
  - hồ sơ giáo viên
- Route/component name hiện tại khi có thể giữ được
- Framework hiện tại: Vite + React + TypeScript

## 4. Phần cần sửa

### Bắt buộc sửa
1. **Auth layer**
   - thay backend auth custom bằng Supabase Auth
   - bỏ lưu token custom trong localStorage
   - bỏ lưu password trong localStorage

2. **Session handling**
   - dùng `supabase.auth.getSession`, `getUser`, `onAuthStateChange`
   - tạo auth provider/store duy nhất

3. **Data persistence**
   - chuyển business data từ JSON/local backend sang Supabase Database
   - tạo service/repository layer thống nhất

4. **File upload**
   - bỏ local uploads
   - chuyển sang R2 qua presigned URL từ Vercel serverless
   - lưu metadata vào Supabase

5. **Environment separation**
   - frontend chỉ giữ `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - serverless giữ `R2_*`
   - không lộ secret ở frontend

6. **API/error normalization**
   - chuẩn hóa loading/success/error
   - tránh raw HTML response trong UI auth
   - thống nhất thông báo lỗi

7. **Deploy/CI**
   - chuẩn hóa Vercel config
   - thêm GitHub Action tối thiểu validate code

## 5. Phần cần thay thế

- Custom auth backend → **Supabase Auth**
- JSON file database → **Supabase Database**
- local disk uploads → **Cloudflare R2**
- token restore bằng `localStorage` → **Supabase session**
- upload avatar base64 trực tiếp trong hồ sơ → **file object lưu R2 + metadata/url**
- fetch auth/backend rải rác → **service layer thống nhất**
- backend API auth cũ → **frontend Supabase auth + serverless APIs tối thiểu cho R2**

## 6. Phần cần xóa

Chỉ xóa sau khi chứng minh không còn dùng:
- backend auth cũ trong `backend/routes/auth.ts`
- middleware auth custom nếu không còn tác dụng
- local JSON persistence cho dữ liệu đã chuyển sang Supabase
- local upload handling cho file/avatar/tài liệu
- `localStorage.remember_password`
- `localStorage.auth_token`
- code avatar base64 nếu đã chuyển R2
- API client cũ phụ thuộc token custom
- env cũ không còn dùng
- package backend cũ không còn reference

## 7. Phần chưa rõ / cần xác minh thêm trước khi đi tiếp

Các mục dưới đây là **điều kiện dừng theo yêu cầu** nếu thiếu:
1. **Supabase project**
   - thiếu `VITE_SUPABASE_URL`
   - thiếu `VITE_SUPABASE_ANON_KEY`

2. **Schema nghiệp vụ thật**
   - hiện mới suy ra từ UI/code
   - chưa đủ chắc để tạo schema chuẩn cho tất cả bảng mà không có nguy cơ đoán sai

3. **Mô hình phân quyền**
   - mới thấy `teacher` và `admin`
   - chưa xác nhận đầy đủ quyền đọc/ghi từng entity
   - chưa xác nhận admin có phạm vi toàn trường, toàn lớp hay toàn hệ thống

4. **R2**
   - chưa biết bucket chính thức
   - chưa biết domain/public base URL
   - chưa biết bucket private hay public
   - chưa có secret/env thật phía server

5. **Migration dữ liệu**
   - chưa biết có cần migrate dữ liệu JSON hiện tại sang Supabase không
   - nếu migrate, cần chiến lược tránh mất dữ liệu

6. **Luồng phụ thuộc backend cũ**
   - một số chức năng AI/tài liệu có thể còn phụ thuộc backend hiện tại ngoài auth
   - cần kiểm kê đầy đủ trước khi xóa

## 8. Rủi ro

### Rủi ro cao
- Mất dữ liệu khi chuyển JSON → Supabase nếu schema đoán sai
- Gãy auth nếu thay toàn bộ quá nhanh
- Gãy upload/file preview khi bỏ local uploads mà chưa có R2 flow hoàn chỉnh
- UI phụ thuộc dữ liệu backend cũ nhiều hơn dự kiến
- role/admin logic chưa rõ có thể làm sai RLS

### Rủi ro trung bình
- `App.tsx` quá lớn, refactor có thể làm lỗi state/UI nếu tách thiếu kiểm soát
- Avatar base64 → R2 có thể làm lệch preview nếu không tương thích UI hiện tại
- Vercel serverless cần chỉnh rewrite/path chính xác để tránh frontend gọi nhầm HTML page

### Rủi ro thấp
- Theme/font/thinking mode trong `localStorage` có thể giữ nguyên vì là preference không nhạy cảm
- Đổi data layer phía sau form nhưng giữ UI thường rủi ro thấp nếu contract ổn định

## 9. Thứ tự thực hiện

### Giai đoạn 1 — Audit
- Hoàn tất báo cáo này
- Không sửa code ứng dụng trước khi chốt audit

### Giai đoạn 2 — Checkpoint
- chạy `git status`
- xác minh working tree
- không đụng `.env`/secret
- tạo commit:
  - `chore: checkpoint before controlled rebuild`

### Giai đoạn 3 — Chuẩn hóa hạ tầng dùng chung
- tạo cấu trúc service/lib/auth/error tối thiểu
- chưa đụng UI hiển thị
- tách các phần dùng chung khỏi `App.tsx` khi cần

### Giai đoạn 4 — Rebuild auth bằng Supabase
- tạo Supabase client duy nhất
- tạo Auth Provider/Store duy nhất
- thay logic form `Auth` nhưng giữ nguyên UI
- thay route guard + session restore
- thay cập nhật profile sang Supabase-backed flow

### Giai đoạn 5 — Rebuild data layer
- xác định entity theo từng feature
- tạo service/repository
- chuyển từng feature từ JSON/backend cũ sang Supabase có kiểm soát
- giữ dữ liệu cũ tạm thời ở nơi chưa rõ schema

### Giai đoạn 6 — Rebuild upload bằng R2
- tạo serverless API presign upload/download
- xác thực Supabase session ở API
- frontend upload trực tiếp lên R2
- lưu metadata vào Supabase

### Giai đoạn 7 — Chuẩn hóa API / error handling
- thống nhất loading/error/retry/unauthorized
- loại bỏ lỗi backend trả HTML thay vì JSON nơi không còn cần backend auth cũ

### Giai đoạn 8 — Vercel
- chuẩn hóa build/output/rewrite/env/API routes

### Giai đoạn 9 — GitHub / CI
- thêm workflow validate tối thiểu:
  - `npm ci`
  - lint
  - typecheck nếu có
  - test nếu có
  - build

### Giai đoạn 10 — Dọn code cũ
- chỉ xóa sau khi search reference, build và xác minh không còn dùng

### Giai đoạn 11 — Kiểm thử tổng thể
- lint
- typecheck
- test
- build
- auth flow
- CRUD data
- upload R2
- deploy flow

### Giai đoạn 12 — Commit nhỏ
- `docs: audit current architecture`
- `refactor: normalize shared infrastructure`
- `refactor: rebuild Supabase authentication`
- `refactor: rebuild Supabase data layer`
- `feat: implement secure Cloudflare R2 upload`
- `chore: normalize Vercel configuration`
- `ci: add validation workflow`
- `chore: remove obsolete code`
- `test: verify rebuilt application`

## 10. Kế hoạch thực hiện ngay sau audit

1. Kiểm tra `git status` để xác định working tree có an toàn không.
2. Nếu working tree sạch hoặc thay đổi có thể bảo toàn:
   - tạo checkpoint commit theo yêu cầu.
3. Sau checkpoint:
   - chuẩn hóa hạ tầng dùng chung trước
   - sau đó mới chuyển auth
   - rồi mới chuyển data layer và upload

## 11. Kết luận audit ban đầu

Dự án hiện tại **chưa phù hợp** với kiến trúc mục tiêu Vercel + Supabase + R2 do đang phụ thuộc:
- auth custom,
- JSON database,
- local uploads,
- localStorage cho token,
- backend monolithic cũ.

Tuy vậy, **giao diện hiện tại hoàn toàn có thể giữ nguyên** nếu chỉ thay phần kiến trúc và tầng dữ liệu phía sau theo từng giai đoạn có kiểm soát.