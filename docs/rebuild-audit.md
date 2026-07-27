# Rebuild Audit — EduAI

## 1) Kiến trúc hiện tại

### Tổng quan stack
- **Frontend**: React 19 + Vite 6 + TypeScript.
- **Backend hiện tại**: Express chạy qua `tsx server.ts`, bundle production bằng `esbuild`.
- **Build hiện tại**:
  - Frontend build bằng `vite build`
  - Backend build bằng `esbuild server.ts --bundle ... --outfile=dist/server.cjs`
- **Runtime hiện tại**:
  - Một tiến trình Node/Express phục vụ API.
  - Frontend Vite và backend Express đang được ghép trong cùng dự án.
- **Thư viện đáng chú ý**:
  - `@supabase/supabase-js` đã được cài nhưng **chưa thấy được dùng trong luồng chính đã khảo sát**.
  - `@aws-sdk/client-s3` đã được cài nhưng **chưa thấy kiến trúc upload R2 an toàn hoàn chỉnh trong phần đã khảo sát**.
  - `@google/genai` dùng cho Gemini phía server.
  - `express`, `jose`, `mammoth`, `pptxgenjs`, `xlsx`.

### Cấu trúc thư mục hiện tại
- `src/`: frontend React.
- `src/components/`: component UI chính.
- `src/utils/`: tiện ích frontend, có `api.ts`.
- `backend/`: router, middleware, model/service cho backend Express.
- `data/`: dữ liệu nghiệp vụ lưu bằng JSON file.
- `uploads/`: file upload lưu trực tiếp trên ổ đĩa cục bộ.
- `public/`: static asset công khai.
- `server.ts`: entry backend/server hiện tại.
- `assets/`: asset dự án.

### Điều hướng / route frontend hiện tại
- Chưa thấy dùng `react-router`.
- `src/App.tsx` đang dùng **tab state nội bộ**:
  - `manager`
  - `repository`
  - `slides`
  - `tests`
  - `classroom_games`
  - `journal`
- Nghĩa là “route” hiện tại chủ yếu là **UI tab trong một màn hình**, không phải URL route truyền thống.

### API hiện tại
Từ `server.ts` đã xác nhận các nhóm API:
- `/api/auth`
- `/api/students`
- `/api/journal`
- `/api/documents`
- `/api/health`

Ngoài ra còn có:
- `/backend`
- `/api/backend`

Đây là trang console backend HTML riêng, không phải API JSON thuần.

### Auth hiện tại
Đã xác nhận từ `backend/routes/auth.ts` và `src/App.tsx`:

- Đăng ký: `POST /api/auth/register`
- Đăng nhập: `POST /api/auth/login`
- Lấy user hiện tại: `GET /api/auth/me`
- Cập nhật hồ sơ: `PUT /api/auth/profile`

Cách hoạt động hiện tại:
- Backend tự hash password.
- Backend tự generate token riêng.
- Frontend lưu token vào `localStorage` với key:
  - `auth_token`
- Frontend tự gắn `Authorization: Bearer ...` qua `src/utils/api.ts`.

### Dữ liệu nghiệp vụ hiện tại
Dữ liệu đang lưu bằng file JSON trong `data/`, gồm:
- `students_base.json`
- `grades.json`
- `attendances.json`
- `behavior_counts.json`
- `diaries.json`
- `journal_infractions.json`
- `journal_praises.json`
- `journals_base.json`
- `monthly_grades.json`
- `psychological_profiles.json`
- `semi_boarding_profiles.json`
- `talent_profiles.json`
- `users.json`
- `ai_sample_knowledge.json`

=> Đây là dấu hiệu rõ ràng của **file-based database / mock persistence**, không phù hợp mục tiêu production với Supabase Database.

### Lưu trữ file hiện tại
- File tài liệu đang lưu trực tiếp trong thư mục `uploads/`.
- `server.ts` tạo thư mục `uploads/` trên local filesystem nếu chưa tồn tại.
- Console backend cũng đang liệt kê trực tiếp file trong `uploads/`.

=> Cách này **không phù hợp cho Vercel production** vì filesystem không bền vững theo mô hình serverless.

### Biến môi trường hiện tại đã quan sát
- `GEMINI_API_KEY`
- `PORT`
- `VITE_API_BASE_URL`
- Có file:
  - `.env.local`
  - `env.local`
  - `env.r2.example`

Chưa xác minh đầy đủ toàn bộ biến môi trường thực tế vì chưa đọc toàn bộ file env, và không nên đưa secret thật vào báo cáo.

### Vercel / GitHub / CI
- Chưa thấy file `vercel.json` trong root hiện tại.
- Chưa thấy thư mục `.github/workflows/` trong danh sách file hiện có.
- Đã phát hiện remote GitHub:
  - `origin: https://github.com/buihaivpvp-code/trolyai.git`

