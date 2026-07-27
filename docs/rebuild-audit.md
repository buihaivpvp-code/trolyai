# Rebuild Audit

## 1. Kiến trúc hiện tại

### 1.1 Tổng quan
Dự án hiện tại là một ứng dụng **React 19 + Vite 6 + TypeScript** ở frontend, đi kèm một **server Express chạy từ `server.ts`** để phục vụ API nội bộ và các chức năng backend hiện tại.

Kiến trúc hiện tại đang là mô hình lai:

- **Frontend**: React + Vite
- **Backend hiện tại**: Express (`server.ts`)
- **Build**:
  - Frontend build bằng `vite build`
  - Backend bundle bằng `esbuild` sang `dist/server.cjs`
- **Dev runtime**:
  - `npm run dev` chạy `tsx server.ts`
  - Vite dev server có proxy `/api` sang `http://127.0.0.1:2630`

### 1.2 Package và nền tảng chính
Từ `package.json`:

- `react`: `^19.0.1`
- `react-dom`: `^19.0.1`
- `vite`: `^6.2.3`
- `typescript`: `~5.8.2`
- `express`: `^4.21.2`
- `@supabase/supabase-js`: `^2.110.8`
- `@aws-sdk/client-s3`: `^3.1095.0`
- `@google/genai`: `^2.4.0`

### 1.3 Cấu trúc thư mục hiện tại
Các nhóm thư mục đáng chú ý:

- `src/`: mã nguồn frontend
- `src/components/`: phần lớn UI và logic nghiệp vụ đang nằm chung
- `src/utils/`: tiện ích dùng chung
- `backend/`: tài nguyên và service backend cũ
- `backend/routes/`, `backend/services/`, `backend/models/`, `backend/middleware/`
- `data/`: tập JSON dữ liệu nghiệp vụ cục bộ
- `uploads/`: file upload cục bộ đang được lưu ngay trong project
- `public/`: tài nguyên public
- `assets/`: tài nguyên giao diện

### 1.4 Build và runtime
`vite.config.ts` hiện tại cho thấy:

- alias `@` đang trỏ về root project `"."`, không trỏ riêng vào `src`
- build có **2 entry HTML**:
  - `index.html`
  - `backend/index.html`
- dev server:
  - `allowedHosts: ["trolyaiedu.lananh.one"]`
  - proxy `/api` sang backend cục bộ `127.0.0.1:2630`

Điều này cho thấy frontend hiện vẫn phụ thuộc vào backend cũ cho một phần auth/API.

### 1.5 Auth hiện tại
Dấu hiệu từ mã nguồn cho thấy auth hiện tại **chưa dùng Supabase Auth làm nguồn chân lý**:

- `src/App.tsx`:
  - lưu `auth_token` vào `localStorage`
  - đọc `auth_token` khi khởi động để phục hồi phiên
- `src/utils/api.ts`:
  - tự đọc token từ `localStorage`
  - đính token vào request API
- `src/components/Auth.tsx`:
  - form đăng nhập hiện tại đang gọi backend/API cũ
  - có xử lý lỗi kiểu frontend gọi nhầm HTML thay vì API
- có lưu `remember_email`, `remember_password`, `remember_me` trong `localStorage`

Kết luận: auth hiện tại là **custom token auth qua backend cũ**, không phải Supabase Auth thuần.

### 1.6 Database và dữ liệu nghiệp vụ hiện tại
Hiện chưa thấy Supabase Database được tích hợp thực tế trong luồng runtime.

Dữ liệu nghiệp vụ hiện đang nằm rải rác ở:

- `data/users.json`
- `data/students_base.json`
- `data/attendances.json`
- `data/grades.json`
- `data/diaries.json`
- `data/monthly_grades.json`
- `data/behavior_counts.json`
- `data/journals_base.json`
- `data/journal_infractions.json`
- `data/journal_praises.json`
- `data/psychological_profiles.json`
- `data/semi_boarding_profiles.json`
- `data/talent_profiles.json`
- `data/ai_sample_knowledge.json`

