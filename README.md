# EduAI deployment: Supabase + Cloudflare R2 + Vercel

## Kiến trúc triển khai

- **Frontend + API runtime:** Vercel
- **Database/Auth:** Supabase
- **File storage:** Cloudflare R2 (S3-compatible)
- **AI provider:** Gemini API

## Trạng thái migration trong code

Project hiện đã có sẵn:
- Supabase client tại `backend/services/supabase.ts`
- Đồng bộ/fallback dữ liệu tại `backend/services/db.ts`
- R2 upload/download tại `backend/services/r2Storage.ts`
- API tài liệu dùng R2 tại `backend/routes/documents.ts`
- Vercel server entry tại `server.ts`
- Vercel routing config tại `vercel.json`

## Biến môi trường cần cấu hình

Dùng `.env.example` làm mẫu.

### Bắt buộc
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `CF_R2_ACCESS_KEY_ID`
- `CF_R2_SECRET_ACCESS_KEY`
- `CF_R2_BUCKET_NAME`

### Khuyến nghị
- `CF_R2_ENDPOINT`
- `CF_R2_ACCOUNT_ID`
- `CF_R2_PUBLIC_BASE_URL`
- `APP_URL`
- `VITE_API_BASE_URL`

## Chạy local

**Prerequisites:** Node.js

1. Cài dependencies:
   ```bash
   npm install
   ```

2. Tạo file môi trường từ mẫu:
   ```bash
   copy .env.example .env.local
   ```

3. Điền biến Supabase, R2 và Gemini vào `.env.local`

4. Chạy app:
   ```bash
   npm run dev
   ```

## Deploy lên Supabase

### 1) Tạo project Supabase
- Tạo project mới trên Supabase
- Lấy:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

### 2) Tạo các bảng dữ liệu
Code hiện tại đọc/ghi các bảng sau nếu Supabase đã cấu hình:

- `students_base`
- `grades`
- `psychological_profiles`
- `semi_boarding_profiles`
- `talent_profiles`
- `attendances`
- `behavior_counts`
- `diaries`
- `monthly_grades`
- `users`
- `journals_base`
- `journal_praises`
- `journal_infractions`

Nếu bảng chưa tồn tại, hệ thống sẽ fallback sang file JSON local cho một số luồng hiện có. Khi deploy production, nên tạo đầy đủ schema trên Supabase để bỏ phụ thuộc filesystem local.

## Deploy file storage lên Cloudflare R2

### 1) Tạo bucket
Tạo bucket R2, ví dụ: `giaovien`

### 2) Tạo API token / access keys
Lấy:
- `CF_R2_ACCESS_KEY_ID`
- `CF_R2_SECRET_ACCESS_KEY`

### 3) Cấu hình endpoint
Một trong hai cách:
- `CF_R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com`
- hoặc endpoint có bucket path nếu bạn đang dùng kiểu cũ

### 4) Optional public URL
Nếu muốn trả link public trực tiếp:
- `CF_R2_PUBLIC_BASE_URL=https://pub-xxx.r2.dev`
- hoặc custom domain

## Deploy lên Vercel

### 1) Import repo vào Vercel
Chọn project từ GitHub repo.

### 2) Khai báo Environment Variables
Thêm toàn bộ biến trong `.env.example` vào Vercel Project Settings.

### 3) Build/Output
Project đã dùng:
- `server.ts` làm server entry
- `vercel.json` để route toàn bộ request vào Express app

Không cần custom output directory cho API.

### 4) Deploy
Vercel sẽ chạy app Node qua `@vercel/node`.

## Lưu ý quan trọng

- `vercel.json` trước đó đang chứa nhầm source code backend. Đã tách lại:
  - code app ở `server.ts`
  - config deploy ở `vercel.json`
- Trên Vercel, filesystem chỉ là tạm thời. Vì vậy upload phải đi qua R2, không dùng `uploads/` local cho production lâu dài.
- Dữ liệu JSON trong `data/` chỉ nên dùng làm seed/fallback local, không nên xem là storage production.
- Nếu frontend và backend cùng domain trên Vercel thì để trống `VITE_API_BASE_URL`.

## Lệnh hữu ích

### Dev
```bash
npm run dev
```

### Type check
```bash
npm run lint
```

### Build
```bash
npm run build