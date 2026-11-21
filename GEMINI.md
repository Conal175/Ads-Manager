# GEMINI.md — Cẩm nang Kiến trúc, Triển khai & Chỉnh sửa AdsPulse OS trên Gemini

Tệp này được thiết kế chuẩn cho **Google Gemini CLI**, **Gemini Code Assist**, **Firebase Studio (Project IDX)** và **Gemini Web Chat**. Toàn bộ dự án đã được tối ưu hóa theo kiến trúc **Modular Clean Architecture** (mỗi file trung bình chỉ 80–280 dòng, đơn nhiệm) để bạn chỉ cần đính kèm **1–2 file nhỏ** vào Gemini mỗi lần muốn nâng cấp tính năng mà không bao giờ bị tràn ngữ cảnh (context limit) hay cắt cụt code.

---

## 1. Nguyên tắc Bất biến (Core Safety Rules — Gemini cần tuân thủ khi sửa code)

Khi yêu cầu Gemini chỉnh sửa bất kỳ file nào trong dự án này, luôn giữ nguyên 4 chốt chặn nghiệp vụ cốt lõi:
1. **Khóa cứng `status = "PAUSED"`**: Mọi thao tác tạo Campaign / Ad Set / Ad trong `src/services/launcher-service.ts` và `src/lib/meta-errors.ts` bắt buộc giữ trạng thái `PAUSED`, đồng thời tắt Advantage+ Creative (`advantagePlusDisabled = true`) ở Luồng 1 & Luồng 3 để khóa cố định `effective_object_story_id`.
2. **Không lưu byte video vào PostgreSQL**: Bảng `creatives` chỉ lưu siêu dữ liệu (`drive_file_id`, dung lượng MB, thời lượng, cảnh báo vàng `≥ 80MB`). Xem trước video qua `/file/d/{drive_file_id}/preview` và đẩy sang Meta qua `file_url`.
3. **Bảo toàn Lịch sử KPI (KPI Versioning)**: Khi sửa giá bán hoặc giá vốn sản phẩm, luôn `INSERT` bản ghi mới vào `product_kpi_versions` kèm `effective_from` (`YYYY-MM-DD`), tuyệt đối không `UPDATE` đè bản ghi cũ. Mọi phép tính lãi/lỗ quá khứ phải đi qua hàm `resolveKpiForDate()` trong `src/lib/kpi.ts`.
4. **Chống khóa Rate Limit Meta (`x-business-use-case-usage`)**: Luôn kiểm tra chỉ số tải API; khi vượt **75%**, bật `throttleMode = true` để giãn chu kỳ đồng bộ.

---

## 2. Bản đồ File Tra cứu Nhanh ("Muốn sửa gì → Mở đúng file nào?")

| Nhu cầu chỉnh sửa / nâng cấp | File duy nhất cần mở / gửi cho Gemini |
| :--- | :--- |
| **Sửa câu lệnh Prompt hoặc cấu trúc JSON của Bản tin AI Gemini** | `src/services/gemini-ai.ts` (`AI_BRIEFING_SYSTEM_PROMPT`, `GEMINI_RESPONSE_SCHEMA`) |
| **Sửa gói dữ liệu tóm tắt 7 ngày gửi cho Gemini lúc 07:30** | `src/services/briefing-service.ts` (`compactInputJson`) |
| **Sửa công thức tính CPO hòa vốn, CPO mục tiêu, Giá tin trần, Pacing** | `src/lib/kpi.ts` (`computeProductKpis`, `evaluateBudgetPacing`) |
| **Sửa logic 4 nhóm Đề xuất (Kill, Scale, Fatigue, Leakage)** | `src/lib/rule-engine.ts` (`runRuleEngineScan`) |
| **Sửa ánh xạ cột file Google Sheets đối soát đơn hàng** | `src/services/google-workspace.ts` (`SHEET_COLUMN_MAPPING`) |
| **Sửa kết nối Meta Graph API & đọc header Rate Limit** | `src/services/meta-graph.ts` |
| **Sửa từ điển dịch mã lỗi Facebook sang tiếng Việt & Pre-flight Check** | `src/lib/meta-errors.ts` (`META_ERROR_MAP`, `runPreflightChecks`) |
| **Sửa quy trình đẩy Ads 3 luồng (Drive / Post ID / Video Cache)** | `src/services/launcher-service.ts` |
| **Sửa cách gom cây Báo cáo 3 cấp, Hook/Hold Rate & Lãi ròng thực** | `src/services/reports-service.ts` |
| **Sửa mẫu tin nhắn Telegram & chống spam (Dedup)** | `src/lib/telegram.ts` |
| **Thêm cột / bảng cơ sở dữ liệu PostgreSQL** | `src/db/schema.ts` và `src/types/domain.ts` |

---

## 3. Cấu trúc Thư mục Đã Tối ưu Hóa

