# Rebuild Progress

## Giai đoạn 1 — Khảo sát hiện trạng

### Mục tiêu
- Đọc toàn bộ dự án ở mức kiến trúc và luồng chính
- Xác định framework, cấu trúc thư mục, auth, data layer, upload, env, deploy
- Tạo báo cáo audit trước khi sửa code

### File đã sửa
- Không sửa file code ứng dụng trong giai đoạn này

### File đã tạo
- `docs/rebuild-audit.md`
- `docs/rebuild-progress.md`

### File đã xóa
- Không có

### Lỗi phát hiện
- Working tree đang có thay đổi chưa được checkpoint:
  - `data/users.json`
  - `src/App.tsx`
  - `src/components/BackendDashboard.tsx`
  - `src/utils/api.ts`
- Auth hiện tại vẫn dùng backend cũ + `localStorage`
- Dữ liệu nghiệp vụ đang dựa nhiều vào JSON cục bộ
- Upload hiện còn phụ thuộc `uploads/` cục bộ và backend-side R2 flow
- Chưa thấy GitHub Actions workflow
- Chưa thấy cấu hình Vercel chuẩn hóa rõ trong repo
- Chưa đủ thông tin chắc chắn về schema Supabase và quyền user/admin
- Bundle frontend lớn khi build production:
  - `dist/assets/main-D_q8p9pJ.js` khoảng `1.88 MB`

### Cách xử lý
- Đã tạo `docs/rebuild-audit.md` để chốt hiện trạng, rủi ro và thứ tự thực hiện
- Đã dừng trước checkpoint/refactor theo nguyên tắc an toàn
- Đã giữ nguyên working tree hiện tại theo chỉ đạo của người dùng
- Chưa sửa code ứng dụng khi chưa có checkpoint an toàn

### Lint
- `npm run lint` → pass (`EXIT_CODE:0`)

### Typecheck
- Hiện script `lint` đang chạy `tsc --noEmit`
- Kết quả hiện tại: pass

### Test
- Chưa thấy script `test` trong `package.json`
- Chưa chạy test tự động

### Build
- `npm run build` → pass (`EXIT_CODE:0`)
- Có cảnh báo chunk lớn từ Vite nhưng không chặn build

### Commit hash
- HEAD hiện tại khi bắt đầu audit:
  - `f6ab47d24591fc85f4cc6b06a275e82c9bbfbd9d`

### Việc còn lại
1. Xử lý chiến lược an toàn cho working tree hiện tại
2. Tạo checkpoint Git trước khi sửa code ứng dụng
3. Chuẩn hóa hạ tầng dùng chung
4. Rebuild Supabase authentication
5. Rebuild Supabase data layer
6. Rebuild upload với Cloudflare R2
7. Chuẩn hóa API và error handling
8. Chuẩn hóa Vercel
9. Thêm GitHub Actions workflow
10. Dọn code cũ và xác minh toàn hệ thống

---

## Giai đoạn 2 — Checkpoint Git

### Trạng thái
- Chưa thực hiện

### Lý do chưa thực hiện
- Working tree đang có thay đổi chưa được checkpoint riêng
- Theo nguyên tắc an toàn, không được tự ghi đè hoặc gom commit khi chưa xác minh nguồn gốc các thay đổi đó

### Điều kiện để bắt đầu
- Xác nhận cách xử lý các file modified hiện tại
- Sau đó mới tạo commit:
  - `chore: checkpoint before controlled rebuild`