Đây là dấu hiệu hệ thống hiện đang dùng:

- JSON file làm nguồn dữ liệu
- mock/hard-coded data ở một số component
- dữ liệu trình duyệt cho một số tính năng người dùng

### 1.7 Browser storage hiện tại
Các dữ liệu đang lưu trong `localStorage`:

#### Dữ liệu nhạy cảm hoặc nghiệp vụ không nên giữ lâu dài ở client
- `auth_token`
- document repository theo user
- một số dữ liệu đồng bộ giữa các component liên quan tài liệu

#### Dữ liệu UI chấp nhận được nếu tiếp tục giữ
- `eduai_theme_mode`
- `eduai_font_scale`
- `eduai_thinking_mode`

#### Dữ liệu nhớ đăng nhập
- `remember_email`
- `remember_password`
- `remember_me`

Rủi ro lớn nhất là **token auth hiện đang nằm trong localStorage**.

### 1.8 Upload và lưu file hiện tại
Có 2 cơ chế lưu file hiện tại cùng tồn tại:

#### a) Lưu file cục bộ trong project
- thư mục `uploads/` chứa rất nhiều file đã upload

Điều này không phù hợp với deploy Vercel vì:
- filesystem serverless không phải nơi lưu trữ bền vững
- dữ liệu sẽ không ổn định qua deploy/scale instance

#### b) Cloudflare R2 backend-side
`backend/services/r2Storage.ts` cho thấy:
- đang dùng `@aws-sdk/client-s3`
- có `S3Client`, `PutObjectCommand`, `GetObjectCommand`, `HeadObjectCommand`
- env hiện tại dùng prefix:
  - `CF_R2_ENDPOINT`
  - `CF_R2_ACCOUNT_ID`
  - `CF_R2_ACCESS_KEY_ID`
  - `CF_R2_SECRET_ACCESS_KEY`
  - `CF_R2_BUCKET_NAME`
  - `CF_R2_PUBLIC_BASE_URL`

Kiến trúc hiện tại là backend upload trực tiếp lên R2 bằng secret key. Chưa thấy cơ chế presigned URL tách biệt riêng cho frontend.

### 1.9 Supabase hiện tại
- `@supabase/supabase-js` đã được cài trong dependencies
- chưa có bằng chứng rõ ràng về:
  - một Supabase client dùng chung
  - Auth Provider thống nhất
  - route guard dựa trên Supabase session
  - repository/service layer dùng Supabase Database

Kết luận: Supabase hiện tại **có dependency nhưng chưa được triển khai làm hạ tầng chuẩn**.

### 1.10 API hiện tại
Frontend hiện gọi API thông qua `src/utils/api.ts` với:
- `VITE_API_BASE_URL`
- hoặc proxy `/api` trong dev

Điều này cho thấy:
- frontend hiện phụ thuộc vào backend API cũ
- có khả năng production từng gặp lỗi cấu hình URL/API base
- lỗi đã từng được xử lý ở UI: “Máy chủ đang trả về trang web thay vì API...”

### 1.11 Vercel hiện tại
Chưa thấy:
- `vercel.json`
- thư mục `api/` theo convention serverless của Vercel
- cấu hình rewrite/redirect riêng cho SPA + API
- tài liệu biến môi trường production chuẩn cho Vercel

Kết luận: deploy Vercel hiện tại **chưa được chuẩn hóa rõ ràng trong repo**.

### 1.12 GitHub workflow hiện tại
Chưa thấy:
- `.github/workflows/...`

Kết luận: hiện **chưa có CI tối thiểu trong repo** để kiểm tra lint/build/typecheck/test trước khi merge/push.

### 1.13 Quản lý secret và env hiện tại
Đã thấy:

- `.gitignore` chặn `.env*`, chỉ cho phép `.env.example`
- file đang mở trong editor: `.env.local`
- repo có:
  - `env.local`
  - `env.r2.example`

