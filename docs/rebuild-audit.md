# Rebuild Audit — EduAI

## 1. Kiến trúc hiện tại

### 1.1 Stack và framework
- **Frontend:** React 19 + Vite 6 + TypeScript
- **Backend hiện tại:** Express 4 chạy từ `server.ts`
- **Build hiện tại:** `vite build` cho frontend + `esbuild` bundle `server.ts`
- **Runtime dev hiện tại:**
  - `npm run dev` → chạy `tsx server.ts`
  - `npm run dev:fe` → Vite dev server cổng `2629`
  - `npm run dev:be` → backend cổng `2630`

### 1.2 Cấu trúc thư mục hiện tại
- `src/` → frontend React
- `src/components/` → phần lớn UI và logic nghiệp vụ đang trộn chung trong component
- `src/utils/api.ts` → wrapper fetch dùng `VITE_API_BASE_URL` và tự gắn Bearer token từ `localStorage`
- `backend/` → middleware, models, routes, services
- `data/` → dữ liệu JSON nội bộ
- `uploads/` → file upload lưu trên local disk
- `public/` / `assets/` → tài nguyên tĩnh
- `server.ts` → entry backend, mount router, xử lý AI, API và backend console

### 1.3 Route / màn hình frontend đang thấy
Từ `src/App.tsx`, giao diện hiện tại có các khu vực chính:
- `manager` → Danh Sách Lớp Học
- `repository` → Kho Tài Liệu
- `slides` → AI Tạo Slide Bài Giảng
- `tests` → AI Tạo Đề Kiểm Tra
- `classroom_games` → Kiểm tra bài cũ
- `journal` → Sổ Đầu Bài AI

Ngoài ra còn có:
- màn hình `Auth`
- màn hình `Onboarding`
- modal hồ sơ giáo viên
- modal cài đặt hệ thống

### 1.4 Auth hiện tại
Auth hiện tại đang phụ thuộc backend cũ:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `PUT /api/auth/profile`

Dấu hiệu kỹ thuật:
- token được lưu ở `localStorage` key `auth_token`
- `src/utils/api.ts` tự lấy token từ `localStorage` và gắn vào header `Authorization`
- `App.tsx` dùng token localStorage để khôi phục session
- `Auth.tsx` truyền `user + token` từ backend vào frontend
- `Onboarding.tsx` và `App.tsx` còn cập nhật token mới từ backend profile API

### 1.5 Database / data layer hiện tại
Hệ thống hiện tại chưa dùng Supabase Database trong frontend đang chạy.

Nguồn dữ liệu hiện tại gồm:
- JSON file trong `data/`
  - `students_base.json`
  - `grades.json`
  - `attendances.json`
  - `behavior_counts.json`
  - `diaries.json`
  - `monthly_grades.json`
  - `psychological_profiles.json`
  - `semi_boarding_profiles.json`
  - `talent_profiles.json`
  - `journal_*`
  - `users.json`
- dữ liệu localStorage cho một số tính năng tài liệu / AI
- dữ liệu runtime backend qua `Database` service
- file upload lưu trên ổ đĩa cục bộ trong `uploads/`

### 1.6 API hiện tại
Các API backend hiện đang được mount trực tiếp trong `server.ts`:
- `/api/auth`
- `/api/students`
- `/api/journal`
- `/api/documents`

Ngoài ra còn có:
- `/api/health`
- `/api/backend` và `/backend` → backend console HTML
- nhiều API AI/gemini xử lý ngay trong `server.ts`

### 1.7 Lưu trữ file hiện tại
Upload hiện tại đang dùng local disk:
- thư mục `uploads/`
- frontend gọi:
  - `/api/documents/upload`
  - `/api/documents/download/:id`

Kiến trúc này **không phù hợp** với deploy Vercel serverless lâu dài vì:
- phụ thuộc filesystem cục bộ
- không phù hợp môi trường ephemeral
- khó scale
- không an toàn cho production multi-instance

### 1.8 Supabase hiện tại
- Package `@supabase/supabase-js` **đã có** trong `package.json`
- Tuy nhiên trong `src/` **chưa có Supabase client**
- Chưa thấy `createClient`, chưa có auth provider/store Supabase
- File env đang có:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Đây là naming không phù hợp với Vite, cần chuẩn hóa sang:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 1.9 Cloudflare R2 hiện tại
- Có package `@aws-sdk/client-s3`
- Có file `env.r2.example`
- Chưa xác nhận được luồng presigned URL hoàn chỉnh từ frontend → serverless → R2
- Upload hiện tại vẫn đang dựa vào backend local upload

### 1.10 Vercel / GitHub / CI hiện tại
- Chưa thấy bằng chứng cấu hình `vercel.json`
- Chưa thấy workflow CI trong khảo sát hiện tại
- Remote GitHub hiện có:
  - `origin: https://github.com/buihaivpvp-code/trolyai.git`
