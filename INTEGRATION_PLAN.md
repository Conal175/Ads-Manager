# Phương án kết nối Ads Manager với các bên

Trạng thái: kế hoạch triển khai; chưa kết nối hay kích hoạt đồng bộ, lịch chạy hoặc tạo quảng cáo thật. Các kiểm thử chức năng trong lượt này chạy trên PostgreSQL cục bộ riêng và Auth giả, không phản ánh dữ liệu thực hoặc quyền của tài khoản bên ngoài.

## Nguyên tắc trước khi kết nối

- Giữ nguyên Vercel Deployment Protection và không bật demo với dữ liệu thật. Production hiện chạy bản cũ, chưa có lớp auth mới; không mở công khai trước khi triển khai an toàn.
- Xác minh Preview có tách database khỏi Production hay không; không mặc định coi là tách. Cần backup và thử khôi phục trước các thay đổi/nhập dữ liệu thực; thống nhất cửa sổ vận hành và kế hoạch rollback.
- Tạo tài khoản PostgreSQL riêng với quyền tối thiểu, kiểm tra transaction pooler và RLS; có audit log cho thay đổi quyền/cấu hình. Khóa do người dùng nhập đang lưu plaintext trong DB: triển khai quản lý bí mật/mã hóa trước khi nhập khóa thật. Không gửi token, mật khẩu, file key hoặc session qua chat.
- Trước khi cho dùng rộng: xác minh admin gắn ID bất biến thay vì chỉ dựa vào email, kiểm thử thu hồi quyền trong phiên đang đăng nhập, CSRF và xác thực ba vai trò qua API. Với đăng ký email cần cấu hình SMTP, callback production chính xác, chống lạm dụng và kiểm thử bằng email thật.
- Mọi tác vụ phải có timeout, lỗi rõ ràng, giám sát, backoff, khóa chống chạy trùng, idempotency, checkpoint, xử lý một phần và ghi audit không chứa bí mật. Chạy thủ công trước khi bật cron; không suy luận thành công khi chỉ tạo dữ liệu giả.

## Thứ tự đề nghị

### 1. Google Drive: chỉ đọc metadata media
- Chuẩn bị: Google Cloud project có Drive API, danh tính service account hoặc cơ chế credentials được bảo vệ, cấp quyền đọc đúng thư mục gốc; quy ước `Kho_Ads/[Mã_SP]/[YYYY-MM]` và quyền tệp cụ thể cần thống nhất.
- Hiện có: kiểm tra đọc thư mục thực qua service account. Đồng bộ file vào kho media hiện bị chặn 501; nhập metadata thủ công được kiểm thử cục bộ.
- Xây dựng: duyệt có phân trang và shared drives nếu cần; lưu file ID, tên, mimeType, dung lượng, thời điểm sửa, nguồn và trạng thái; không tải toàn bộ video vào DB. Upsert theo file ID, ghi nhận file bị di chuyển/mất quyền thay vì xóa nhầm. Kiểm tra giới hạn kích thước và quyền tải trước khi dùng.
- Nghiệm thu: thử thư mục nhỏ do chủ tài khoản chọn; kiểm tra file mới/đổi tên/mất quyền, chạy lại không nhân bản, timeout và khôi phục; không sửa hoặc chia sẻ Drive tự động.

### 2. Google Sheets: đối soát doanh thu
- Chuẩn bị: bật Sheets API, cấp quyền đọc bảng cho service account; xác nhận tab `DoanhThu_ThucTe` và cột A–E (ngày, mã sản phẩm, đơn chốt, doanh thu, đơn hoàn), múi giờ, định dạng tiền, nguồn dữ liệu và quyền xử lý hàng không hợp lệ.
- Hiện có: kiểm tra quyền đọc A1:E1; sync Sheets thực bị chặn 501. Nhập và cập nhật thủ công đã kiểm thử cơ bản cục bộ. API hiện chưa có cơ chế chống đồng thời cho cùng ngày/sản phẩm; cần khóa/upsert và unique sau khi rà soát dữ liệu trước khi nhập tự động.
- Xây dựng: đọc theo trang/phạm vi, xác thực ngày/số, mã sản phẩm tồn tại, số hoàn không vượt đơn, phát hiện hàng trùng; xem trước thay đổi, sau đó nhập idempotent, lưu nguồn, thời gian, dòng lỗi và quy tắc ưu tiên ghi đè thủ công. Không ghi ngược Sheets trừ khi được thống nhất riêng.
- Nghiệm thu: đối chiếu mẫu có phép tính thủ công, thử nhập lại, hàng lỗi, cập nhật và báo cáo lịch sử KPI; xác nhận không thay đổi dữ liệu ngoài phạm vi.