Các vấn đề:
- naming env chưa thống nhất (`env.local` thay vì `.env.example` chuẩn)
- cần rà soát nguy cơ secret nằm sai vị trí
- R2 đang dùng env backend-side nhưng cần chuẩn hóa theo runtime server/serverless
- frontend hiện có phụ thuộc `VITE_API_BASE_URL`
- backend hiện dùng `GEMINI_API_KEY`

## 2. Vấn đề hiện tại

### 2.1 Auth chưa đúng kiến trúc mục tiêu
- dùng token tự quản lý thay vì Supabase Auth session
- lưu `auth_token` trong `localStorage`
- frontend phụ thuộc backend auth/API cũ
- có dấu hiệu song song giữa state user frontend và token backend

### 2.2 Data layer chưa ổn định
- dữ liệu nghiệp vụ đang nằm trong JSON file cục bộ
- component UI và logic dữ liệu đang trộn lẫn
- chưa có service/repository layer thống nhất
- nguy cơ schema ngầm định trong component, khó bảo trì

### 2.3 File storage chưa phù hợp deploy cloud
- đang có `uploads/` cục bộ trong repo/runtime
- không phù hợp với Vercel serverless
- R2 đã có nhưng luồng upload chưa được chuẩn hóa qua presigned URL

### 2.4 Kiến trúc frontend/backend đang lai tạp
- Vite build frontend nhưng vẫn có backend entry riêng
- frontend gọi backend cũ qua `/api`
- chưa tách rõ:
  - frontend public code
  - server-only secret
  - serverless API

### 2.5 Triển khai/CI chưa chuẩn
- chưa thấy GitHub Action
- chưa thấy cấu hình Vercel rõ ràng
- chưa thấy chuẩn deploy pipeline GitHub → Vercel

### 2.6 Có nguy cơ dữ liệu/logic bị trùng lặp
Dấu hiệu hiện có:
- nhiều component cùng đọc/ghi `localStorage`
- document repository được dùng qua nhiều nơi
- auth logic xuất hiện ở `App.tsx`, `Auth.tsx`, `src/utils/api.ts`
- dữ liệu sample/mock xuất hiện trong server và component

### 2.7 Tên và cách dùng script chưa tối ưu đa nền tảng
`package.json` có:
- `"dev:be": "PORT=2630 tsx server.ts"`
- `"clean": "rm -rf dist server.js"`

Các lệnh này không thân thiện Windows CMD nếu chạy trực tiếp.

## 3. Phần cần giữ nguyên

Các phần cần giữ nguyên theo yêu cầu và theo khảo sát hiện trạng:

- giao diện hiện tại
- bố cục hiện tại
- màu sắc hiện tại
- typography hiện tại
- animation hiện tại
- nội dung hiện tại
- trải nghiệm người dùng hiện tại
- route hiện tại
- component hiển thị hiện tại nếu không buộc phải đổi vì kỹ thuật
- framework React + Vite hiện tại
- luồng chức năng hiện tại ở mức hành vi người dùng

Ngoài ra, các khóa `localStorage` thuần UI có thể giữ nếu không chứa dữ liệu nhạy cảm:
- `eduai_theme_mode`
- `eduai_font_scale`
- `eduai_thinking_mode`

## 4. Phần cần sửa

### 4.1 Auth
- thay auth backend cũ bằng Supabase Auth
- tạo một Supabase client duy nhất
- tạo một Auth Provider/Auth Store duy nhất
- bỏ lưu `auth_token` trong `localStorage`
- route guard phải dùng session Supabase
- giữ nguyên form UI, chỉ đổi logic phía sau

### 4.2 Data layer
- gom truy cập dữ liệu về service/repository layer
- ngừng để component gọi dữ liệu rải rác
- chuyển dần dữ liệu nghiệp vụ từ JSON/mock/localStorage sang Supabase Database
- xác định entity/field/quan hệ/quyền truy cập trước khi migrate

