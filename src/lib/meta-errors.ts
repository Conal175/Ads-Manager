export interface TranslatedMetaError {
  code: string;
  subcode?: string;
  field?: string;
  title: string;
  cause: string;
  fix: string;
}

const META_ERROR_MAP: Record<string, Omit<TranslatedMetaError, "code" | "subcode">> = {
  "190": {
    field: "metaSystemUserToken",
    title: "Token Meta đã hết hạn hoặc bị thu hồi",
    cause: "System User Token không hợp lệ hoặc đã bị thu hồi quyền trên Business Manager.",
    fix: "Vào Cài đặt kết nối API, tạo lại System User Token không hết hạn với đủ 4 quyền bắt buộc.",
  },
  "100:1487390": {
    field: "effectiveObjectStoryId",
    title: "Post ID không thuộc Fanpage hoặc chưa công khai",
    cause: "Mã bài viết (effective_object_story_id) không khớp với Fanpage đang chọn hoặc bài viết đang bị giới hạn đối tượng.",
    fix: "Kiểm tra lại tiền tố {page_id} trong mã Post ID khớp với Page đang chọn, hoặc dùng nút Kéo bài từ Fanpage.",
  },
  "100:1885183": {
    field: "ctaType",
    title: "Nút CTA không tương thích với Mục tiêu chiến dịch",
    cause: "Mục tiêu Tin nhắn (OUTCOME_ENGAGEMENT / Messenger) bắt buộc sử dụng nút Gửi tin nhắn (SEND_MESSAGE).",
    fix: "Đổi nút CTA bài viết sang SEND_MESSAGE hoặc chọn bài viết khác có gắn nút Gửi tin nhắn.",
  },
  "100:2446391": {
    field: "dailyBudget",
    title: "Ngân sách ngày thấp hơn mức tối thiểu của Meta",
    cause: "Ngân sách nhóm quảng cáo nhỏ hơn mức tối thiểu theo tiền tệ tài khoản (~25.000đ/ngày).",
    fix: "Tăng ngân sách ngày tối thiểu lên 50.000đ trở lên.",
  },
  "2635": {
    field: "adAccountMetaId",
    title: "Tài khoản quảng cáo đang bị vô hiệu hóa hoặc nợ ngưỡng",
    cause: "Tài khoản quảng cáo đích có account_status khác 1 (bị hạn chế hoặc lỗi thẻ thanh toán).",
    fix: "Thanh toán số dư nợ ngưỡng trong Meta Billing hoặc chuyển sang tài khoản quảng cáo khác đang hoạt động.",
  },
  "1487851": {
    field: "creativeId",
    title: "Video Google Drive không thể tải do vượt 100MB hoặc chưa mở quyền xem",
    cause: "Meta máy chủ không kéo được file_url vì Drive hiện trang cảnh báo quét virus (>100MB) hoặc file chưa chia sẻ quyền.",
    fix: "Nén video xuống dưới 80MB và bật quyền 'Bất kỳ ai có đường liên kết đều xem được' trên Google Drive.",
  },
  "17": {
    field: "rateLimit",
    title: "Vượt hạn mức gọi API Meta (User Request Limit Reached)",
    cause: "Tài khoản vượt quá 100% hạn mức x-business-use-case-usage trong khung giờ hiện tại.",
    fix: "Bật chế độ Giãn chu kỳ đồng bộ trong mục Hệ thống và thử lại sau 15 phút.",
  },
  "80004": {
    field: "rateLimit",
    title: "Quá nhiều yêu cầu lên cùng một Tài khoản quảng cáo",
    cause: "Meta giới hạn tần suất tạo chiến dịch đồng loạt trên tài khoản này.",
    fix: "Giảm số nhóm đẩy cùng lúc hoặc chờ 3-5 phút rồi đẩy tiếp.",
  },
};

