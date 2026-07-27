# Rebuild Progress

## Giai đoạn
- Giai đoạn 1 — Khảo sát hiện trạng
- Trạng thái hiện tại: **Tạm dừng có kiểm soát trước khi refactor**

## Mục tiêu
- Đọc toàn bộ dự án ở mức kiến trúc
- Xác định hiện trạng frontend, backend, auth, data, upload, deploy
- Tạo báo cáo audit trước khi sửa code
- Xác định có đủ điều kiện để tiếp tục rebuild hay không

## File đã sửa
- `docs/rebuild-audit.md`

## File đã tạo
- `docs/rebuild-audit.md`
- `docs/rebuild-progress.md`

## File đã xóa
- Không có

## Lỗi phát hiện
1. Auth hiện tại là auth custom backend, không phải Supabase Auth
2. `auth_token` đang lưu trong `localStorage`
3. `remember_password` đang lưu plaintext password trong `localStorage`
4. Dữ liệu nghiệp vụ đang nằm trong JSON local
5. Upload đang ghi vào local disk `uploads/`, không phù hợp Vercel serverless
6. Frontend đang phụ thuộc backend cũ qua `VITE_API_BASE_URL` và `/api/*`
7. Chưa có đủ thông tin để xây lại an toàn:
   - thiếu `VITE_SUPABASE_URL`
   - thiếu `VITE_SUPABASE_ANON_KEY`
   - thiếu schema nghiệp vụ chính thức
   - thiếu mô hình quyền user/admin rõ ràng
   - thiếu cấu hình Cloudflare R2 chính thức

## Cách xử lý
- Hoàn tất audit và ghi rõ rủi ro trong `docs/rebuild-audit.md`
- Không sửa code ứng dụng
- Dừng theo đúng điều kiện dừng do thiếu thông tin bắt buộc
- Chỉ chuẩn bị checkpoint + tài liệu

## Trạng thái kiểm tra
- **lint**: chưa chạy trong giai đoạn tạm dừng này
- **typecheck**: chưa chạy trong giai đoạn tạm dừng này
- **test**: chưa chạy trong giai đoạn tạm dừng này
- **build**: chưa chạy trong giai đoạn tạm dừng này

## Git / Working tree
- Nhánh hiện tại: `main`
- Trạng thái trước checkpoint:
  - `main...origin/main [ahead 3]`
  - thay đổi hiện thấy: `M docs/rebuild-audit.md`
- Thay đổi hiện tại có nguồn gốc rõ ràng và có thể bảo toàn

## Commit hash
- Chưa tạo checkpoint ở thời điểm ghi tài liệu này

## Việc còn lại
1. Tạo checkpoint:
   - `chore: checkpoint before controlled rebuild`
2. Chờ người dùng cung cấp:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - schema nghiệp vụ chính thức / mapping entity
   - mô hình quyền teacher/admin
   - cấu hình R2: bucket, access model, domain/base URL
3. Sau khi đủ thông tin mới tiếp tục:
   - chuẩn hóa hạ tầng dùng chung
   - rebuild auth bằng Supabase
   - rebuild data layer
   - rebuild upload R2
   - chuẩn hóa Vercel / GitHub CI