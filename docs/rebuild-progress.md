# Rebuild Progress

## Giai đoạn 1 — Khảo sát hiện trạng

### Mục tiêu
- Đọc toàn bộ dự án ở mức đủ để xác định:
  - framework
  - cấu trúc thư mục
  - route/component chính
  - auth hiện tại
  - database hiện tại
  - API hiện tại
  - localStorage/mock/JSON data
  - Supabase/R2/Vercel/GitHub workflow
  - lỗi kiến trúc và rủi ro chính
- Tạo báo cáo `docs/rebuild-audit.md`
- Chưa sửa logic ứng dụng trước khi hoàn thành audit

### File đã sửa
- Không có

### File đã tạo
- `docs/rebuild-audit.md`
- `docs/rebuild-progress.md`

### File đã xóa
- Không có

### Lỗi phát hiện
1. Auth đang là custom backend auth
2. `auth_token` lưu ở `localStorage`
3. `remember_password` lưu ở `localStorage`
4. Dữ liệu nghiệp vụ đang lưu bằng JSON trong `data/`
5. File upload đang lưu local trong `uploads/`
6. Frontend gọi backend cũ ở nhiều nơi
7. Chưa có data service thống nhất
8. Error handling đang phân tán
9. Kiến trúc hiện tại chưa phù hợp Vercel serverless + Supabase + R2

### Cách xử lý dự kiến
- Chuyển auth sang Supabase Auth
- Chuyển data layer sang Supabase Database
- Chuyển upload sang Cloudflare R2 qua presigned URL
- Tạo service layer thống nhất
- Chuẩn hóa CI/deploy/error handling theo từng giai đoạn nhỏ

### Lint
- Chưa chạy ở bước tài liệu này

### Typecheck
- Chưa chạy ở bước tài liệu này

### Test
- Chưa chạy ở bước tài liệu này

### Build
- Chưa chạy ở bước tài liệu này

### Commit hash
- Chưa tạo commit cho giai đoạn này

### Ghi chú Git / checkpoint
- `git status --short --branch` cho thấy nhánh `main` đang `ahead 4` so với `origin/main`
- Output hiện tại không hiển thị file modified/untracked
- Cần tạo checkpoint riêng trước khi bắt đầu refactor có kiểm soát

### Việc còn lại
- Tạo checkpoint Git:
  - `chore: checkpoint before controlled rebuild`
- Chuẩn hóa hạ tầng Supabase dùng chung
- Refactor auth
- Refactor data layer
- Refactor upload R2
- Chuẩn hóa Vercel/GitHub Actions
- Dọn code cũ có kiểm soát
- Kiểm tra lint/typecheck/test/build sau từng giai đoạn