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

## Kiểm thử bảo mật và dữ liệu ngày 2026-11-21

- Kiểm tra metadata Adsmanager: 17 bảng `public` bật RLS và không có policy. `anon`/`authenticated` vẫn có quyền SELECT ở 16 bảng nghiệp vụ, nhưng RLS hiện từ chối truy cập hàng; bảng vai trò đã thu hồi quyền SELECT. Không coi điều này là bảo vệ các truy vấn server dùng tài khoản PostgreSQL đặc quyền.
- Migration `20261121081346_revoke_public_unsafe_table_privileges` đã áp dụng trên Adsmanager: thu hồi TRUNCATE và TRIGGER của PUBLIC, anon, authenticated trên 16 bảng nghiệp vụ; kiểm tra lại không còn bảng nào có các quyền đó cho hai vai trò. Không chạy lại migration trên Adsmanager.
- Truy vấn chỉ đọc: 0 sản phẩm, 0 phiên bản KPI, 0 dòng đối soát, 1 dòng cài đặt, 1 bản gán vai trò; kiểm tra sản phẩm thiếu KPI và trùng phiên bản trả 0 nhưng dữ liệu trống nên không chứng minh logic trên dữ liệu thật. Không ghi sản phẩm thử hoặc thay đổi vai trò.
- `tests/security-http.test.mjs` chạy với server local giả trên 127.0.0.1:3116: 15 API đọc không đăng nhập/cookie giả, 20 mutation với ba tình huống, 9 trang không đăng nhập và các endpoint auth đều từ chối theo mong đợi. Đây là kiểm tra đường từ chối, không thay thế kiểm thử đăng nhập/ba vai trò/thu hồi hay kiểm thử xâm nhập.
- Next.js được nâng từ 16.4.2 lên 16.4.6; `npm audit --omit=dev` báo 0 lỗ hổng, audit đầy đủ còn 4 moderate trong nhánh công cụ phát triển drizzle-kit/esbuild. Typecheck, build và kiểm thử unit thành công; build dùng database giả.
- Chưa kiểm tra transaction ghi/sửa đồng thời bằng database thật, khôi phục backup, đăng ký/xác minh email thật, phân quyền bằng ba phiên thật hoặc quản lý user thực. Preview có thể dùng chung database production. Deployment Protection vẫn bật; Production còn chạy bản cũ thiếu auth mới. SMTP chưa cấu hình và site URL Auth còn localhost. Chưa có vai trò DB tối thiểu, mã hóa secret, audit log phân quyền hoặc bootstrap admin gắn user ID bất biến. Các mục này vẫn là rủi ro trước production.

## Kiểm thử bổ sung trên Adsmanager ngày 2026-11-21

- Bản Preview `e9d2557` đã READY, chưa triển khai production. Truy cập từ công cụ tự động vẫn bị Vercel Deployment Protection chuyển sang đăng nhập Vercel.
- Thử SQL trực tiếp với ID âm cố định và mã ngẫu nhiên, tất cả trong transaction/subtransaction được hoàn tác: tạo product và KPI rồi đọc join, xác nhận ngân sách 0 và giá trị KPI; xác nhận trùng mã sản phẩm bị từ chối; xác nhận khi tạo KPI thiếu trường bắt buộc thì sản phẩm cùng subtransaction cũng bị hoàn tác; xác nhận khóa ngoại từ chối KPI không có sản phẩm. Truy vấn sau đó xác nhận không còn dòng thử, tổng product/KPI đều 0. Thử nghiệm SQL này không chạy qua API ứng dụng, không chứng minh giao dịch Drizzle hoặc nhiều kết nối đồng thời.
- Thử RLS bằng `SET LOCAL ROLE` trong transaction: anon và authenticated không thấy product chưa commit và bị từ chối INSERT; rollback và xác nhận không còn dữ liệu thử. Kết quả này chỉ kiểm tra bảng products, không thay thế thử từng vai trò app.
- Metadata database cho thấy chưa có ràng buộc UNIQUE `(product_id, version_number)`. Hiện tại API dùng khóa hàng product để tuần tự hóa, nhưng ghi ngoài API có thể tạo phiên bản trùng. Chưa thêm constraint vào database đang hoạt động; cần đánh giá và kiểm thử migration. Chưa kiểm thử đồng thời với hai kết nối PostgreSQL.
- Chưa có phiên người dùng trong công cụ, và Protection không cho agent truy cập Preview: kiểm thử UI/API bằng ba phiên thực, thu hồi quyền, đăng ký/xác minh email và giao dịch thực qua ứng dụng còn chờ. Không gửi mật khẩu, cookie hoặc token qua chat.