export function translateMetaError(
  errorCode: string | number,
  errorSubcode?: string | number,
  fallbackMessage?: string
): TranslatedMetaError {
  const code = String(errorCode);
  const subcode = errorSubcode ? String(errorSubcode) : undefined;
  const combinedKey = subcode ? `${code}:${subcode}` : code;
  const match = META_ERROR_MAP[combinedKey] ?? META_ERROR_MAP[code];

  if (match) {
    return { code, subcode, ...match };
  }

  return {
    code,
    subcode,
    title: `Lỗi Meta API (Mã ${combinedKey})`,
    cause: fallbackMessage || "Meta Marketing API từ chối yêu cầu tạo chiến dịch.",
    fix: "Kiểm tra lại quyền tài khoản quảng cáo, Fanpage và cấu hình mục tiêu trước khi thử lại.",
  };
}

export interface PreflightInput {
  flowType: "flow1_drive" | "flow2_post_id" | "flow3_video_id";
  objective: "MESSAGES" | "CONVERSIONS" | "TRAFFIC";
  dailyBudget: number;
  dailyBudgetSafetyCap: number;
  adAccountMetaId: string;
  adAccountStatus?: number;
  pageMetaId: string;
  ctaType: string;
  effectiveObjectStoryId?: string;
  creativeFileSizeMb?: number;
  targetPresetIds?: number[];
  adAccountIds?: string[];
  hasCachedVideo?: boolean;
}

export interface PreflightCheckItem {
  id: string;
  field: string;
  level: "pass" | "warning" | "error";
  title: string;
  detail: string;
}