- Build script hiện tại đang bundle cả frontend và Express backend vào `dist/`

## 2. Vấn đề hiện tại

### 2.1 Auth chưa đúng kiến trúc mục tiêu
- đang dùng backend auth cũ
- đang lưu `auth_token` trong `localStorage`
- session restore do frontend tự xử lý
- chưa dùng Supabase Auth session lifecycle chuẩn
- frontend đang tự mang trách nhiệm auth state thay vì một provider/store tập trung

### 2.2 Data layer phân tán và khó bảo trì
- dữ liệu nằm ở nhiều nơi: JSON, localStorage, backend runtime
- component gọi API trực tiếp
- chưa có tầng `services/repositories` thống nhất
- logic UI và logic dữ liệu đang trộn trong nhiều component

### 2.3 Lưu trữ file không phù hợp production
- file upload đang lưu trên local disk
- không phù hợp Vercel
- chưa có kiến trúc presigned upload/download qua R2
- metadata file chưa được tách rõ sang database mục tiêu

### 2.4 Cấu hình môi trường chưa chuẩn
- đang có `NEXT_PUBLIC_*` trong dự án Vite
- dễ gây sai cấu hình runtime frontend
- cần tách rõ env frontend và env server
- cần đảm bảo secret không đi vào `VITE_*`

### 2.5 Browser storage đang chứa dữ liệu không nên giữ lâu dài
Tìm thấy `localStorage` trong nhiều nơi:
- `auth_token`
- `remember_email`
- `remember_password`
- `remember_me`
- theme/font/thinking preferences
- document repository data
- lesson plan related cached documents
- slide repository data
- test creator cache

Rủi ro:
- token auth không nên tự quản thủ công
- password ghi nhớ trong localStorage là rủi ro bảo mật rõ ràng
- dữ liệu nghiệp vụ tài liệu không nên chỉ nằm localStorage nếu cần đồng bộ và production persistence

### 2.6 API contract chưa thống nhất
- nhiều component tự xử lý error
- frontend đang kiểm tra cả trường hợp backend trả HTML thay vì JSON
- có dấu hiệu frontend có thể gọi sai base URL / sai proxy ở vài môi trường
- error handling chưa chuẩn hóa

### 2.7 Scripts và CI chưa rõ ràng
- `lint` hiện tại thực chất là `tsc --noEmit`
- chưa có script `typecheck` riêng
- chưa thấy script `test`
- chưa thấy GitHub Action validation tối thiểu

### 2.8 Backend hiện tại quá lớn
- `server.ts` rất lớn, chứa:
  - router mounting
  - health
  - backend console HTML
  - Gemini integration
  - fallback content generators
  - AI orchestration
- khó bảo trì, khó deploy tối ưu trên Vercel nếu giữ nguyên nguyên khối

## 3. Phần cần giữ nguyên

Các phần cần giữ nguyên theo yêu cầu:
- toàn bộ giao diện hiện tại
- bố cục, màu sắc, typography, animation
- nội dung và trải nghiệm người dùng
- tên tab, route logic theo UI hiện có
- luồng đăng nhập / đăng ký / onboarding / dashboard ở cấp độ UX
- các chức năng chính:
  - quản lý học sinh
  - kho tài liệu
  - tạo slide AI
  - tạo đề AI
  - classroom games
  - sổ đầu bài
  - hồ sơ giáo viên
  - cài đặt

Các phần lưu localStorage cho preference UI có thể được giữ tạm:
- theme mode
- font scale
- thinking mode

## 4. Phần cần sửa

### 4.1 Auth
- thay auth backend cũ bằng Supabase Auth
- tạo một Supabase client duy nhất
- tạo một Auth Provider / Store duy nhất
- thay `localStorage auth_token` bằng session Supabase
- giữ nguyên UI `Auth.tsx`, chỉ thay logic phía sau

### 4.2 Data layer
- gom query/IO vào service layer
- giảm việc component gọi API trực tiếp
- chuẩn hóa flow:
  - UI
  - hook/feature service
  - data service
  - Supabase / serverless API

### 4.3 Env
- đổi frontend env sang `VITE_*`
- tách env frontend/server rõ ràng
- cập nhật `.env.example`
- không đưa secret vào frontend

### 4.4 Upload
- thay upload local disk bằng R2 presigned URL
- dùng serverless API trên Vercel để sinh URL
- lưu metadata file vào Supabase

### 4.5 Error handling
- tạo cơ chế thống nhất cho loading/success/error
- tránh để component tự parse lỗi mỗi nơi một kiểu

### 4.6 Build/CI
- chuẩn hóa scripts:
  - lint
  - typecheck
  - test (nếu có)
  - build
- thêm GitHub Action validation tối thiểu

## 5. Phần cần thay thế