=> Nhiều khả năng hiện tại chưa có pipeline CI chuẩn hóa hoặc chưa cấu hình deploy tối ưu theo mục tiêu mới.

---

## 2) Vấn đề hiện tại

### 2.1 Auth chưa đúng kiến trúc mục tiêu
- Đang dùng backend auth tự xây.
- Token đang lưu trong `localStorage`.
- Frontend tự quản access token.
- Chưa dùng Supabase Auth làm nguồn sự thật duy nhất.
- `PUT /api/auth/profile` hiện còn trả token mới để frontend lưu lại.

### 2.2 Dữ liệu đang lưu bằng JSON file
- `data/*.json` đang đóng vai trò database nghiệp vụ.
- Không có transaction, migration rõ ràng, audit trail, indexing, quan hệ dữ liệu chuẩn.
- Khó scale, khó đồng bộ, dễ phát sinh sai lệch dữ liệu.

### 2.3 File upload đang phụ thuộc local filesystem
- File lưu vào `uploads/`.
- Không phù hợp Vercel serverless.
- Không phù hợp kiến trúc lưu trữ cloud bền vững như Cloudflare R2.

### 2.4 Frontend đang phụ thuộc backend cũ
- `src/App.tsx` gọi:
  - `/api/auth/me`
  - `/api/auth/profile`
  - `/api/students`
- `src/utils/api.ts` tự gắn Bearer token cho mọi request.
- Điều này cho thấy UI đang gắn chặt với backend auth cũ.

### 2.5 Dữ liệu nhạy cảm và trạng thái nghiệp vụ đang ở phía trình duyệt
- `auth_token` đang nằm trong `localStorage`.
- Avatar đang bị nén thành **base64** và đẩy vào profile payload.
- Một số setting UI cũng lưu `localStorage`:
  - `eduai_theme_mode`
  - `eduai_font_scale`
  - `eduai_thinking_mode`

Lưu ý:
- Setting UI thuần cá nhân có thể chấp nhận lưu localStorage.
- Nhưng token xác thực và dữ liệu ảnh dạng base64 trong profile là hướng không nên giữ.

### 2.6 Backend hiện tại không phù hợp trực tiếp với mục tiêu Vercel đơn giản
- Dự án đang dựa vào một `server.ts` lớn, gom nhiều trách nhiệm:
  - API auth
  - API dữ liệu
  - file upload
  - health
  - backend console HTML
  - AI Gemini orchestration
- Mô hình này không khớp tốt với hướng:
  - frontend deploy Vercel
  - serverless API tối thiểu
  - Supabase Auth + Database
  - R2 upload qua presigned URL

### 2.7 Kiến trúc trộn UI, business data và server concern
- Frontend đang có phần xử lý avatar file, base64, đồng bộ token.
- Backend đang vừa là auth server, data server, file server, AI broker, admin console.
- Chưa có ranh giới service/data layer rõ ràng.

### 2.8 Có dấu hiệu code/kiến trúc dư thừa hoặc chưa đồng nhất
- Có `@supabase/supabase-js` trong dependencies nhưng chưa thấy integration chuẩn trong phần đã khảo sát.
- Có `@aws-sdk/client-s3` nhưng chưa thấy upload flow R2 an toàn hoàn chỉnh trong phần đã khảo sát.
- Có cả `env.local` và `.env.local`, cần rà lại trách nhiệm và nguy cơ nhầm cấu hình.
- Script `lint` hiện chỉ là `tsc --noEmit`, chưa có ESLint riêng.

### 2.9 Console backend HTML không cần cho kiến trúc mục tiêu
- `/backend` và `/api/backend` đang render HTML quản trị trực tiếp.
- Đây có thể là phần hỗ trợ kiểm tra tạm thời, nhưng không phù hợp mục tiêu backend tối giản cho Vercel + Supabase.

---

## 3) Phần cần giữ nguyên

Theo yêu cầu, các phần sau cần ưu tiên giữ nguyên:

### UI/UX
- Giao diện hiện tại.
- Bố cục hiện tại.
- Màu sắc.
- Typography.
- Animation.
- Nội dung text.
- Trải nghiệm người dùng hiện tại.
- Tên tab/chức năng hiện có.

### Luồng nghiệp vụ người dùng
- Đăng ký / đăng nhập / đăng xuất.
- Onboarding giáo viên.
- Quản lý hồ sơ giáo viên.
- Danh sách lớp học.
- Kho tài liệu.
- AI tạo slide.
- AI tạo đề kiểm tra.
- Kiểm tra bài cũ.
- Sổ đầu bài AI.

