# Đăng nhập và phân quyền (chưa triển khai)

Cần giữ Vercel Deployment Protection. Mã trong workspace chưa được triển khai hoặc kiểm thử với tài khoản Supabase Auth thật; không coi là kiểm toán bảo mật hoàn chỉnh.

## Cấu hình trước khi triển khai

1. Tạo tài khoản quản trị trong Supabase Authentication của dự án Adsmanager; xác minh email. Không gửi mật khẩu qua chat. Supabase Auth hiện đang cho phép đăng ký công khai; nên vô hiệu hóa đăng ký công khai khi đã chuẩn bị được cách tạo/mời người dùng quản trị phù hợp. Việc đăng ký không tự động cấp quyền ứng dụng.
2. Trên Vercel đặt `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` bằng URL và publishable/anon key của Adsmanager; không bao giờ dùng service role key trong biến NEXT_PUBLIC. Đặt `APP_ADMIN_EMAIL` bằng đúng email quản trị đã xác minh. Biến này cấp quyền admin liên tục cho email đó, độc lập với bảng vai trò; muốn thu hồi phải đổi/xóa biến và redeploy. Không sử dụng email có thể bị chuyển cho người khác.
3. Trước khi áp dụng, xác nhận `public.app_user_roles` đã tồn tại. Trên Adsmanager migration `20261121072710_app_user_roles` đã được áp dụng, không chạy lại. Trên database mới cần tạo migration tương ứng trước khi khởi động.
4. Triển khai có kiểm soát, kiểm thử đăng nhập thực tế và từng vai trò trước khi cho người dùng khác truy cập. Tính năng đăng xuất và cấp quyền cũng cần kiểm thử. Không tắt Deployment Protection.

## Quyền hiện tại trong mã

- Mọi API dữ liệu đều yêu cầu phiên Supabase Auth được xác minh và email đã xác nhận. Người chưa được gán quyền bị từ chối. `/api/health` chỉ kiểm tra kết nối DB và không yêu cầu đăng nhập.
- Viewer và tài khoản chưa được phân quyền không được xem trang hoặc API nghiệp vụ. Operator chỉ được vào tài sản, sản phẩm, creative, launcher và đề xuất; API dữ liệu tương ứng yêu cầu tối thiểu operator. Admin xem toàn bộ và được sửa cài đặt, chạy job và quản lý vai trò. Các thao tác ở `/api/actions` đều yêu cầu admin để bảo vệ cấu hình quy tắc; các lệnh đồng bộ/chạy job ở assets, reports, briefings và system yêu cầu admin.
- Admin có thể gọi `GET /api/admin/roles`, `PUT /api/admin/roles` (JSON `userId`, `role`) và `DELETE /api/admin/roles?userId=...`. `userId` là UUID người dùng đã tồn tại trong Supabase Auth; không tự đăng ký quyền từ client. Trang `/users` cung cấp giao diện cấp và thu hồi quyền; API danh sách chỉ dành cho admin và đọc tối thiểu các cột cần thiết từ `auth.users`. Chưa có audit log và chưa có kiểm thử end-to-end với ba vai trò.
- Các yêu cầu thay đổi dữ liệu yêu cầu Origin cùng host và HTTPS trong production. Thử nghiệm cục bộ bằng `next dev` cho phép HTTP.

## Database

Production hiện kết nối Adsmanager; người dùng đã chọn xây dựng trực tiếp tại đây. Preview/Development chưa được xác nhận tách biệt; dữ liệu và thay đổi schema có thể ảnh hưởng Production. Chưa tạo hoặc chuyển sang tài khoản PostgreSQL quyền tối thiểu. RLS ở bảng vai trò không bảo vệ API Next.js đang dùng kết nối PostgreSQL đặc quyền. Cần tạo tài khoản ứng dụng với tập quyền được kiểm thử và đổi `DATABASE_URL` một cách an toàn trước khi coi nhiệm vụ này hoàn tất.

## Đăng ký công khai (cần cấu hình và kiểm thử trước khi sử dụng)

Trang `/register` đăng ký qua Supabase Auth, yêu cầu xác minh email và không tự cấp vai trò. Với PKCE, mở email xác minh trên cùng trình duyệt đăng ký. Cấu hình Supabase Authentication → URL Configuration cho phép URL chính xác `https://<preview-host>/auth/callback` và URL production tương ứng trước khi kiểm thử; không mở wildcard rộng. Supabase phải bật email signup và xác minh email. Kiểm tra dịch vụ gửi mail/SMTP và hạn mức, đồng thời duy trì giới hạn đăng ký và chống lạm dụng; SMTP mặc định có thể không gửi được cho mọi người dùng. Deployment Protection sẽ tiếp tục chặn người chưa có quyền Vercel trước khi đến trang đăng ký; không tắt nếu chưa kiểm thử an ninh.

Sau khi xác minh, quản trị viên phải cấp vai trò qua API quản lý vai trò; có thể dùng trang `/users` sau khi đăng nhập admin. `APP_ADMIN_EMAIL` là quyền admin dựa trên email, nên cần bảo vệ email này, không xóa rồi để đăng ký lại, và chuyển sang gắn admin với user ID bất biến trước khi mở đăng ký rộng. Người dùng chưa được cấp quyền sẽ bị từ chối API. Chưa kiểm thử đăng ký/xác minh end-to-end bằng email thật hoặc thử rate limits.