Các phần nên được thay thế có kiểm soát:
1. **Auth token localStorage** → Supabase session
2. **Backend auth routes cho frontend auth** → Supabase Auth flow
3. **Upload local filesystem** → R2 presigned upload/download
4. **Document persistence trong localStorage** → Supabase tables + metadata
5. **NEXT_PUBLIC_* env trong Vite app** → `VITE_*`
6. **Component-level API access phân tán** → shared service/repository layer

## 6. Phần cần xóa

Chỉ xóa sau khi chứng minh không còn dùng:
- backend auth cũ phục vụ login/register/me/profile
- duplicate auth/token handling trong frontend
- `auth_token` localStorage flow
- remember password localStorage
- local upload flow phụ thuộc `uploads/`
- mock/local document persistence nếu đã chuyển ổn định sang Supabase
- env cũ không còn sử dụng
- dead code / duplicate helper / duplicate service

## 7. Rủi ro

### 7.1 Rủi ro thiếu thông tin nghiệp vụ
Hiện chưa đủ thông tin chắc chắn về:
- schema Supabase mục tiêu
- mapping đầy đủ giữa JSON hiện tại và entity database
- phân quyền user/admin thực tế
- cấu trúc bucket R2
- domain/public access policy của R2

### 7.2 Rủi ro mất dữ liệu
- migrate từ JSON/localStorage sang database nếu làm vội có thể mất dữ liệu
- upload đang nằm trong `uploads/`, nếu chuyển storage mà không có chiến lược migration sẽ mất liên kết file

### 7.3 Rủi ro phụ thuộc backend cũ ẩn
- nhiều component đang gọi `/api/*`
- có thể một số luồng business đang phụ thuộc backend cũ nhiều hơn auth
- không được xóa backend cũ hàng loạt trước khi xác định từng dependency

### 7.4 Rủi ro production env
- thiếu hoặc sai Supabase URL / anon key
- thiếu R2 account/bucket/domain
- secret có thể đang nằm sai vị trí hoặc chưa cấu hình server-only

### 7.5 Rủi ro deploy
- Vercel serverless không phù hợp lưu file local
- nếu giữ nguyên `server.ts` monolith có thể khó tách API route sạch sẽ

## 8. Thứ tự thực hiện

### Giai đoạn A — Audit và checkpoint
1. Hoàn tất audit
2. Kiểm tra `git status`
3. Nếu working tree sạch hoặc kiểm soát được, tạo checkpoint commit:
   - `chore: checkpoint before controlled rebuild`

### Giai đoạn B — Chuẩn hóa hạ tầng dùng chung
1. Chuẩn hóa cấu trúc `src/` theo trách nhiệm, không di chuyển hình thức
2. Tạo shared:
   - `lib/`
   - `services/`
   - `contexts/` hoặc `stores/`
   - `types/` nếu cần tách thêm
3. Tách API/error/auth utilities

### Giai đoạn C — Rebuild auth bằng Supabase
1. Tạo Supabase client duy nhất
2. Tạo Auth Provider/Store
3. Thay logic `Auth.tsx`, `App.tsx`, `Onboarding.tsx`, `api.ts`
4. Giữ nguyên UI
5. Build kiểm tra

### Giai đoạn D — Rebuild data layer
1. Audit từng entity đang dùng
2. Xác định phần nào tạm giữ backend cũ, phần nào chuyển Supabase
3. Tạo services/repositories thống nhất
4. Giảm Supabase/API call rải rác trong component
5. Build kiểm tra

### Giai đoạn E — Rebuild upload bằng R2
1. Tạo serverless API presigned upload/download
2. Xác thực session Supabase ở server
3. Upload trực tiếp từ frontend lên R2
4. Lưu metadata vào Supabase
5. Build kiểm tra

### Giai đoạn F — Vercel / CI / cleanup
1. Chuẩn hóa env example
2. Kiểm tra build target Vercel
3. Thêm workflow validation
4. Xóa code cũ đã chứng minh không dùng
5. Lint / typecheck / build / test

## 9. Kết luận audit ban đầu

Dự án **không cần đổi framework**. Hướng tái cấu trúc phù hợp nhất là:
- giữ nguyên React + Vite
- loại bỏ auth backend cũ cho frontend auth
- dùng Supabase Auth + Supabase Database
- dùng Cloudflare R2 cho file
- giữ giao diện hiện tại
- chuyển đổi từng phần có kiểm soát
- không xóa toàn bộ backend ngay lập tức

## 10. Các blocker hiện tại cần theo dõi trong quá trình triển khai

Nếu gặp một trong các điều kiện sau thì phải dừng để báo cáo:
- thiếu `VITE_SUPABASE_URL`
- thiếu `VITE_SUPABASE_ANON_KEY`
- chưa có schema nghiệp vụ rõ ràng
- chưa có thông tin bucket/domain/secret R2
- chưa rõ quyền user/admin
- phát hiện working tree có thay đổi không xác định
- migration có nguy cơ phá dữ liệu hiện có