### 4.3 Upload
- thay upload cục bộ bằng luồng:
  - frontend
  - serverless API trên Vercel
  - xác thực Supabase session
  - tạo presigned URL
  - upload trực tiếp lên R2
  - lưu metadata vào Supabase

### 4.4 Cấu trúc mã nguồn
- chuẩn hóa dần theo trách nhiệm:
  - `components`
  - `features`
  - `services`
  - `lib`
  - `hooks`
  - `types`
  - `utils`
- chỉ di chuyển file khi giúp giảm trùng lặp hoặc tách UI khỏi data logic

### 4.5 Error handling
- chuẩn hóa loading/success/error/retry
- loại bỏ xử lý lỗi rời rạc ở nhiều component
- thông báo lỗi người dùng phải dễ hiểu và không lộ chi tiết hệ thống

### 4.6 Vercel/GitHub
- thêm cấu hình CI tối thiểu
- chuẩn hóa env
- chuẩn hóa build command và API route/serverless strategy
- tránh frontend gọi nhầm frontend URL như API URL

## 5. Phần cần thay thế

- custom token auth hiện tại → **Supabase Auth**
- JSON/local data cho dữ liệu nghiệp vụ chính → **Supabase Database**
- upload file cục bộ/luồng backend upload trực tiếp chưa chuẩn → **presigned upload qua Vercel serverless + R2**
- API base/config frontend cũ → **cấu hình môi trường rõ ràng theo Vercel**
- auth state rải rác trong `App.tsx`/`api.ts`/component → **Auth layer thống nhất**

## 6. Phần cần xóa

Chưa xóa ngay ở giai đoạn audit. Dự kiến chỉ xóa sau khi đã thay thế an toàn và xác minh reference:

- backend auth cũ nếu chỉ còn phục vụ đăng nhập
- `auth_token` localStorage flow
- document/local repository không còn dùng
- local JSON database không còn là nguồn dữ liệu chính
- duplicate auth logic
- duplicate Supabase client nếu phát sinh
- env cũ không còn sử dụng
- dead code/mock service không còn reference
- package không còn dùng sau refactor
- cơ chế lưu file cục bộ trong `uploads/` cho production flow

## 7. Rủi ro

### 7.1 Rủi ro thiếu thông tin schema nghiệp vụ
Hiện đã thấy nhiều JSON dữ liệu, nhưng **chưa đủ để tự suy luận đầy đủ schema Supabase chuẩn** cho mọi entity và quan hệ.

Nếu không xác định chắc:
- phải ghi TODO rõ
- có thể cần giữ tạm flow cũ ở một số phần
- không được tự phá chức năng

### 7.2 Rủi ro UI phụ thuộc backend cũ chưa lộ hết
Frontend hiện đang gọi `/api` và có auth token flow cũ. Có thể còn nhiều chỗ phụ thuộc backend cũ chưa được khảo sát hết từng file.

### 7.3 Rủi ro mất dữ liệu
- dữ liệu hiện nằm ở JSON cục bộ và uploads cục bộ
- nếu migrate sai có thể mất hoặc lệch dữ liệu
- cần chiến lược bảo toàn và migration có kiểm soát

### 7.4 Rủi ro thiếu thông tin môi trường thực tế
Cần dừng nếu thiếu:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- schema nghiệp vụ
- bucket R2
- domain/public base URL R2
- server-side R2 secrets
- quyền user/admin thực tế

### 7.5 Rủi ro working tree bẩn
Editor đang mở `.env.local` và đang có tab `.git/COMMIT_EDITMSG`. Trước checkpoint bắt buộc phải kiểm tra `git status` và không được ghi đè thay đổi chưa rõ nguồn gốc.

### 7.6 Rủi ro deploy Vercel
- app hiện có backend Express bundle riêng
- cần đánh giá phần nào chuyển sang Vercel serverless, phần nào giữ
- không nên bê nguyên cơ chế server filesystem lên Vercel

## 8. Thứ tự thực hiện