## Kiểm thử API và đồng thời trên PostgreSQL cục bộ ngày 2026-11-21

- Người dùng xác nhận các vai trò hoạt động; đây là xác nhận từ người dùng, không phải kiểm thử tự động của agent đối với phiên Supabase thật.
- Dùng PostgreSQL 18.7 cục bộ riêng, schema từ `drizzle/0000_polite_slayback.sql`, ứng dụng Next.js thật và dịch vụ Auth giả cục bộ (không liên quan Supabase thật). Kiểm thử `tests/product-integration.test.mjs` đã chạy thành công: tạo/đọc sản phẩm và KPI, ngân sách bằng 0, tính CPO, dữ liệu không hợp lệ, mã trùng và product không tồn tại; cố tình gây lỗi chèn KPI để xác nhận transaction tạo product được rollback. Gửi 20 request tạo phiên bản cùng lúc và xác nhận 20 phiên bản khác nhau v2–v21 và đọc đủ 21 bản từ database.
- Test này chỉ chạy với server test trên 127.0.0.1:3117 và PostgreSQL database `ads_manager_integration_test` trên 127.0.0.1:55432, có marker riêng. Test Auth giả `tests/mock-auth-local.cjs` chỉ được dùng cục bộ, tuyệt đối không triển khai cho người dùng hay dùng với database thật. Dữ liệu và trigger test chỉ nằm trong database cục bộ; các tiến trình đã dừng. Chạy lại cần database test mới với schema và marker như trong test, mock auth, và app trỏ vào database test; test có ghi dữ liệu và tạo trigger, không dùng môi trường thực.
- Chưa kiểm chứng ghi đồng thời qua Supabase pooler/Preview hay giao dịch trên dữ liệu nghiệp vụ thật. Chưa có UNIQUE `(product_id, version_number)`, nên truy cập ngoài API có thể tạo bản trùng. Chưa kiểm thử email xác minh, backup/restore, thu hồi quyền đang có phiên hay bảo mật độc lập; không coi các kiểm thử cục bộ là chứng nhận production.

## Kiểm thử nghiệp vụ cục bộ bổ sung ngày 2026-11-21

- `tests/workflow-integration.test.mjs` sử dụng PostgreSQL cục bộ có marker và Auth giả; đã kiểm thử tạo/xóa preset, thêm/sửa media và cảnh báo kích thước, lưu nháp/preflight, nhập/cập nhật doanh thu, đọc báo cáo, đọc/chạy quét quy tắc rỗng, che bốn secret khỏi API settings/system, không báo gửi Telegram thành công khi thiếu cấu hình, và chặn các thao tác đồng bộ giả bằng 501. Không kiểm thử tích hợp provider thật hay giao diện người dùng.
- Đã tìm và sửa lỗi đầu vào: creative thiếu thông tin vẫn được lưu, ngày đối soát sai hoặc đơn hoàn lớn hơn đơn chốt vẫn được chấp nhận, trạng thái đề xuất sai/ID không tồn tại báo thành công; launcher không còn nhận action ngoài danh sách. Đã chạy lại các trường hợp và typecheck/build thành công.
- Hạn chế: chưa kiểm thử cạnh tranh đồng thời khi upsert doanh thu; chưa khẳng định mọi ràng buộc dữ liệu, mã lỗi, UI hay các hành động khác đã hoàn chỉnh. Kế hoạch kết nối xem `INTEGRATION_PLAN.md`.