```text
src/
├── types/
│   └── domain.ts                # Tập trung toàn bộ Interface/DTO & hằng số cấu hình
├── db/
│   ├── index.ts                 # Kết nối PostgreSQL Pool + Drizzle ORM
│   └── schema.ts                # 14 bảng dữ liệu nghiệp vụ chuẩn hóa
├── services/                    # Tầng tích hợp API ngoài & Nghiệp vụ lõi (Tách biệt khỏi UI)
│   ├── gemini-ai.ts             # Google Gemini API (gemini-2.5-flash/pro) Structured Output
│   ├── briefing-service.ts      # Đóng gói JSON tinh gọn & lưu Bản tin AI 07:30
│   ├── meta-graph.ts            # Xác thực Meta Token, 4 quyền bắt buộc & Rate Limit header
│   ├── google-workspace.ts      # Xác thực Service Account Drive & cấu hình cột Sheets
│   ├── launcher-service.ts      # Thực thi 3 luồng đẩy chiến dịch (PAUSED)
│   └── reports-service.ts       # Truy vấn Insights 3 cấp, Creative xuyên TK & Lợi nhuận thực
├── lib/                         # Các hàm thuần (Pure Utilities) dễ viết Unit Test
│   ├── api-utils.ts             # Chuẩn hóa lỗi API & gộp khóa .env + Database
│   ├── format.ts                # Định dạng tiền VNĐ, ngày giờ Việt Nam, nhãn trạng thái
│   ├── kpi.ts                   # Công thức KPI tài chính, KPI Versioning & Budget Pacing
│   ├── meta-errors.ts           # Pre-flight Check & dịch mã lỗi Meta API
│   ├── rule-engine.ts           # Bộ máy quét quy tắc 4 nhóm + Cooldown 24h
│   ├── telegram.ts              # Bắn cảnh báo Telegram 2 luồng + chống spam
│   └── seed.ts                  # Dữ liệu khởi tạo tự động lần đầu
├── components/                  # Giao diện chia nhỏ theo từng phân hệ (< 300 dòng/file)
│   ├── AppShell.tsx             # Khung điều hướng Sidebar cố định
│   ├── ui/                      # FeedbackBanner, ModalShell dùng chung
│   ├── assets/                  # AssetsHealthSection, ApiConnectionsForm
│   ├── products/                # ProductKpiCard, ProductKpiModals
│   ├── creatives/               # DriveCreativeGrid, PostIdAndCacheSection, CreativeModals
│   ├── launcher/                # PreflightAndNamingPanel, PresetsManagerSection, DraftsHistorySection
│   ├── reports/                 # HierarchyTreeTable, CreativeLeaderboardSection, BreakdownsHeatmapSection, RealProfitSection
│   └── actions/                 # RuleThresholdsForm, RecommendationCard
└── app/                         # Next.js App Router (8 màn hình + 13 API Endpoints mỏng nhẹ)
```

---

## 4. Mẫu Câu Lệnh (Prompt) Gợi ý Khi Sửa Code Trên Gemini

Khi dùng **Gemini Chat** hoặc **Gemini CLI**, bạn chỉ cần dùng mẫu lệnh ngắn gọn sau:

- **Ví dụ 1 — Đổi công thức tính phí hoàn hàng:**
  > *"Đọc file `src/lib/kpi.ts`. Hãy sửa hàm `computeProductKpis` để cộng thêm phí thu hộ COD 1.2% giá bán vào tổng chi phí biến đổi trước khi tính `breakevenCpo`. Giữ nguyên kiểu trả về TypeScript."*

- **Ví dụ 2 — Tùy chỉnh văn phong Bản tin AI sáng 07:30:**
  > *"Đọc file `src/services/gemini-ai.ts`. Hãy cập nhật `AI_BRIEFING_SYSTEM_PROMPT` để Gemini nhấn mạnh cảnh báo nếu tỷ lệ CIR vượt 25% và đề xuất cụ thể mã video Chờ test."*

- **Ví dụ 3 — Thêm quy tắc mới trong Action Center:**
  > *"Đọc `src/lib/rule-engine.ts` và `src/types/domain.ts`. Hãy bổ sung điều kiện cảnh báo Cắt lỗ khi CTR nhỏ hơn 1.0% sau 200.000đ chi tiêu."*

---

## 5. Hướng dẫn Triển khai Thực tế (Deployment)

1. **Chuẩn bị biến môi trường**:
   ```bash
   cp .env.example .env
   # Điền DATABASE_URL và GEMINI_API_KEY (lấy miễn phí/trả phí tại https://aistudio.google.com/apikey)
   ```
2. **Đồng bộ cấu trúc bảng vào PostgreSQL**:
   ```bash
   npm install
   npx drizzle-kit push
   ```
3. **Kiểm tra TypeScript & Build Production**:
   ```bash
   npx next typegen
   npm exec tsc -- --noEmit
   npm run build
   npm run start
   ```
4. **Cấu hình Cron Jobs thực tế** (trên VPS crontab / Cloud Scheduler / Vercel Cron):
   - Mỗi 30 phút: `POST /api/system` với `{"action":"run_job","jobName":"meta_insights"}`
   - 02:00 sáng: `POST /api/system` với `{"action":"run_job","jobName":"meta_backfill_3d"}`
   - 07:30 sáng: `POST /api/briefings` (Gọi Gemini 2.5 Flash sinh bản tin sáng + bắn Telegram)
   - 11:00 / 16:00 / 22:00: `POST /api/actions` (Quét quy tắc 4 nhóm Action Center)