export function runPreflightChecks(input: PreflightInput): {
  canLaunch: boolean;
  hasWarnings: boolean;
  checks: PreflightCheckItem[];
} {
  const checks: PreflightCheckItem[] = [];

  // 1. PAUSED safety lock check
  checks.push({
    id: "paused_lock",
    field: "status",
    level: "pass",
    title: "Chế độ an toàn status = PAUSED đã khóa",
    detail: "Mọi Campaign, Ad Set, Ad đẩy lên đều ở trạng thái TẠM DỪNG để bạn kiểm tra lần cuối.",
  });

  // 2. Ad Account health check
  if (!input.adAccountMetaId && (!input.adAccountIds || input.adAccountIds.length === 0)) {
    checks.push({
      id: "ad_account_missing",
      field: "adAccountMetaId",
      level: "error",
      title: "Chưa chọn Tài khoản quảng cáo đích",
      detail: "Vui lòng chọn ít nhất một tài khoản quảng cáo đang hoạt động (account_status = 1).",
    });
  } else if (input.adAccountStatus !== undefined && input.adAccountStatus !== 1) {
    checks.push({
      id: "ad_account_unhealthy",
      field: "adAccountMetaId",
      level: "error",
      title: "Tài khoản quảng cáo đích không ở trạng thái Đang chạy",
      detail: "Tài khoản đang bị vô hiệu hóa / nợ ngưỡng (account_status ≠ 1). Meta sẽ trả mã lỗi 2635.",
    });
  } else {
    checks.push({
      id: "ad_account_ok",
      field: "adAccountMetaId",
      level: "pass",
      title: "Tài khoản quảng cáo khỏe mạnh (account_status = 1)",
      detail: "Đủ điều kiện khởi tạo chiến dịch mới.",
    });
  }

  // 3. Daily budget safety check
  if (input.dailyBudget < 50000) {
    checks.push({
      id: "budget_min",
      field: "dailyBudget",
      level: "error",
      title: "Ngân sách ngày dưới ngưỡng tối thiểu",
      detail: "Ngân sách mỗi nhóm phải từ 50.000đ trở lên (tránh lỗi Meta 100:2446391).",
    });
  } else if (input.dailyBudget > input.dailyBudgetSafetyCap) {
    checks.push({
      id: "budget_cap",
      field: "dailyBudget",
      level: "warning",
      title: `Ngân sách ngày vượt ngưỡng an toàn (${input.dailyBudgetSafetyCap.toLocaleString("vi-VN")}đ)`,
      detail: "Kiểm tra kỹ xem bạn có gõ dư số 0 hay không trước khi đẩy lên Meta.",
    });
  } else {
    checks.push({
      id: "budget_ok",
      field: "dailyBudget",
      level: "pass",
      title: "Ngân sách ngày nằm trong ngưỡng an toàn",
      detail: `${input.dailyBudget.toLocaleString("vi-VN")}đ/ngày ≤ trần an toàn ${input.dailyBudgetSafetyCap.toLocaleString("vi-VN")}đ.`,
    });
  }

  // 4. CTA compatibility with Objective
  if (input.objective === "MESSAGES" && input.ctaType !== "SEND_MESSAGE") {
    checks.push({
      id: "cta_mismatch",
      field: "ctaType",
      level: "error",
      title: "Nút CTA không tương thích với mục tiêu Tin nhắn",
      detail: `Đang chọn CTA "${input.ctaType}", nhưng mục tiêu Tin nhắn yêu cầu nút "SEND_MESSAGE" (lỗi Meta 100:1885183).`,
    });
  } else {
    checks.push({
      id: "cta_ok",
      field: "ctaType",
      level: "pass",
      title: "Nút kêu gọi hành động (CTA) tương thích mục tiêu",
      detail: `CTA ${input.ctaType} khớp với mục tiêu ${input.objective}.`,
    });
  }

  // 5. Flow-specific checks
  if (input.flowType === "flow1_drive") {
    if ((input.creativeFileSizeMb ?? 0) >= 80) {
      checks.push({
        id: "drive_size_warning",
        field: "creativeId",
        level: "warning",
        title: `Video dung lượng lớn (${input.creativeFileSizeMb} MB ≥ 80 MB)`,
        detail: "Cảnh báo vàng: Nên nén video xuống dưới 80MB để tránh Google Drive chèn trang cảnh báo quét virus ở mốc 100MB khi Meta kéo file_url.",
      });
    } else {
      checks.push({
        id: "drive_size_ok",
        field: "creativeId",
        level: "pass",
        title: "Dung lượng video Google Drive đạt chuẩn (< 80MB)",
        detail: "An toàn để đẩy trực tiếp qua file_url sang máy chủ Meta.",
      });
    }
  }

  if (input.flowType === "flow2_post_id") {
    const postId = (input.effectiveObjectStoryId || "").trim();
    if (!postId || !postId.includes("_")) {
      checks.push({
        id: "post_id_invalid",
        field: "effectiveObjectStoryId",
        level: "error",
        title: "Mã Post ID không đúng định dạng {page_id}_{post_id}",
        detail: "Vui lòng chọn bài viết từ Kho meta_posts hoặc nhập đúng định dạng {page_id}_{post_id}.",
      });
    } else if (input.pageMetaId && !postId.startsWith(`${input.pageMetaId}_`)) {
      checks.push({
        id: "post_id_page_mismatch",
        field: "effectiveObjectStoryId",
        level: "error",
        title: "Post ID không khớp với Fanpage đang chọn",
        detail: `Post ID "${postId}" không bắt đầu bằng Page ID "${input.pageMetaId}". Meta sẽ từ chối với mã lỗi 100:1487390.`,
      });
    } else {
      checks.push({
        id: "post_id_ok",
        field: "effectiveObjectStoryId",
        level: "pass",
        title: "Post ID khớp Fanpage đích — Sẵn sàng scale đa tài khoản",
        detail: "Bỏ qua hoàn toàn bước đọc Drive & mã hóa video, dồn tương tác về chung bài gốc.",
      });
    }
  }

  if (input.flowType === "flow3_video_id") {
    if (!input.hasCachedVideo) {
      checks.push({
        id: "video_cache_missing",
        field: "creativeId",
        level: "error",
        title: "Video chưa có trong meta_media_cache của tài khoản đích",
        detail: "Luồng 3 yêu cầu video đã được tải lên tài khoản này trước đó. Hãy dùng Luồng 1 cho lần đầu tiên.",
      });
    } else {
      checks.push({
        id: "video_cache_hit",
        field: "creativeId",
        level: "pass",
        title: "Đã tìm thấy meta_video_id trong bộ đệm (Cache Hit)",
        detail: "Tái sử dụng Video ID tức thì không đụng Google Drive để tạo phiên bản nội dung chữ mới.",
      });
    }
  }

  const canLaunch = !checks.some((c) => c.level === "error");
  const hasWarnings = checks.some((c) => c.level === "warning");

  return { canLaunch, hasWarnings, checks };
}