### Giai đoạn 1 — Audit hiện trạng
- hoàn thành tài liệu này
- chưa sửa code ứng dụng

### Giai đoạn 2 — Checkpoint Git
- chạy `git status`
- xác minh working tree
- không commit `.env*` hoặc secret
- tạo commit:
  - `chore: checkpoint before controlled rebuild`

### Giai đoạn 3 — Chuẩn hóa hạ tầng dùng chung
- tạo `docs/rebuild-progress.md`
- chuẩn hóa cấu trúc code ở mức tối thiểu
- gom helper, client, service, type dùng chung
- chưa đụng UI render nếu không cần

### Giai đoạn 4 — Rebuild auth bằng Supabase
- tạo Supabase client duy nhất
- tạo auth provider/store duy nhất
- thay logic form đăng nhập/đăng ký/đăng xuất
- thêm route guard/session restore
- loại bỏ dần token auth localStorage

### Giai đoạn 5 — Rebuild data layer
- audit từng entity từ JSON và code usage
- tạo repository/service layer
- chuyển dần đọc/ghi sang Supabase
- chỉ giữ fallback tạm thời nếu thiếu schema chắc chắn

### Giai đoạn 6 — Rebuild upload bằng R2
- tạo API serverless tạo presigned URL
- frontend upload trực tiếp lên R2
- lưu metadata vào Supabase
- thay thế flow upload cục bộ

### Giai đoạn 7 — Chuẩn hóa API/error handling
- tạo lớp fetch/error chung
- xử lý unauthorized/forbidden/not found/network/validation nhất quán

### Giai đoạn 8 — Chuẩn hóa Vercel
- xác nhận build/output/env
- xử lý SPA route và API route nếu cần
- loại bỏ phụ thuộc localhost trong production

### Giai đoạn 9 — Chuẩn hóa GitHub/CI
- thêm workflow tối thiểu:
  - `npm ci`
  - `lint`
  - `typecheck` nếu có
  - `test` nếu có
  - `build`

### Giai đoạn 10 — Dọn code cũ
- chỉ xóa sau khi đã thay thế và kiểm tra reference
- build lại sau từng đợt dọn

### Giai đoạn 11 — Kiểm tra tổng thể
- `npm run lint`
- `npm run typecheck` nếu có
- `npm run test` nếu có
- `npm run build`

### Giai đoạn 12 — Commit nhỏ theo từng phần
Theo các commit mục tiêu:
1. `docs: audit current architecture`
2. `refactor: normalize shared infrastructure`
3. `refactor: rebuild Supabase authentication`
4. `refactor: rebuild Supabase data layer`
5. `feat: implement secure Cloudflare R2 upload`
6. `chore: normalize Vercel configuration`
7. `ci: add validation workflow`
8. `chore: remove obsolete code`
9. `test: verify rebuilt application`

## 9. Kết luận audit

### Tóm tắt ngắn
Hệ thống hiện tại **chưa đạt kiến trúc mục tiêu** vì:

- auth vẫn đang phụ thuộc backend cũ + `localStorage`
- dữ liệu nghiệp vụ vẫn dựa nhiều vào JSON/local browser state
- file storage còn lưu cục bộ
- Supabase mới chỉ hiện diện ở mức dependency
- deploy/CI/Vercel chưa được chuẩn hóa rõ trong repo

### Hướng tái cấu trúc khả thi
Có thể tái cấu trúc theo hướng **giữ nguyên UI nhưng thay hạ tầng phía sau** nếu thực hiện từng giai đoạn nhỏ, có checkpoint, có build/verify sau mỗi bước.

### Điều kiện cần để đi tiếp an toàn
Trước khi đi sâu vào giai đoạn auth/data/upload, cần xác minh hoặc chuẩn bị:

- Supabase project URL và anon key
- schema dữ liệu nghiệp vụ thật sự cần dùng
- vai trò user/admin và rule phân quyền
- thông tin R2 bucket/public URL/secret server-side
- trạng thái sạch của working tree trước checkpoint