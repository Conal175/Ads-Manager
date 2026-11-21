import type {
  AiBriefingStructuredOutput,
  ConnectionStatusResult,
} from "@/types/domain";

/**
 * HƯỚNG DẪN CHỈNH SỬA TRÊN GEMINI:
 * Bạn có thể sửa trực tiếp hằng số `AI_BRIEFING_SYSTEM_PROMPT` bên dưới để thay đổi
 * văn phong hoặc tiêu chí phân tích của Bản tin AI đầu ngày (07:30).
 */
export const AI_BRIEFING_SYSTEM_PROMPT = `Bạn là Giám đốc Điều hành Hiệu suất Quảng cáo Meta Ads (Performance Marketing Director) tại Việt Nam.
Dựa trên gói dữ liệu JSON tinh gọn (7 ngày gần nhất, danh sách đề xuất Cắt lỗ / Mở rộng / Bão hòa / Rò rỉ và trạng thái sức khỏe TKQC), hãy viết Bản tin AI đầu ngày súc tích, thực chiến bằng tiếng Việt:
1. summaryHeadline: Tóm tắt 2 câu ngắn gọn về chi tiêu, doanh thu thực, CIR và việc ưu tiên số 1 hôm nay.
2. winsJson: Đúng 3 điểm đang thắng lớn nhất (nêu rõ mã SP/Creative, chỉ số chứng minh và giải thích ngắn).
3. lossesJson: Đúng 3 điểm lỗ/rủi ro cần xử lý ngay kèm đường dẫn nội bộ (actionPath chỉ nhận 1 trong các giá trị: "/actions", "/assets", "/reports?tab=breakdowns", "/creatives").
4. budgetPlanJson: Kế hoạch phân bổ ngân sách ngày hôm nay cho từng sản phẩm (recommendedBudget tính bằng VNĐ nguyên dương) và lý do điều chỉnh.`;

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summaryHeadline: { type: "STRING" },
    winsJson: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          metric: { type: "STRING" },
          detail: { type: "STRING" },
        },
        required: ["title", "metric", "detail"],
      },
    },
    lossesJson: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          metric: { type: "STRING" },
          detail: { type: "STRING" },
          actionPath: { type: "STRING" },
        },
        required: ["title", "metric", "detail", "actionPath"],
      },
    },
    budgetPlanJson: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          productCode: { type: "STRING" },
          currentBudget: { type: "INTEGER" },
          recommendedBudget: { type: "INTEGER" },
          rationale: { type: "STRING" },
        },
        required: ["productCode", "currentBudget", "recommendedBudget", "rationale"],
      },
    },
  },
  required: ["summaryHeadline", "winsJson", "lossesJson", "budgetPlanJson"],
};

function normalizeGeminiModel(providerInput: string): string {
  if (!providerInput || providerInput === "gemini") return "gemini-2.5-flash";
  if (providerInput.startsWith("gemini-")) return providerInput;
  return "gemini-2.5-flash";
}

/**
 * Kiểm tra kết nối thực tế tới Google Gemini API hoặc OpenAI API
 */
export async function verifyAiConnection(
  provider: string,
  apiKey: string
): Promise<ConnectionStatusResult> {
  const checkedAt = new Date().toISOString();
  const cleanKey = apiKey.trim();

  if (!cleanKey) {
    return {
      ok: true,
      mode: "sandbox",
      checkedAt,
      message:
        "Chưa nhập GEMINI_API_KEY — Đang chạy chế độ AI Engine nội bộ (Dán khóa Gemini API hoặc cấu hình biến môi trường GEMINI_API_KEY để gọi Gemini Live).",
      details: { provider: normalizeGeminiModel(provider) },
    };
  }

  if (provider.startsWith("openai")) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${cleanKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return {
          ok: false,
          mode: "live",
          checkedAt,
          message: `OpenAI API từ chối khóa (HTTP ${res.status}).`,
        };
      }
      return {
        ok: true,
        mode: "live",
        checkedAt,
        message: "Kết nối Live OpenAI API thành công!",
        details: { provider },
      };
    } catch (err) {
      return {
        ok: false,
        mode: "live",
        checkedAt,
        message: `Không thể kết nối OpenAI API: ${err instanceof Error ? err.message : "Timeout"}`,
      };
    }
  }

  // Default & Primary: Google Gemini API live check
  const model = normalizeGeminiModel(provider);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${encodeURIComponent(
        cleanKey
      )}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        ok: false,
        mode: "live",
        checkedAt,
        message: `Google Gemini API từ chối khóa: ${
          data.error?.message || `HTTP ${res.status}`
        }`,
      };
    }
    return {
      ok: true,
      mode: "live",
      checkedAt,
      message: `Kết nối Live Google Gemini (${model}) thành công — Sẵn sàng sinh Bản tin AI Briefing cấu trúc JSON!`,
      details: {
        provider: model,
        displayName: data.displayName || model,
      },
    };
  } catch (err) {
    return {
      ok: false,
      mode: "live",
      checkedAt,
      message: `Lỗi mạng khi gọi Gemini API: ${
        err instanceof Error ? err.message : "Timeout"
      }`,
    };
  }
}

/**
 * Gọi Google Gemini API (Structured JSON Output) hoặc fallback sang bộ máy nội bộ nếu chưa cấu hình key
 */
export async function generateStructuredBriefing(params: {
  provider: string;
  apiKey: string;
  compactInputJson: Record<string, unknown>;
  fallbackOutput: AiBriefingStructuredOutput;
}): Promise<{
  output: AiBriefingStructuredOutput;
  providerUsed: string;
}> {
  const cleanKey = params.apiKey.trim();
  if (!cleanKey) {
    return {
      output: params.fallbackOutput,
      providerUsed: "AdsPulse Internal Engine (Chưa gắn GEMINI_API_KEY)",
    };
  }

  if (params.provider.startsWith("openai")) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: AI_BRIEFING_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Gói dữ liệu JSON tinh gọn:\n${JSON.stringify(
                params.compactInputJson
              )}`,
            },
          ],
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as AiBriefingStructuredOutput;
          if (parsed.summaryHeadline && Array.isArray(parsed.winsJson)) {
            return {
              output: parsed,
              providerUsed: "OpenAI GPT-4o Mini (Live)",
            };
          }
        }
      }
    } catch (err) {
      console.warn("OpenAI briefing call failed, using fallback:", err);
    }
    return {
      output: params.fallbackOutput,
      providerUsed: "AdsPulse Fallback (OpenAI lỗi kết nối)",
    };
  }

  // Google Gemini Structured Output via v1beta REST API
  const model = normalizeGeminiModel(params.provider);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        cleanKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: AI_BRIEFING_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Hãy phân tích gói JSON tinh gọn sau và trả về đúng cấu trúc JSON yêu cầu:\n${JSON.stringify(
                    params.compactInputJson
                  )}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.25,
            responseMimeType: "application/json",
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        }),
        signal: AbortSignal.timeout(18000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText) as AiBriefingStructuredOutput;
        if (
          parsed.summaryHeadline &&
          Array.isArray(parsed.winsJson) &&
          Array.isArray(parsed.lossesJson) &&
          Array.isArray(parsed.budgetPlanJson)
        ) {
          return {
            output: parsed,
            providerUsed: `Google Gemini (${model} • Live)`,
          };
        }
      }
    }
  } catch (err) {
    console.warn("Gemini generateContent failed, falling back:", err);
  }

  return {
    output: params.fallbackOutput,
    providerUsed: `AdsPulse Fallback (${model} chưa phản hồi)`,
  };
}