### Naming có nguy cơ ảnh hưởng UI
- Không đổi tùy tiện:
  - tên component
  - tên tab
  - route API nếu UI đang phụ thuộc trực tiếp
  - tên field đã được UI consume

---

## 4) Phần cần sửa

### Auth
- Thay backend auth tự xây bằng **Supabase Auth**.
- Xóa luồng lưu `auth_token` ở frontend.
- Dùng một Supabase client duy nhất.
- Dùng một Auth Provider/store duy nhất.
- Khôi phục session qua Supabase thay vì localStorage thủ công.

### Data layer
- Tách UI khỏi cách truy cập data.
- Tạo `services/` hoặc `features/.../services` thống nhất.
- Không để query/HTTP/Supabase gọi rải rác trong component.

### Upload
- Thay upload local filesystem bằng:
  - frontend
  - gọi API serverless
  - xác thực session Supabase
  - tạo presigned URL
  - upload thẳng lên R2
  - lưu metadata vào Supabase

### Error handling
- Chuẩn hóa error/loading/success/retry.
- Không để mỗi component xử lý lỗi theo kiểu riêng.

### Cấu hình
- Chuẩn hóa env:
  - frontend public env
  - server secret env
- Tách rõ biến VITE_* và biến secret server.

### Runtime / Deploy
- Điều chỉnh kiến trúc để tương thích tốt với Vercel.
- Giảm phụ thuộc vào server Express stateful/local disk.

---

## 5) Phần cần thay thế

### Cần thay thế hoàn toàn hoặc gần hoàn toàn
1. **Backend auth cũ**
   - Thay bằng Supabase Auth.

2. **JSON database nghiệp vụ**
   - Thay bằng Supabase Database theo từng entity.

3. **Upload local filesystem**
   - Thay bằng Cloudflare R2.

4. **Token handling trong frontend**
   - Thay bằng session handling của Supabase client.

5. **Data access rải rác**
   - Thay bằng service/repository layer có cấu trúc.

6. **API phụ thuộc server Express monolith**
   - Thay phần tối thiểu cần thiết bằng Vercel serverless API cho presign/upload hoặc bridge logic cần secret.

---

## 6) Phần cần xóa

Chưa xóa ngay trong giai đoạn audit. Dự kiến các nhóm có thể xóa sau khi đã thay thế an toàn:

- Backend auth cũ (`/api/auth/...`) sau khi Supabase Auth hoạt động ổn định.
- Luồng lưu `auth_token` trong localStorage.
- Phần regenerate token sau update profile.
- Local JSON database khi entity tương ứng đã được chuyển sang Supabase.
- `uploads/` local storage flow.
- Console `/backend` nếu không còn cần.
- Service/helper/client cũ không còn reference.
- Package dư thừa sau khi hoàn tất chuyển đổi.

**Nguyên tắc**: chỉ xóa sau khi:
- đã tìm hết reference;
- đã build;
- đã test luồng tương ứng;
- đã ghi vào progress report.

---

## 7) Rủi ro

### Rủi ro 1 — Chưa biết schema nghiệp vụ chuẩn
Hiện đã thấy nhiều file JSON nghiệp vụ, nhưng:
- chưa thống kê đầy đủ field của từng entity;
- chưa xác minh quan hệ giữa các bảng;
- chưa xác minh quyền user/admin chi tiết.

=> Nếu chuyển database quá sớm có thể làm hỏng dữ liệu hoặc sai quyền.

### Rủi ro 2 — UI phụ thuộc backend cũ ở nhiều điểm
`src/App.tsx` đã xác nhận phụ thuộc auth/profile/student API cũ.
Các component khác rất có thể còn gọi trực tiếp API/backend hoặc dùng data cũ.

=> Cần khảo sát theo từng feature trước khi bóc tách.

### Rủi ro 3 — Dữ liệu file và metadata có thể đang gắn chặt
Tài liệu trong `uploads/` có thể đang liên kết với dữ liệu trong JSON/backend route.
Nếu chuyển R2 không có mapping metadata rõ ràng sẽ dễ mất liên kết tải file.

### Rủi ro 4 — Avatar đang lưu base64
Nếu hiện tại avatar được nhúng trực tiếp vào dữ liệu user:
- có thể dữ liệu user đã chứa blob lớn;
- có thể cần strategy migration sang file object URL/R2.

### Rủi ro 5 — Vercel không phù hợp với filesystem local
Nếu giữ logic hiện tại:
- upload local file sẽ không bền;
- runtime Express monolith sẽ khó deploy ổn định theo mục tiêu.