### 3. Meta: đọc tài sản và Insights trước
- Chuẩn bị: chủ tài khoản cung cấp quyền qua Business Manager/Meta App và system user, cấp đúng tài sản (BM, tài khoản quảng cáo, Page, Pixel), quyền API cần thiết theo tính năng và trạng thái xét duyệt của Meta. Kiểm tra Graph API version còn được Meta hỗ trợ trước khi triển khai; mã hiện ghi v21.0, không giả định nó còn hoạt động.
- Hiện có: kiểm tra token/quyền Meta; đồng bộ tài sản và Insights thực bị chặn 501. Token đã nhập trong form có thể nằm plaintext trong DB; chưa nên nhập token thật trước khi có quản lý bí mật.
- Xây dựng: đồng bộ read-only, hỗ trợ pagination, múi giờ/tỉ giá, level campaign/ad set/ad, mappings và lookback; upsert theo tài khoản/đối tượng/ngày; xử lý rate limit, token hết hạn, tài sản mất quyền và khoảng trống dữ liệu. Đưa trạng thái đồng bộ và thời điểm dữ liệu lên UI.
- Nghiệm thu: chọn một tài khoản, so sánh tổng spend/messages/insights với Ads Manager theo cùng múi giờ và khung ngày; kiểm tra chạy lại không nhân đôi, giới hạn tải, quyền bị thu hồi, retry và xử lý một phần.

### 4. Telegram và AI
- Telegram: chủ bot tự cấu hình token/chat ID ở kho bí mật, kiểm thử gửi đến chat được chỉ định, xác minh quyền bot, timeout và lỗi gửi; không báo thành công nếu Telegram từ chối. Tách cảnh báo và bản tin, chống trùng/có giới hạn tần suất. Kết nối `getMe` chỉ xác minh bot, không chứng minh gửi được đến chat.
- AI: người quản trị tự cấu hình key/provider, chọn dữ liệu được phép gửi ra ngoài và giới hạn chi phí; loại bỏ token/PII, timeout, output schema và cảnh báo rõ khi lỗi. Hiện bản tin chỉ lưu khi kết quả live thành công nếu không bật demo. Thử trên dữ liệu đã được phép, đối chiếu nguồn và không tự thực thi đề xuất.

### 5. Lên quảng cáo Meta: giai đoạn riêng sau khi dữ liệu đọc đúng
- Hiện thao tác launch thực bị chặn; preflight và lưu nháp có thể thử cục bộ. Tuyệt đối không tự bật quảng cáo.
- Sau khi được duyệt phạm vi, xây dựng theo từng flow với preflight chính xác cho từng tài khoản/Page/video/Post ID, kiểm tra hạn mức và cấp quyền. Tất cả campaign/ad set/ad tạo mặc định PAUSED; dry-run, xác nhận người vận hành, idempotency/retry không tạo trùng, nhật ký mapping ID và cơ chế xử lý thất bại từng bước. Không tự xóa/tắt các đối tượng Meta khi rollback nếu chưa có chính sách được duyệt.
- Nghiệm thu bằng tài khoản thử/tài sản được chỉ định, giới hạn ngân sách, xác nhận từng đối tượng PAUSED trực tiếp trên Meta; kiểm thử lỗi phân quyền, token, rate limit, timeout và retry. Bật quảng cáo vẫn do người có quyền quyết định trên Meta.

## Các quyết định cần chủ sở hữu cung cấp khi bắt đầu

1. Chọn ưu tiên kết nối (đề xuất Drive → Sheets → Meta đọc → Telegram/AI → launch).
2. Chỉ định thư mục Drive, bảng/tab và quy tắc đối soát; cấp quyền đọc cho danh tính Google do hệ thống sử dụng.
3. Chỉ định BM/tài khoản quảng cáo/Page thử nghiệm và phạm vi quyền Meta; chuẩn bị phương thức cấp secrets an toàn.
4. Chọn SMTP/domain gửi mail, quản lý backup/khôi phục, ngân sách chạy dịch vụ và người phê duyệt bật cron/launch.
