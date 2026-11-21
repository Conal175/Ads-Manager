# Kiểm tra triển khai AdsPulse OS

## Trạng thái hiện tại

- Supabase `Adsmanager` đã được khởi tạo 16 bảng trong schema `public` và bật RLS, không có dữ liệu mẫu. Vercel `ads_manager` đã liên kết repository này; `DATABASE_URL` đã được cấu hình cho production, preview và development. Deployment cũ thất bại trước khi biến được cấu hình.
- `drizzle/0000_polite_slayback.sql` là migration khởi tạo 16 bảng từ schema hiện tại, kèm RLS mặc định từ chối các vai trò Data API. Migration tương đương đã được áp dụng trên Supabase với tên `initial_adspulse_schema`, phiên bản `20261121041905`. Không chạy lại migration khởi tạo trên database đó. Đọc kỹ và sao lưu trước khi áp dụng vào bất kỳ database nào khác đã có dữ liệu.
- Server kết nối trực tiếp PostgreSQL bằng `DATABASE_URL`; bản Preview dùng Supabase Auth cho phiên đăng nhập và phân quyền ứng dụng. Hãy đặt chuỗi kết nối Supabase pooler có SSL trong Vercel Environment Variables, không đưa mật khẩu vào Git hoặc chat. `drizzle.config.json` hiện trỏ vào PostgreSQL local; không chạy `drizzle-kit push` với cấu hình mặc định để triển khai Supabase.
- Vercel hiện bật Deployment Protection. Không tắt cơ chế này trước khi có xác thực và phân quyền phù hợp trong ứng dụng. Bản Production hiện vẫn là phiên bản cũ chưa có lớp xác thực mới; bản Preview đã có kiểm tra vai trò phía server, nhưng cần kiểm thử end-to-end trước khi triển khai production. RLS chỉ bảo vệ truy cập Data API, không bảo vệ các API Next.js dùng kết nối PostgreSQL đặc quyền.

## Giới hạn quan trọng trước khi vận hành thật

Mặc định ứng dụng chỉ tạo cấu hình rỗng, không nạp dữ liệu demo. Các thao tác mô phỏng tạo quảng cáo, đồng bộ tài sản, Drive, Insights, Sheets, Post ID và job hệ thống bị từ chối với mã 501. Chỉ đặt `APP_DEMO_MODE=true` cho database demo hoàn toàn riêng biệt, không bao giờ bật với dữ liệu thật. Các tích hợp thật tương ứng chưa hoàn thành. Không thiết lập cron cho đến khi các tích hợp thật, xác thực, xử lý trùng lặp và dữ liệu ban đầu được kiểm tra và thống nhất.

Khóa bí mật trong form sẽ không được trả lại trình duyệt; trường trống khi lưu giữ nguyên khóa cũ. Việc kiểm tra Google Drive/Sheets thực hiện yêu cầu đọc thật thông qua service account; cần cấp quyền cho tài nguyên tương ứng. Khóa vẫn được lưu dạng plaintext trong database nếu nhập qua form, vì vậy chỉ dùng trong môi trường được bảo vệ; ưu tiên biến môi trường và bổ sung mã hóa/quản lý bí mật trước production.

## Kiểm tra mã

```sh
npm ci
npm run typecheck
# Dùng URL thử nghiệm chỉ để build; không phải kết nối Supabase thật.
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/app_db' npm run build
npm run lint
```

Build thành công với URL thử nghiệm (build không kiểm tra kết nối database). Lint hiện vẫn có lỗi cần xử lý ở launcher, dashboard, reports và users. Phông chữ được đóng gói cục bộ để build không phụ thuộc Google Fonts.

## Tính toàn vẹn KPI

Mã mới khóa hàng sản phẩm trong transaction để cấp số phiên bản KPI tuần tự; ngày trước KPI đầu tiên không áp dụng KPI tương lai. Đầu vào KPI và ngân sách khi tạo sản phẩm được kiểm tra phía server. Báo cáo và dashboard từ chối tính lợi nhuận khi có dữ liệu doanh thu nhưng không có KPI hiệu lực, tránh báo lãi sai. Cần kiểm thử ghi đồng thời với database thực trước khi đưa lên production.