### Rủi ro 6 — Secret/config có thể đang đặt sai vị trí
Có file env đang mở trong VS Code.
Chưa xác minh toàn bộ biến nào đang để phía frontend/server.
Cần rà kỹ để tránh lộ secret trong `VITE_*` hoặc repo.

### Rủi ro 7 — Chưa có checkpoint trạng thái sạch
Chưa chạy `git status` trong giai đoạn này.
Nếu working tree đang có thay đổi chưa rõ nguồn gốc thì phải dừng ở giai đoạn checkpoint theo yêu cầu.

---

## 8) Thứ tự thực hiện

### Giai đoạn 1 — Audit hiện trạng
- Hoàn tất tài liệu audit này.
- Chưa sửa code ứng dụng.

### Giai đoạn 2 — Checkpoint Git an toàn
- Chạy `git status`.
- Xác minh không commit `.env`, secret.
- Nếu working tree sạch hoặc an toàn:
  - tạo commit: `chore: checkpoint before controlled rebuild`
- Nếu có thay đổi không rõ nguồn gốc:
  - ghi nhận trong `docs/rebuild-progress.md`
  - dừng trước khi can thiệp.

### Giai đoạn 3 — Chuẩn hóa hạ tầng dùng chung
- Tạo cấu trúc thư mục hợp lý hơn nhưng không di chuyển bừa bãi.
- Ưu tiên:
  - `services/`
  - `lib/`
  - `contexts/`
  - `types/`
  - `utils/`
- Không đổi UI.

### Giai đoạn 4 — Rebuild auth với Supabase
- Tạo Supabase client duy nhất.
- Tạo Auth Provider/store duy nhất.
- Thay logic form auth hiện tại nhưng giữ nguyên UI.
- Thay guard và session restore.
- Loại bỏ localStorage token auth.

### Giai đoạn 5 — Rebuild data layer
- Khảo sát từng entity từ JSON/API hiện tại.
- Tạo service layer thống nhất.
- Chuyển dần từng feature sang service mới.
- Chưa xóa dữ liệu cũ nếu chưa đủ schema.

### Giai đoạn 6 — Rebuild upload với R2
- Tạo API serverless presign.
- Thêm frontend upload service.
- Lưu metadata vào Supabase.
- Chuyển dần feature document/avatar nếu phù hợp.

### Giai đoạn 7 — Chuẩn hóa API và error handling
- Tạo response/error strategy thống nhất.
- Chống hiển thị raw HTML response trong UI.
- Chuẩn hóa thông báo tiếng Việt.

### Giai đoạn 8 — Vercel
- Chuẩn hóa build/output/env/rewrite/API path.
- Chỉ thêm `vercel.json` nếu thực sự cần.

### Giai đoạn 9 — GitHub/CI
- Thêm workflow validate tối thiểu:
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck` nếu tách script
  - `npm run test` nếu có
  - `npm run build`

### Giai đoạn 10 — Dọn code cũ
- Xóa có kiểm soát.
- Mỗi phần xóa phải có chứng cứ không còn dùng.

### Giai đoạn 11 — Kiểm tra tổng thể
- lint
- typecheck
- test
- build
- kiểm thử các luồng auth/data/upload/deploy

### Giai đoạn 12 — Commit nhỏ theo mốc
- `docs: audit current architecture`
- `refactor: normalize shared infrastructure`
- `refactor: rebuild Supabase authentication`
- `refactor: rebuild Supabase data layer`
- `feat: implement secure Cloudflare R2 upload`
- `chore: normalize Vercel configuration`
- `ci: add validation workflow`
- `chore: remove obsolete code`
- `test: verify rebuilt application`

---

## 9) Kết luận audit

### Kết luận chính
Dự án hiện tại **không phải là sai hoàn toàn**, nhưng đang vận hành theo mô hình:
- frontend React/Vite
- backend Express riêng
- auth tự xây
- database JSON file
- upload local disk

Mô hình này **không đáp ứng tốt** mục tiêu:
- Vercel frontend/serverless
- Supabase Auth
- Supabase Database
- Cloudflare R2
- bảo mật secret đúng chỗ
- khả năng bảo trì lâu dài

### Hướng tái cấu trúc phù hợp
- **Không đập đi làm lại UI**.
- **Không thay framework frontend**.
- **Giữ nguyên trải nghiệm**.
- **Chỉ thay hạ tầng kỹ thuật phía sau**:
  - auth
  - data persistence
  - upload
  - env/deploy
  - error handling
  - service boundaries

### Điều kiện cần xác minh trước khi đi tiếp
- `git status`
- schema nghiệp vụ thực tế của từng feature
- env hiện có và secret placement
- feature nào đang phụ thuộc backend cũ nhiều nhất
- bucket/domain/thông số R2
- Supabase URL / anon key / schema / RLS requirement thực tế