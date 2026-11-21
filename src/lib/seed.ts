import { db } from "@/db";
import {
  actionRecommendations,
  adDrafts,
  adInsights,
  adPresets,
  aiBriefings,
  creatives,
  dailySalesReconciliation,
  insightBreakdowns,
  metaAssets,
  metaMediaCache,
  metaPosts,
  productKpiVersions,
  products,
  syncLogs,
  systemSettings,
  telegramAlerts,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDaysAgoIso, getTodayIso } from "./format";
import { computeProductKpis } from "./kpi";

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeedIfEmpty().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeedIfEmpty(): Promise<void> {
  const existingSettings = await db.select().from(systemSettings).limit(1);
  if (existingSettings.length > 0) {
    const first = existingSettings[0];
    if (first.aiProvider === "openai" && !first.aiApiKey) {
      await db
        .update(systemSettings)
        .set({ aiProvider: "gemini-2.5-flash" })
        .where(eq(systemSettings.id, first.id));
    }
    return;
  }

  const today = getTodayIso();
  const d1 = getDaysAgoIso(1);
  const d2 = getDaysAgoIso(2);
  const d3 = getDaysAgoIso(3);
  const d4 = getDaysAgoIso(4);
  const d5 = getDaysAgoIso(5);
  const d6 = getDaysAgoIso(6);
  const d30 = getDaysAgoIso(30);

  // 1. System Settings
  await db.insert(systemSettings).values({
    metaSystemUserToken: "EAA_SANDBOX_SYSTEM_USER_TOKEN_ADSPULSE_2026",
    metaBusinessManagerId: "849201938475612",
    googleDriveRootFolderId: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ_KhoAds",
    googleSheetsUrl: "https://docs.google.com/spreadsheets/d/1DemoSheetRealProfit2026/edit",
    googleServiceAccountJson: JSON.stringify(
      {
        type: "service_account",
        project_id: "adspulse-ops-vn",
        client_email: "adspulse-sync@adspulse-ops-vn.iam.gserviceaccount.com",
      },
      null,
      2
    ),
    telegramBotToken: "demo_7912834:AAH_AdsPulseAlertBot",
    telegramChatId: "-1002398475612",
    aiApiKey: "",
    aiProvider: "gemini-2.5-flash",
    dailyBudgetSafetyCap: 10000000,
    ruleConfigJson: {
      killMsgCeilingPct: 130,
      killMinSpend: 120000,
      scaleTargetDiscountPct: 20,
      scaleMinMessages: 12,
      scaleMinDays: 2,
      fatigueFrequencyThreshold: 2.5,
      fatigueCtrDropDays: 3,
      leakageSpendSharePct: 15,
      leakageCostMultiplier: 1.5,
    },
    metaRateLimitPct: 28,
    metaCpuUsagePct: 22,
    metaTimeUsagePct: 24,
    throttleMode: false,
    connectionStatuses: {
      meta: {
        ok: true,
        mode: "sandbox",
        checkedAt: new Date().toISOString(),
        message: "Đã xác thực Token (Sandbox) — Đủ 4 quyền bắt buộc.",
        details: {
          permissions: [
            "ads_read",
            "ads_management",
            "pages_read_engagement",
            "pages_show_list",
          ],
          expiresAt: "Không hết hạn (System User)",
        },
      },
      drive: {
        ok: true,
        mode: "sandbox",
        checkedAt: new Date().toISOString(),
        message: "Service Account có quyền đọc thư mục Kho_Ads.",
      },
      sheets: {
        ok: true,
        mode: "sandbox",
        checkedAt: new Date().toISOString(),
        message: "Đã kết nối trang tính đối soát đơn hàng thực tế.",
      },
      telegram: {
        ok: true,
        mode: "sandbox",
        checkedAt: new Date().toISOString(),
        message: "Bot Telegram sẵn sàng gửi cảnh báo 2 luồng.",
      },
      ai: {
        ok: true,
        mode: "sandbox",
        checkedAt: new Date().toISOString(),
        message: "Bộ máy phân tích AI Briefing sẵn sàng (Chế độ nội bộ).",
      },
    },
  });

  // 2. Meta Assets (Ad Accounts, Fanpages, Pixels)
  await db.insert(metaAssets).values([
    {
      assetType: "ad_account",
      metaId: "act_1029384756",
      name: "BM01 - Scale Chính (VN-01)",
      ownershipType: "owned",
      accountStatus: 1,
      disableReason: "NONE",
      amountSpent: 148500000,
      spendCap: 300000000,
      dailySpendLimit: 25000000,
      fundingSourceDetails: "Visa •••• 4821 (Vietcombank)",
      currency: "VND",
      isMonitored: true,
    },
    {
      assetType: "ad_account",
      metaId: "act_2048571934",
      name: "BM01 - Test Creative (VN-02)",
      ownershipType: "owned",
      accountStatus: 1,
      disableReason: "NONE",
      amountSpent: 64200000,
      spendCap: 150000000,
      dailySpendLimit: 12000000,
      fundingSourceDetails: "Mastercard •••• 9910 (Techcombank)",
      currency: "VND",
      isMonitored: true,
    },
    {
      assetType: "ad_account",
      metaId: "act_3098123456",
      name: "Agency - Đối tác Scale (CL-01)",
      ownershipType: "client",
      accountStatus: 3,
      disableReason: "PAYMENT_UNSETTLED",
      amountSpent: 91800000,
      spendCap: 120000000,
      dailySpendLimit: 15000000,
      fundingSourceDetails: "Visa •••• 1102 (Lỗi trừ ngưỡng 14.5tr)",
      currency: "VND",
      isMonitored: true,
      lastAlertSentAt: new Date(Date.now() - 45 * 60 * 1000),
    },
    {
      assetType: "ad_account",
      metaId: "act_4019283746",
      name: "BM01 - Dự phòng (VN-03)",
      ownershipType: "owned",
      accountStatus: 2,
      disableReason: "ADS_INTEGRITY_POLICY",
      amountSpent: 12300000,
      spendCap: 50000000,
      dailySpendLimit: 5000000,
      fundingSourceDetails: "Visa •••• 7731 (ACB)",
      currency: "VND",
      isMonitored: false,
    },
    {
      assetType: "fanpage",
      metaId: "109283746501",
      name: "Kova Wear - Thời Trang Chống Nắng",
      ownershipType: "owned",
      accountStatus: 1,
      disableReason: "NONE",
      fundingSourceDetails: "142.800 người theo dõi • Page xanh",
      isMonitored: true,
    },
    {
      assetType: "fanpage",
      metaId: "209384756102",
      name: "HomeSmart Official - Gia Dụng Thông Minh",
      ownershipType: "owned",
      accountStatus: 1,
      disableReason: "NONE",
      fundingSourceDetails: "89.400 người theo dõi • Page xanh",
      isMonitored: true,
    },
    {
      assetType: "pixel",
      metaId: "998877665544",
      name: "Pixel Kova Wear Main",
      ownershipType: "owned",
      accountStatus: 1,
      disableReason: "NONE",
      fundingSourceDetails: "Sự kiện gần nhất: 2 phút trước (Purchase/Lead)",
      isMonitored: true,
    },
    {
      assetType: "pixel",
      metaId: "887766554433",
      name: "Pixel HomeSmart Main",
      ownershipType: "owned",
      accountStatus: 1,
      disableReason: "NONE",
      fundingSourceDetails: "Sự kiện gần nhất: 5 phút trước (ViewContent/Lead)",
      isMonitored: true,
    },
  ]);

  // 3. Products
  const insertedProducts = await db
    .insert(products)
    .values([
      {
        code: "SP01",
        name: "Áo Khoác Gió Chống Nắng UV Pro",
        category: "Thời trang ứng dụng",
        status: "active",
        dailyBudgetTarget: 6500000,
        weeklyBudgetTarget: 45500000,
        monthlyBudgetTarget: 195000000,
      },
      {
        code: "SP02",
        name: "Máy Xay Sữa Hạt Mini 6 Lưỡi",
        category: "Gia dụng thông minh",
        status: "active",
        dailyBudgetTarget: 4500000,
        weeklyBudgetTarget: 31500000,
        monthlyBudgetTarget: 135000000,
      },
      {
        code: "SP03",
        name: "Đèn Ngủ Cảm Biến Chuyển Động Pro",
        category: "Nhà cửa & Đời sống",
        status: "active",
        dailyBudgetTarget: 2500000,
        weeklyBudgetTarget: 17500000,
        monthlyBudgetTarget: 75000000,
      },
    ])
    .returning();

  const sp01 = insertedProducts.find((p) => p.code === "SP01")!;
  const sp02 = insertedProducts.find((p) => p.code === "SP02")!;
  const sp03 = insertedProducts.find((p) => p.code === "SP03")!;

  // 4. Product KPI Versions (Historical Versioning!)
  const sp01v1Input = {
    avgSellingPrice: 390000,
    cogs: 148000,
    shippingPackingFee: 34000,
    expectedReturnRatePct: 11,
    otherCost: 9000,
    targetNetMarginPct: 18,
    targetCloseRatePct: 24,
  };
  const sp01v1 = computeProductKpis(sp01v1Input);

  const sp01v2Input = {
    avgSellingPrice: 390000,
    cogs: 135000,
    shippingPackingFee: 32000,
    expectedReturnRatePct: 9.5,
    otherCost: 8000,
    targetNetMarginPct: 20,
    targetCloseRatePct: 26,
  };
  const sp01v2 = computeProductKpis(sp01v2Input);

  const sp02v1Input = {
    avgSellingPrice: 540000,
    cogs: 205000,
    shippingPackingFee: 38000,
    expectedReturnRatePct: 8,
    otherCost: 12000,
    targetNetMarginPct: 22,
    targetCloseRatePct: 22,
  };
  const sp02v1 = computeProductKpis(sp02v1Input);

  const sp03v1Input = {
    avgSellingPrice: 249000,
    cogs: 78000,
    shippingPackingFee: 28000,
    expectedReturnRatePct: 10,
    otherCost: 6000,
    targetNetMarginPct: 18,
    targetCloseRatePct: 30,
  };
  const sp03v1 = computeProductKpis(sp03v1Input);

  await db.insert(productKpiVersions).values([
    {
      productId: sp01.id,
      versionNumber: 1,
      effectiveFrom: d30,
      ...sp01v1Input,
      breakevenCpo: sp01v1.breakevenCpo,
      targetCpo: sp01v1.targetCpo,
      ceilingMessageCost: sp01v1.ceilingMessageCost,
      note: "Bảng giá nhập lô 1 đầu mùa nắng",
    },
    {
      productId: sp01.id,
      versionNumber: 2,
      effectiveFrom: d3,
      ...sp01v2Input,
      breakevenCpo: sp01v2.breakevenCpo,
      targetCpo: sp01v2.targetCpo,
      ceilingMessageCost: sp01v2.ceilingMessageCost,
      note: "Đàm phán giảm giá vốn xưởng xuống 135k & tối ưu phí ship",
    },
    {
      productId: sp02.id,
      versionNumber: 1,
      effectiveFrom: d30,
      ...sp02v1Input,
      breakevenCpo: sp02v1.breakevenCpo,
      targetCpo: sp02v1.targetCpo,
      ceilingMessageCost: sp02v1.ceilingMessageCost,
      note: "Cấu trúc giá chuẩn Q2",
    },
    {
      productId: sp03.id,
      versionNumber: 1,
      effectiveFrom: d30,
      ...sp03v1Input,
      breakevenCpo: sp03v1.breakevenCpo,
      targetCpo: sp03v1.targetCpo,
      ceilingMessageCost: sp03v1.ceilingMessageCost,
      note: "Cấu trúc giá chuẩn combo 2 đèn",
    },
  ]);

  // 5. Creatives (Google Drive metadata only — zero video bytes in DB!)
  const insertedCreatives = await db
    .insert(creatives)
    .values([
      {
        creativeCode: "CR-SP01-01",
        productId: sp01.id,
        driveFileId: "1DriveDemoFile_SP01_01_UVTest",
        driveFolderPath: "Kho_Ads/SP01/2026-04",
        fileName: "CR-SP01-01_Test_Tia_UV_Nang_Gat.mp4",
        mediaType: "video",
        fileSizeMb: 34.5,
        durationSec: 38,
        thumbnailUrl: "",
        hookAngle: "Test máy đo tia UV trực tiếp ngoài nắng 40 độ",
        lifecycleStatus: "winning",
        sizeWarning: false,
      },
      {
        creativeCode: "CR-SP01-02",
        productId: sp01.id,
        driveFileId: "1DriveDemoFile_SP01_02_SoSanh",
        driveFolderPath: "Kho_Ads/SP01/2026-04",
        fileName: "CR-SP01-02_So_Sanh_Vai_Thuong_Vs_UVPro.mp4",
        mediaType: "video",
        fileSizeMb: 42.1,
        durationSec: 45,
        thumbnailUrl: "",
        hookAngle: "So sánh nhiệt độ da dưới 2 lớp vải",
        lifecycleStatus: "bao_hoa",
        sizeWarning: false,
      },
      {
        creativeCode: "CR-SP01-03",
        productId: sp01.id,
        driveFileId: "1DriveDemoFile_SP01_03_4KRaw",
        driveFolderPath: "Kho_Ads/SP01/2026-04",
        fileName: "CR-SP01-03_Unboxing_4K_Raw_Chua_Nen.mp4",
        mediaType: "video",
        fileSizeMb: 88.4,
        durationSec: 52,
        thumbnailUrl: "",
        hookAngle: "Mở hộp cận cảnh khóa kéo & lỗ thoáng khí",
        lifecycleStatus: "cho_test",
        sizeWarning: true,
      },
      {
        creativeCode: "CR-SP01-04",
        productId: sp01.id,
        driveFileId: "1DriveDemoFile_SP01_04_Shipper",
        driveFolderPath: "Kho_Ads/SP01/2026-04",
        fileName: "CR-SP01-04_Review_Tai_Xe_8_Tieng.mp4",
        mediaType: "video",
        fileSizeMb: 29.8,
        durationSec: 28,
        thumbnailUrl: "",
        hookAngle: "Trải nghiệm thực tế chạy xe ngoài đường 8 tiếng",
        lifecycleStatus: "cho_test",
        sizeWarning: false,
      },
      {
        creativeCode: "CR-SP02-01",
        productId: sp02.id,
        driveFileId: "1DriveDemoFile_SP02_01_XayDa",
        driveFolderPath: "Kho_Ads/SP02/2026-04",
        fileName: "CR-SP02-01_Xay_Da_Vien_8_Giay.mp4",
        mediaType: "video",
        fileSizeMb: 51.2,
        durationSec: 42,
        thumbnailUrl: "",
        hookAngle: "Xay nhuyễn đá viên và hạt điều khô chỉ 8 giây",
        lifecycleStatus: "winning",
        sizeWarning: false,
      },
      {
        creativeCode: "CR-SP02-02",
        productId: sp02.id,
        driveFileId: "1DriveDemoFile_SP02_02_SuaHat",
        driveFolderPath: "Kho_Ads/SP02/2026-04",
        fileName: "CR-SP02-02_Me_Bim_Nau_Sua_Hat_HD.mp4",
        mediaType: "video",
        fileSizeMb: 92.7,
        durationSec: 58,
        thumbnailUrl: "",
        hookAngle: "Mẹ bỉm làm sữa hạt ăn dặm không cần lọc bã",
        lifecycleStatus: "dang_chay",
        sizeWarning: true,
      },
      {
        creativeCode: "CR-SP02-03",
        productId: sp02.id,
        driveFileId: "1DriveDemoFile_SP02_03_VeSinh",
        driveFolderPath: "Kho_Ads/SP02/2026-04",
        fileName: "CR-SP02-03_Tu_Ve_Sinh_1_Nut_Bam.mp4",
        mediaType: "video",
        fileSizeMb: 33.0,
        durationSec: 31,
        thumbnailUrl: "",
        hookAngle: "Chế độ tự sục rửa sạch tinh trong 30 giây",
        lifecycleStatus: "cho_test",
        sizeWarning: false,
      },
      {
        creativeCode: "CR-SP03-01",
        productId: sp03.id,
        driveFileId: "1DriveDemoFile_SP03_01_CamBien",
        driveFolderPath: "Kho_Ads/SP03/2026-04",
        fileName: "CR-SP03-01_Buoc_Chan_Den_Tu_Sang.mp4",
        mediaType: "video",
        fileSizeMb: 24.5,
        durationSec: 26,
        thumbnailUrl: "",
        hookAngle: "Đi đêm không cần mò công tắc, ánh sáng vàng dịu mắt",
        lifecycleStatus: "dang_chay",
        sizeWarning: false,
      },
      {
        creativeCode: "CR-SP03-02",
        productId: sp03.id,
        driveFileId: "1DriveDemoFile_SP03_02_NamCham",
        driveFolderPath: "Kho_Ads/SP03/2026-04",
        fileName: "CR-SP03-02_Dan_Nam_Cham_Khong_Khoan.mp4",
        mediaType: "video",
        fileSizeMb: 19.8,
        durationSec: 22,
        thumbnailUrl: "",
        hookAngle: "Lắp đặt 3 giây dán nam châm siêu dính cho tủ bếp",
        lifecycleStatus: "cho_test",
        sizeWarning: false,
      },
    ])
    .returning();

  const crByCode = new Map(insertedCreatives.map((c) => [c.creativeCode, c]));

  // 6. Meta Media Cache
  await db.insert(metaMediaCache).values([
    {
      creativeId: crByCode.get("CR-SP01-01")!.id,
      adAccountMetaId: "act_1029384756",
      metaVideoId: "948271635490112",
      encodingStatus: "ready",
    },
    {
      creativeId: crByCode.get("CR-SP01-01")!.id,
      adAccountMetaId: "act_2048571934",
      metaVideoId: "948271635490889",
      encodingStatus: "ready",
    },
    {
      creativeId: crByCode.get("CR-SP01-02")!.id,
      adAccountMetaId: "act_1029384756",
      metaVideoId: "948271635491004",
      encodingStatus: "ready",
    },
    {
      creativeId: crByCode.get("CR-SP02-01")!.id,
      adAccountMetaId: "act_1029384756",
      metaVideoId: "847162534901221",
      encodingStatus: "ready",
    },
    {
      creativeId: crByCode.get("CR-SP02-02")!.id,
      adAccountMetaId: "act_2048571934",
      metaVideoId: "847162534901775",
      encodingStatus: "ready",
    },
    {
      creativeId: crByCode.get("CR-SP03-01")!.id,
      adAccountMetaId: "act_2048571934",
      metaVideoId: "736152439801442",
      encodingStatus: "ready",
    },
  ]);

  // 7. Meta Posts (Hybrid Post ID Bank)
  await db.insert(metaPosts).values([
    {
      creativeId: crByCode.get("CR-SP01-01")!.id,
      pageMetaId: "109283746501",
      pageName: "Kova Wear - Thời Trang Chống Nắng",
      effectiveObjectStoryId: "109283746501_8841209381",
      copyVersion: "Bản chữ A",
      primaryText:
        "☀️ NẮNG 40 ĐỘ VẪN MÁT LẠNH! Áo khoác UV Pro đạt chuẩn UPF 50+ chặn 98.7% tia cực tím. Nhận ưu đãi giảm 35% + Freeship hôm nay — Nhắn tin nhận bảng size chuẩn ngay!",
      headline: "Áo Chống Nắng UV Pro - Giảm 35% Hôm Nay",
      ctaType: "SEND_MESSAGE",
      source: "launcher_flow1",
      advantagePlusDisabled: true,
    },
    {
      creativeId: crByCode.get("CR-SP01-01")!.id,
      pageMetaId: "109283746501",
      pageName: "Kova Wear - Thời Trang Chống Nắng",
      effectiveObjectStoryId: "109283746501_8841209502",
      copyVersion: "Bản chữ B",
      primaryText:
        "Đừng để tia UV làm sạm da chỉ vì áo khoác mỏng! Test trực tiếp dưới máy đo UV: UV Pro cản nắng tuyệt đối, vải thoáng khí không bí mồ hôi. Inbox shop tư vấn màu & size nhé!",
      headline: "Test Thực Tế Tia UV - Kiểm Hàng Trước Khi Trả",
      ctaType: "SEND_MESSAGE",
      source: "launcher_flow3",
      advantagePlusDisabled: true,
    },
    {
      creativeId: crByCode.get("CR-SP01-02")!.id,
      pageMetaId: "109283746501",
      pageName: "Kova Wear - Thời Trang Chống Nắng",
      effectiveObjectStoryId: "109283746501_8841209610",
      copyVersion: "Bản chữ A",
      primaryText:
        "So sánh áo chống nắng thường vs UV Pro: Chênh lệch tới 6°C ngay dưới nắng trưa! Tặng kèm khẩu trang cùng màu cho 50 khách nhắn tin sớm nhất.",
      headline: "Mua 1 Tặng 1 Khẩu Trang UV - Freeship",
      ctaType: "SEND_MESSAGE",
      source: "launcher_flow1",
      advantagePlusDisabled: true,
    },
    {
      creativeId: crByCode.get("CR-SP02-01")!.id,
      pageMetaId: "209384756102",
      pageName: "HomeSmart Official - Gia Dụng Thông Minh",
      effectiveObjectStoryId: "209384756102_7731092841",
      copyVersion: "Bản chữ A",
      primaryText:
        "🥛 Tự làm sữa hạt nóng hổi tại nhà chỉ với 1 nút bấm! Máy xay 6 lưỡi inox 304 xay mịn không cần lọc bã, bảo hành 1 đổi 1 trong 12 tháng. Nhắn tin nhận giá ưu đãi!",
      headline: "Máy Xay Sữa Hạt Mini 6 Lưỡi - Bảo Hành 12 Tháng",
      ctaType: "SEND_MESSAGE",
      source: "launcher_flow1",
      advantagePlusDisabled: true,
    },
    {
      creativeId: crByCode.get("CR-SP03-01")!.id,
      pageMetaId: "209384756102",
      pageName: "HomeSmart Official - Gia Dụng Thông Minh",
      effectiveObjectStoryId: "209384756102_7731093105",
      copyVersion: "Bản chữ A",
      primaryText:
        "💡 Bước chân xuống giường là đèn tự bật sáng dịu mắt! Pin sạc 1 lần dùng tới 60 ngày, gắn nam châm không cần khoan tường. Combo 2 chiếc chỉ 249k — Inbox đặt ngay!",
      headline: "Combo 2 Đèn Cảm Biến Thông Minh 249K",
      ctaType: "SEND_MESSAGE",
      source: "fanpage_pull",
      advantagePlusDisabled: true,
    },
  ]);

  // 8. Ad Presets (Target & Message Templates in Meta API JSON format)
  await db.insert(adPresets).values([
    {
      presetType: "target",
      code: "TGT_NU_2542_VN",
      name: "Nữ 25-42 Toàn quốc (Loại trừ Clone/Chủ Page)",
      configJson: {
        geo_locations: { countries: ["VN"] },
        age_min: 25,
        age_max: 42,
        genders: [2],
        publisher_platforms: ["facebook", "instagram"],
        facebook_positions: ["feed", "video_feeds", "facebook_reels"],
        exclusions: { behaviors: ["Facebook Page Admins"] },
      },
    },
    {
      presetType: "target",
      code: "TGT_BROAD_2245_HNHCM",
      name: "Nam & Nữ 22-45 Hà Nội & TP.HCM (Rộng)",
      configJson: {
        geo_locations: {
          cities: [
            { key: "2421836", name: "Hanoi" },
            { key: "2420605", name: "Ho Chi Minh City" },
          ],
        },
        age_min: 22,
        age_max: 45,
        genders: [1, 2],
        publisher_platforms: ["facebook"],
        facebook_positions: ["feed", "facebook_reels", "instream_video"],
      },
    },
    {
      presetType: "target",
      code: "TGT_LAL2_MUAHANG",
      name: "Lookalike 2% Tệp khách đã mua hàng (Nữ 24-45)",
      configJson: {
        geo_locations: { countries: ["VN"] },
        age_min: 24,
        age_max: 45,
        genders: [2],
        custom_audiences: [{ id: "23859102837461", name: "LAL_2pct_Purchasers_90d" }],
        publisher_platforms: ["facebook", "instagram"],
      },
    },
    {
      presetType: "message",
      code: "MSG_SP01_SIZE",
      name: "Lời chào SP01 — Hỏi màu, chiều cao cân nặng",
      configJson: {
        greeting_text:
          "Chào {{user_first_name}}! Kova Wear đang có ưu đãi giảm 35% + Freeship cho Áo Chống Nắng UV Pro hôm nay. Bạn muốn chọn mẫu nào ạ?",
        ice_breakers: [
          { question: "Cho mình xem bảng màu & giá ưu đãi hôm nay" },
          { question: "Tư vấn size theo chiều cao cân nặng giúp mình" },
          { question: "Mình muốn đặt 2 chiếc có giảm thêm không?" },
        ],
      },
    },
    {
      presetType: "message",
      code: "MSG_SP02_BAOHANH",
      name: "Lời chào SP02 — Báo giá & Chính sách bảo hành",
      configJson: {
        greeting_text:
          "Chào {{user_first_name}}! Máy xay sữa hạt mini 6 lưỡi HomeSmart bảo hành 1 đổi 1 trong 12 tháng. Bạn cần tư vấn chi tiết mục nào ạ?",
        ice_breakers: [
          { question: "Báo giá khuyến mãi hôm nay + phí ship" },
          { question: "Máy xay được hạt khô và đá viên không?" },
          { question: "Cho mình xem chế độ bảo hành & kiểm hàng" },
        ],
      },
    },
  ]);

  // 9. Multi-level Ad Insights (7 days)
  const insightRows: Array<typeof adInsights.$inferInsert> = [];
  const dates = [d6, d5, d4, d3, d2, d1, today];

  for (let idx = 0; idx < dates.length; idx++) {
    const dt = dates[idx];
    const isToday = idx === dates.length - 1;
    const factor = isToday ? 0.72 : 1;

    // Campaign 1: SP01 Winning Scale (act_1029384756) -> Triggers SCALE!
    const sp01WinSpend = Math.round((3100000 + idx * 140000) * factor);
    const sp01WinMsgs = Math.max(1, Math.round(sp01WinSpend / (22500 - idx * 250)));
    const sp01WinImp = Math.round(sp01WinSpend / 92);
    const sp01Win3s = Math.round(sp01WinImp * 0.36);
    const sp01WinThru = Math.round(sp01Win3s * 0.41);
    insightRows.push({
      reportDate: dt,
      adAccountMetaId: "act_1029384756",
      productCode: "SP01",
      campaignMetaId: "cmp_sp01_scale_01",
      campaignName: "SP01_MSG_202604_SCALE_WINNING",
      adsetMetaId: "adset_sp01_nu2542",
      adsetName: "SP01_MSG_TGT_NU_2542_VN_Scale01",
      adMetaId: "ad_sp01_cr01_a",
      adName: "SP01_MSG_202604_TGT_NU_2542_VN_CR-SP01-01_BanChuA",
      effectiveObjectStoryId: "109283746501_8841209381",
      creativeCode: "CR-SP01-01",
      entityStatus: "ACTIVE",
      dailyBudget: 3500000,
      spend: sp01WinSpend,
      impressions: sp01WinImp,
      reach: Math.round(sp01WinImp / 1.42),
      clicks: Math.round(sp01WinImp * 0.032),
      messages: sp01WinMsgs,
      video3sViews: sp01Win3s,
      thruplayViews: sp01WinThru,
      frequency: Number((1.35 + idx * 0.04).toFixed(2)),
      cpm: 92000,
      ctr: 3.24,
      costPerMessage: Math.round(sp01WinSpend / sp01WinMsgs),
    });

    // Cross-account Post ID Ad for CR-SP01-01 (act_2048571934)
    const sp01CrossSpend = Math.round((1350000 + idx * 50000) * factor);
    const sp01CrossMsgs = Math.max(1, Math.round(sp01CrossSpend / 24800));
    const sp01CrossImp = Math.round(sp01CrossSpend / 96);
    insightRows.push({
      reportDate: dt,
      adAccountMetaId: "act_2048571934",
      productCode: "SP01",
      campaignMetaId: "cmp_sp01_test_02",
      campaignName: "SP01_MSG_202604_POSTID_COPYB",
      adsetMetaId: "adset_sp01_hnhcm",
      adsetName: "SP01_MSG_TGT_BROAD_2245_HNHCM",
      adMetaId: "ad_sp01_cr01_b",
      adName: "SP01_MSG_202604_TGT_BROAD_2245_HNHCM_CR-SP01-01_BanChuB",
      effectiveObjectStoryId: "109283746501_8841209502",
      creativeCode: "CR-SP01-01",
      entityStatus: "ACTIVE",
      dailyBudget: 1500000,
      spend: sp01CrossSpend,
      impressions: sp01CrossImp,
      reach: Math.round(sp01CrossImp / 1.38),
      clicks: Math.round(sp01CrossImp * 0.029),
      messages: sp01CrossMsgs,
      video3sViews: Math.round(sp01CrossImp * 0.34),
      thruplayViews: Math.round(sp01CrossImp * 0.34 * 0.38),
      frequency: 1.48,
      cpm: 96000,
      ctr: 2.91,
      costPerMessage: Math.round(sp01CrossSpend / sp01CrossMsgs),
    });

    // Fatiguing Creative CR-SP01-02 (Frequency rising > 2.5, CTR declining 3 consecutive days!)
    const fatFreq = Number((2.1 + idx * 0.21).toFixed(2));
    const fatCtr = Number((2.95 - idx * 0.26).toFixed(2));
    const fatCpm = Math.round(94000 + idx * 7500);
    const fatSpend = Math.round(1180000 * factor);
    const fatMsgs = Math.max(1, Math.round(fatSpend / (31000 + idx * 2400)));
    const fatImp = Math.round((fatSpend / fatCpm) * 1000);
    insightRows.push({
      reportDate: dt,
      adAccountMetaId: "act_1029384756",
      productCode: "SP01",
      campaignMetaId: "cmp_sp01_scale_01",
      campaignName: "SP01_MSG_202604_SCALE_WINNING",
      adsetMetaId: "adset_sp01_lal2",
      adsetName: "SP01_MSG_TGT_LAL2_MUAHANG",
      adMetaId: "ad_sp01_cr02_a",
      adName: "SP01_MSG_202604_TGT_LAL2_MUAHANG_CR-SP01-02_BanChuA",
      effectiveObjectStoryId: "109283746501_8841209610",
      creativeCode: "CR-SP01-02",
      entityStatus: "ACTIVE",
      dailyBudget: 1200000,
      spend: fatSpend,
      impressions: fatImp,
      reach: Math.round(fatImp / fatFreq),
      clicks: Math.round(fatImp * (fatCtr / 100)),
      messages: fatMsgs,
      video3sViews: Math.round(fatImp * 0.24),
      thruplayViews: Math.round(fatImp * 0.24 * 0.26),
      frequency: fatFreq,
      cpm: fatCpm,
      ctr: fatCtr,
      costPerMessage: Math.round(fatSpend / fatMsgs),
    });

    // SP02 Winning Campaign
    const sp02Spend = Math.round((2750000 + idx * 95000) * factor);
    const sp02Msgs = Math.max(1, Math.round(sp02Spend / 27200));
    const sp02Imp = Math.round(sp02Spend / 105);
    insightRows.push({
      reportDate: dt,
      adAccountMetaId: "act_1029384756",
      productCode: "SP02",
      campaignMetaId: "cmp_sp02_main_01",
      campaignName: "SP02_MSG_202604_MAIN_SCALE",
      adsetMetaId: "adset_sp02_nu2542",
      adsetName: "SP02_MSG_TGT_NU_2542_VN",
      adMetaId: "ad_sp02_cr01_a",
      adName: "SP02_MSG_202604_TGT_NU_2542_VN_CR-SP02-01_BanChuA",
      effectiveObjectStoryId: "209384756102_7731092841",
      creativeCode: "CR-SP02-01",
      entityStatus: "ACTIVE",
      dailyBudget: 3000000,
      spend: sp02Spend,
      impressions: sp02Imp,
      reach: Math.round(sp02Imp / 1.54),
      clicks: Math.round(sp02Imp * 0.031),
      messages: sp02Msgs,
      video3sViews: Math.round(sp02Imp * 0.39),
      thruplayViews: Math.round(sp02Imp * 0.39 * 0.44),
      frequency: 1.54,
      cpm: 105000,
      ctr: 3.12,
      costPerMessage: Math.round(sp02Spend / sp02Msgs),
    });

    // SP03 Bleeding Adset -> Triggers KILL!
    const sp03Spend = isToday ? 485000 : 1280000;
    const sp03Msgs = isToday ? 0 : 18;
    const sp03Imp = Math.round(sp03Spend / 118);
    insightRows.push({
      reportDate: dt,
      adAccountMetaId: "act_2048571934",
      productCode: "SP03",
      campaignMetaId: "cmp_sp03_test_01",
      campaignName: "SP03_MSG_202604_TEST_BROAD",
      adsetMetaId: "adset_sp03_broad_bleed",
      adsetName: "SP03_MSG_TGT_BROAD_2245_HNHCM_Test02",
      adMetaId: "ad_sp03_cr01_a",
      adName: "SP03_MSG_202604_TGT_BROAD_2245_HNHCM_CR-SP03-01_BanChuA",
      effectiveObjectStoryId: "209384756102_7731093105",
      creativeCode: "CR-SP03-01",
      entityStatus: "ACTIVE",
      dailyBudget: 1500000,
      spend: sp03Spend,
      impressions: sp03Imp,
      reach: Math.round(sp03Imp / 1.78),
      clicks: Math.round(sp03Imp * 0.015),
      messages: sp03Msgs,
      video3sViews: Math.round(sp03Imp * 0.21),
      thruplayViews: Math.round(sp03Imp * 0.21 * 0.22),
      frequency: 1.78,
      cpm: 118000,
      ctr: 1.52,
      costPerMessage: sp03Msgs > 0 ? Math.round(sp03Spend / sp03Msgs) : sp03Spend,
    });
  }

  await db.insert(adInsights).values(insightRows);

  // 10. Breakdowns Heatmap Data (7 days aggregated records)
  const breakdownRows: Array<typeof insightBreakdowns.$inferInsert> = [
    // Hourly for SP01
    { reportDate: today, productCode: "SP01", dimensionType: "hour", dimensionValue: "00:00 - 04:00", spend: 4650000, impressions: 41000, messages: 86, costPerMessage: 54070 },
    { reportDate: today, productCode: "SP01", dimensionType: "hour", dimensionValue: "05:00 - 08:00", spend: 2800000, impressions: 32000, messages: 118, costPerMessage: 23729 },
    { reportDate: today, productCode: "SP01", dimensionType: "hour", dimensionValue: "09:00 - 12:00", spend: 5400000, impressions: 61000, messages: 252, costPerMessage: 21429 },
    { reportDate: today, productCode: "SP01", dimensionType: "hour", dimensionValue: "13:00 - 17:00", spend: 4900000, impressions: 54000, messages: 196, costPerMessage: 25000 },
    { reportDate: today, productCode: "SP01", dimensionType: "hour", dimensionValue: "18:00 - 21:00", spend: 6800000, impressions: 78000, messages: 334, costPerMessage: 20359 },
    { reportDate: today, productCode: "SP01", dimensionType: "hour", dimensionValue: "22:00 - 23:59", spend: 3100000, impressions: 33000, messages: 112, costPerMessage: 27679 },
    // Age & Gender for SP01
    { reportDate: today, productCode: "SP01", dimensionType: "age_gender", dimensionValue: "Nữ 18-24", spend: 3100000, impressions: 36000, messages: 94, costPerMessage: 32979 },
    { reportDate: today, productCode: "SP01", dimensionType: "age_gender", dimensionValue: "Nữ 25-34", spend: 9600000, impressions: 108000, messages: 468, costPerMessage: 20513 },
    { reportDate: today, productCode: "SP01", dimensionType: "age_gender", dimensionValue: "Nữ 35-44", spend: 6400000, impressions: 70000, messages: 294, costPerMessage: 21769 },
    { reportDate: today, productCode: "SP01", dimensionType: "age_gender", dimensionValue: "Nam 25-34", spend: 3250000, impressions: 34000, messages: 114, costPerMessage: 28509 },
    { reportDate: today, productCode: "SP01", dimensionType: "age_gender", dimensionValue: "Nam 45-54", spend: 5300000, impressions: 44000, messages: 112, costPerMessage: 47321 },
    // Platform
    { reportDate: today, productCode: "SP01", dimensionType: "platform", dimensionValue: "Facebook Feed", spend: 12400000, impressions: 132000, messages: 562, costPerMessage: 22064 },
    { reportDate: today, productCode: "SP01", dimensionType: "platform", dimensionValue: "Facebook Reels", spend: 8200000, impressions: 98000, messages: 386, costPerMessage: 21244 },
    { reportDate: today, productCode: "SP01", dimensionType: "platform", dimensionValue: "Instagram Reels", spend: 3900000, impressions: 41000, messages: 118, costPerMessage: 33051 },
    { reportDate: today, productCode: "SP01", dimensionType: "platform", dimensionValue: "Audience Network", spend: 3150000, impressions: 28000, messages: 46, costPerMessage: 68478 },
    // Region
    { reportDate: today, productCode: "SP01", dimensionType: "region", dimensionValue: "TP. Hồ Chí Minh", spend: 8900000, impressions: 96000, messages: 418, costPerMessage: 21292 },
    { reportDate: today, productCode: "SP01", dimensionType: "region", dimensionValue: "Hà Nội", spend: 6700000, impressions: 72000, messages: 310, costPerMessage: 21613 },
    { reportDate: today, productCode: "SP01", dimensionType: "region", dimensionValue: "Miền Trung (Đà Nẵng/Huế)", spend: 4800000, impressions: 53000, messages: 216, costPerMessage: 22222 },
    { reportDate: today, productCode: "SP01", dimensionType: "region", dimensionValue: "Tỉnh Miền Tây & Khác", spend: 7250000, impressions: 78000, messages: 244, costPerMessage: 29713 },
    // SP02 Breakdowns
    { reportDate: today, productCode: "SP02", dimensionType: "hour", dimensionValue: "00:00 - 04:00", spend: 2850000, impressions: 24000, messages: 48, costPerMessage: 59375 },
    { reportDate: today, productCode: "SP02", dimensionType: "hour", dimensionValue: "09:00 - 12:00", spend: 4100000, impressions: 43000, messages: 158, costPerMessage: 25949 },
    { reportDate: today, productCode: "SP02", dimensionType: "hour", dimensionValue: "18:00 - 21:00", spend: 5900000, impressions: 62000, messages: 238, costPerMessage: 24790 },
    { reportDate: today, productCode: "SP02", dimensionType: "age_gender", dimensionValue: "Nữ 25-34", spend: 6800000, impressions: 71000, messages: 274, costPerMessage: 24818 },
    { reportDate: today, productCode: "SP02", dimensionType: "age_gender", dimensionValue: "Nữ 35-44", spend: 4900000, impressions: 50000, messages: 186, costPerMessage: 26344 },
    { reportDate: today, productCode: "SP02", dimensionType: "platform", dimensionValue: "Facebook Feed", spend: 8400000, impressions: 87000, messages: 325, costPerMessage: 25846 },
    { reportDate: today, productCode: "SP02", dimensionType: "platform", dimensionValue: "Facebook Reels", spend: 4450000, impressions: 49000, messages: 171, costPerMessage: 26023 },
  ];
  await db.insert(insightBreakdowns).values(breakdownRows);

  // 11. Daily Sales Reconciliation (Google Sheets sync data)
  const salesRows: Array<typeof dailySalesReconciliation.$inferInsert> = [];
  for (let idx = 0; idx < dates.length; idx++) {
    const dt = dates[idx];
    const isToday = idx === dates.length - 1;
    const f = isToday ? 0.68 : 1;

    const sp01Orders = Math.round((56 + idx * 3) * f);
    salesRows.push({
      reportDate: dt,
      productId: sp01.id,
      ordersClosed: sp01Orders,
      actualRevenue: sp01Orders * 395000,
      returnedOrders: Math.max(1, Math.round(sp01Orders * 0.09)),
      actualReturnRatePct: 9.0,
      source: "google_sheets",
      note: "Đồng bộ tự động từ Sheet DoanhThu_T4",
    });

    const sp02Orders = Math.round((27 + idx * 2) * f);
    salesRows.push({
      reportDate: dt,
      productId: sp02.id,
      ordersClosed: sp02Orders,
      actualRevenue: sp02Orders * 545000,
      returnedOrders: Math.max(1, Math.round(sp02Orders * 0.075)),
      actualReturnRatePct: 7.5,
      source: "google_sheets",
      note: "Đồng bộ tự động từ Sheet DoanhThu_T4",
    });

    const sp03Orders = isToday ? 2 : 7;
    salesRows.push({
      reportDate: dt,
      productId: sp03.id,
      ordersClosed: sp03Orders,
      actualRevenue: sp03Orders * 249000,
      returnedOrders: 1,
      actualReturnRatePct: 12.5,
      source: "google_sheets",
      note: "Cần rà lại tỷ lệ chốt sale SP03",
    });
  }
  await db.insert(dailySalesReconciliation).values(salesRows);

  // 12. Sample Ad Drafts
  await db.insert(adDrafts).values([
    {
      flowType: "flow2_post_id",
      status: "launched_paused",
      productId: sp01.id,
      adAccountMetaId: "act_1029384756",
      pageMetaId: "109283746501",
      generatedCampaignName: `SP01_MESSAGES_${today.replaceAll("-", "")}_TGT_NU_2542_VN_CR-SP01-01_BanChuA`,
      generatedAdsetName: `SP01_TGT_NU_2542_VN_3500K_PAUSED`,
      generatedAdName: `SP01_CR-SP01-01_BanChuA_POSTID`,
      payloadJson: {
        dailyBudget: 3500000,
        effectiveObjectStoryId: "109283746501_8841209381",
        ctaType: "SEND_MESSAGE",
      },
      metaResultJson: {
        campaignId: "12021983746101",
        adsetId: "12021983746102",
        adId: "12021983746103",
        status: "PAUSED",
      },
    },
  ]);

  // 13. Action Recommendations (4 Groups)
  await db.insert(actionRecommendations).values([
    {
      category: "kill",
      priority: "high",
      title: "Cắt lỗ nhóm SP03_MSG_TGT_BROAD_2245_HNHCM_Test02",
      description:
        "Đã tiêu 485.000đ hôm nay (vượt 130% giá tin nhắn trần 26.250đ) nhưng chưa ra tin nhắn nào. CPO ước tính 3 ngày vượt xa CPO hòa vốn 133.889đ.",
      productCode: "SP03",
      adAccountMetaId: "act_2048571934",
      entityType: "adset",
      entityId: "adset_sp03_broad_bleed",
      entityName: "SP03_MSG_TGT_BROAD_2245_HNHCM_Test02",
      wastedSpend: 485000,
      metricsSnapshotJson: {
        todaySpend: 485000,
        todayMsgs: 0,
        ceilingMessageCost: 26250,
        breakevenCpo: 133889,
      },
      suggestedActionJson: {
        actionLabel: "Tắt nhóm ngay trên Trình quản lý Meta",
        type: "pause_adset",
      },
      status: "open",
    },
    {
      category: "scale",
      priority: "high",
      title: "Mở rộng nhóm thắng SP01_MSG_TGT_NU_2542_VN_Scale01",
      description:
        "Giá tin nhắn TB 3 ngày đạt 21.300đ — thấp hơn 36% so với giá trần (33.760đ), sản lượng > 140 tin/ngày rất ổn định. Đề xuất tăng ngân sách +20% hoặc nhân bản Post ID sang tài khoản phụ.",
      productCode: "SP01",
      adAccountMetaId: "act_1029384756",
      entityType: "adset",
      entityId: "adset_sp01_nu2542",
      entityName: "SP01_MSG_TGT_NU_2542_VN_Scale01",
      wastedSpend: 0,
      metricsSnapshotJson: {
        avg3dCostPerMsg: 21300,
        ceilingMessageCost: 33760,
        last3dMsgs: 432,
        currentBudget: 3500000,
      },
      suggestedActionJson: {
        actionLabel: "Tăng +20% (4.200.000đ) hoặc Nhân nhóm Post ID",
        recommendedBudgetIncreasePct: 20,
        recommendedNewBudget: 4200000,
        postId: "109283746501_8841209381",
        launcherUrl: "/launcher?flow=flow2_post_id&postId=109283746501_8841209381&product=SP01",
      },
      status: "open",
    },
    {
      category: "fatigue",
      priority: "medium",
      title: "Thay máu Creative CR-SP01-02 (Bão hòa nội dung)",
      description:
        "Tần suất đã lên 3.36 (vượt ngưỡng 2.5), CTR giảm liên tục 3 ngày (1.91% → 1.65% → 1.39%) và CPM tăng lên 139.000đ. Đề xuất đẩy 2 video Chờ test của SP01.",
      productCode: "SP01",
      adAccountMetaId: "act_1029384756",
      entityType: "creative",
      entityId: "CR-SP01-02",
      entityName: "CR-SP01-02_So_Sanh_Vai_Thuong_Vs_UVPro.mp4",
      wastedSpend: 295000,
      metricsSnapshotJson: {
        frequency: 3.36,
        ctrTrend: [1.91, 1.65, 1.39],
        cpmLatest: 139000,
      },
      suggestedActionJson: {
        actionLabel: "Đẩy video Chờ test (Luồng 1)",
        suggestedCreatives: [
          {
            creativeCode: "CR-SP01-04",
            fileName: "CR-SP01-04_Review_Tai_Xe_8_Tieng.mp4",
            hookAngle: "Trải nghiệm thực tế chạy xe ngoài đường 8 tiếng",
          },
          {
            creativeCode: "CR-SP01-03",
            fileName: "CR-SP01-03_Unboxing_4K_Raw_Chua_Nen.mp4",
            hookAngle: "Mở hộp cận cảnh khóa kéo (Nhớ nén dưới 80MB)",
          },
        ],
        launcherUrl: "/launcher?flow=flow1_drive&product=SP01",
      },
      status: "open",
    },
    {
      category: "leakage",
      priority: "medium",
      title: "Chặn rò rỉ Khung giờ: 00:00 - 04:00 (SP01)",
      description:
        "Khung giờ 00:00 - 04:00 chiếm 16.8% ngân sách 7 ngày (4.650.000đ) nhưng giá tin nhắn vọt lên 54.070đ — cao gấp 2.1x mức trung bình (25.200đ).",
      productCode: "SP01",
      adAccountMetaId: "",
      entityType: "breakdown",
      entityId: "leak_SP01_hour_00:00 - 04:00",
      entityName: "Khung giờ: 00:00 - 04:00",
      wastedSpend: 2480000,
      metricsSnapshotJson: {
        sharePct: 16.8,
        segmentCost: 54070,
        avgCost: 25200,
        multiplier: 2.15,
      },
      suggestedActionJson: {
        actionLabel: "Cài đặt lịch chạy tránh khung 0h-4h / Loại trừ Audience Network",
        dimensionType: "hour",
        dimensionValue: "00:00 - 04:00",
        launcherUrl: "/launcher?tab=presets",
      },
      status: "open",
    },
  ]);

  // 14. AI Morning Briefing (07:30)
  await db.insert(aiBriefings).values({
    briefingDate: today,
    summaryHeadline:
      "Lợi nhuận ròng hôm qua ước đạt +9,4 triệu đ (biên ròng 22,1%). SP01 & SP02 duy trì giá tin nhắn rẻ dưới trần 30%, cần cắt ngay nhóm SP03 đang đốt tiền không ra tin và xử lý nợ ngưỡng TK CL-01.",
    winsJson: [
      {
        title: "CR-SP01-01 (Test tia UV) giữ vững ngôi đầu xuyên 2 tài khoản",
        metric: "21.300đ / tin nhắn • Hook 36% • Hold 41%",
        detail:
          "Post ID 109283746501_8841209381 đạt CPO thực tế 82.400đ (rẻ hơn mục tiêu 36%), mang về hơn 62% tổng lợi nhuận ngày hôm qua.",
      },
      {
        title: "SP02 Máy Xay Sữa Hạt Mini duy trì biên lợi nhuận ròng 24,5%",
        metric: "37 đơn chốt • Doanh thu 20,1 tr • CIR 15,8%",
        detail:
          "Video CR-SP02-01 (Xay đá 8 giây) ổn định trên Facebook Reels & Feed, tỷ lệ chốt tin nhắn đạt 25,1% vượt mục tiêu 22%.",
      },
      {
        title: "Phiên bản KPI v2 của SP01 mở rộng thêm +13.000đ dư địa CPO",
        metric: "CPO hòa vốn tăng lên 211.000đ",
        detail:
          "Việc giảm giá vốn xưởng xuống 135k giúp hệ thống an toàn hơn khi tăng ngân sách scale giai đoạn nắng nóng cao điểm.",
      },
    ],
    lossesJson: [
      {
        title: "Nhóm SP03_MSG_TGT_BROAD_2245_HNHCM_Test02 đốt 485k chưa có tin",
        metric: "0 tin nhắn hôm nay • Lỗ ước tính 1,1 tr trong 3 ngày",
        detail:
          "Tỷ lệ CTR chỉ 1,52% và Hook Rate 21% quá thấp. Đề xuất tắt ngay nhóm này và đổi sang video CR-SP03-02.",
        actionPath: "/actions",
      },
      {
        title: "Tài khoản Agency CL-01 (act_3098123456) đang bị Nợ ngưỡng (Status = 3)",
        metric: "Thẻ Visa •••• 1102 lỗi trừ 14,5 tr",
        detail:
          "Cảnh báo đỏ đã gửi Telegram lúc 06:45. Cần nạp thẻ/quyết toán ngay tránh gián đoạn phân phối các chiến dịch dự phòng.",
        actionPath: "/assets",
      },
      {
        title: "Rò rỉ ngân sách khung 00:00 - 04:00 & Nam 45-54 trên SP01",
        metric: "Lãng phí ~2,48 tr trong 7 ngày gần nhất",
        detail:
          "Giá tin nhắn khung đêm cao gấp 2,1x ban ngày (54k vs 25k) và vị trí Audience Network đạt 68k/tin.",
        actionPath: "/reports?tab=breakdowns",
      },
    ],
    budgetPlanJson: [
      {
        productCode: "SP01",
        currentBudget: 6500000,
        recommendedBudget: 7800000,
        rationale:
          "Tăng +20% vào nhóm thắng CR-SP01-01 và đẩy test CR-SP01-04 (500k) thay thế video CR-SP01-02 đã bão hòa.",
      },
      {
        productCode: "SP02",
        currentBudget: 4500000,
        recommendedBudget: 5000000,
        rationale:
          "Tăng nhẹ +11% cho nhóm Nữ 25-42 Facebook Feed & Reels; nén video CR-SP02-02 xuống dưới 80MB trước khi scale thêm.",
      },
      {
        productCode: "SP03",
        currentBudget: 2500000,
        recommendedBudget: 1200000,
        rationale:
          "Cắt giảm -52% ngân sách nhóm lỗ Broad, chỉ giữ ngân sách test sáng tạo mới CR-SP03-02.",
      },
    ],
    compactInputJson: {
      date: today,
      yesterdaySpend: 9240000,
      yesterdayRevenue: 43250000,
      openRecommendations: { kill: 1, scale: 1, fatigue: 1, leakage: 1 },
      unhealthyAccounts: ["act_3098123456"],
    },
    providerUsed: "AdsPulse AI Briefing (07:30)",
    sentToTelegram: true,
  });

  // 15. Sync Logs
  await db.insert(syncLogs).values([
    {
      jobName: "meta_insights",
      status: "success",
      itemsProcessed: 35,
      durationMs: 1420,
      rateLimitPct: 28,
      message: "Đồng bộ thành công Insights 3 cấp cho 3 tài khoản đang bật Theo dõi.",
      createdAt: new Date(Date.now() - 18 * 60 * 1000),
    },
    {
      jobName: "google_sheets",
      status: "success",
      itemsProcessed: 21,
      durationMs: 840,
      rateLimitPct: 28,
      message: "Khớp 21 dòng doanh thu & đơn hoàn thực tế từ trang tính DoanhThu_T4.",
      createdAt: new Date(Date.now() - 32 * 60 * 1000),
    },
    {
      jobName: "rule_engine",
      status: "success",
      itemsProcessed: 4,
      durationMs: 310,
      rateLimitPct: 28,
      message: "Quét quy tắc khung 11h00: 1 Cắt lỗ, 1 Mở rộng, 1 Bão hòa Creative, 1 Rò rỉ.",
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
    },
    {
      jobName: "ai_briefing",
      status: "success",
      itemsProcessed: 1,
      durationMs: 2150,
      rateLimitPct: 24,
      message: "Tạo Bản tin AI Briefing 07:30 sáng và gửi bản sao qua Telegram.",
      createdAt: new Date(Date.now() - 180 * 60 * 1000),
    },
    {
      jobName: "google_drive",
      status: "success",
      itemsProcessed: 9,
      durationMs: 1180,
      rateLimitPct: 24,
      message: "Quét thư mục Kho_Ads/[Mã_SP]/[Tháng]: 9 file media, phát hiện 2 file ≥ 80MB.",
      createdAt: new Date(Date.now() - 240 * 60 * 1000),
    },
    {
      jobName: "meta_backfill_3d",
      status: "success",
      itemsProcessed: 105,
      durationMs: 3820,
      rateLimitPct: 31,
      message: "Chạy tiến trình 02:00 sáng đối chiếu lại 3 ngày gần nhất khớp tin nhắn ghi nhận trễ.",
      createdAt: new Date(Date.now() - 480 * 60 * 1000),
    },
  ]);

  // 16. Telegram Alerts (Realtime + Scheduled)
  await db.insert(telegramAlerts).values([
    {
      streamType: "realtime",
      alertCategory: "payment_error",
      title: "🚨 CẢNH BÁO ĐỎ: Tài khoản CL-01 (act_3098123456) Nợ ngưỡng thanh toán",
      body: "account_status chuyển sang 3 (UNSETTLED). Thẻ Visa •••• 1102 trừ thất bại 14.500.000đ. Vui lòng kiểm tra hạn mức thẻ ngay.",
      deepLinkPath: "/assets",
      dedupKey: `account_status_act_3098123456_3`,
      deliveryStatus: "sent",
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
    },
    {
      streamType: "realtime",
      alertCategory: "spend_spike",
      title: "⚠️ Đốt tiền bất thường: SP03_MSG_TGT_BROAD_2245_HNHCM_Test02",
      body: "Chi tiêu 1 giờ gần nhất tăng đột biến 485.000đ (vượt 130% giá tin nhắn trần) nhưng ghi nhận 0 tin nhắn.",
      deepLinkPath: "/actions",
      dedupKey: `spend_spike_adset_sp03_broad_bleed_${today}`,
      deliveryStatus: "sent",
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
    },
    {
      streamType: "scheduled",
      alertCategory: "ai_briefing",
      title: "☀️ Bản tin AI Briefing 07:30 — Lãi ròng hôm qua +9,4 triệu đ",
      body: "3 Thắng lớn: CR-SP01-01 (21.3k/tin), SP02 biên 24,5%... 3 Điểm cần xử lý: Tắt nhóm SP03, thanh toán thẻ CL-01, chặn khung 0h-4h.",
      deepLinkPath: "/",
      dedupKey: `briefing_${today}`,
      deliveryStatus: "sent",
      createdAt: new Date(Date.now() - 180 * 60 * 1000),
    },
    {
      streamType: "scheduled",
      alertCategory: "action_digest",
      title: "📋 Nhắc duyệt 4 Đề xuất Hành động khung 11h05",
      body: "Hiện có 1 thẻ Cắt lỗ (485k), 1 thẻ Mở rộng (+20% SP01), 1 thẻ Thay máu Creative và 1 thẻ Chặn rò rỉ ngân sách đang chờ xử lý.",
      deepLinkPath: "/actions",
      dedupKey: `digest_1105_${today}`,
      deliveryStatus: "sent",
      createdAt: new Date(Date.now() - 35 * 60 * 1000),
    },
  ]);
}
