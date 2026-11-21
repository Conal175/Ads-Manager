"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { getTodayIso } from "@/lib/format";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LauncherFormSection } from "@/components/launcher/LauncherFormSection";
import { PreflightAndNamingPanel } from "@/components/launcher/PreflightAndNamingPanel";
import { PresetsManagerSection } from "@/components/launcher/PresetsManagerSection";
import { DraftsHistorySection } from "@/components/launcher/DraftsHistorySection";
import type { PreflightCheckItem, TranslatedMetaError } from "@/lib/meta-errors";
import type {
  AdDraftDTO,
  AdPresetDTO,
  CreativeDTO,
  LauncherFlowType,
  MetaAssetDTO,
  MetaPostDTO,
} from "@/types/domain";

function LauncherInner() {
  const searchParams = useSearchParams();

  const [mainTab, setMainTab] = useState<"builder" | "presets" | "drafts">(
    "builder"
  );
  const [flowType, setFlowType] = useState<LauncherFlowType>("flow1_drive");

  const [productsList, setProductsList] = useState<
    Array<{ id: number; code: string; name: string }>
  >([]);
  const [adAccounts, setAdAccounts] = useState<MetaAssetDTO[]>([]);
  const [fanpages, setFanpages] = useState<MetaAssetDTO[]>([]);
  const [creativesList, setCreativesList] = useState<CreativeDTO[]>([]);
  const [postsList, setPostsList] = useState<MetaPostDTO[]>([]);
  const [presetsList, setPresetsList] = useState<AdPresetDTO[]>([]);
  const [draftsList, setDraftsList] = useState<AdDraftDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [productCode, setProductCode] = useState("SP01");
  const [objective, setObjective] = useState<
    "MESSAGES" | "CONVERSIONS" | "TRAFFIC"
  >("MESSAGES");
  const [adAccountMetaId, setAdAccountMetaId] = useState("act_1029384756");
  const [multiAccountIds, setMultiAccountIds] = useState<string[]>([
    "act_1029384756",
    "act_2048571934",
  ]);
  const [pageMetaId, setPageMetaId] = useState("109283746501");
  const [creativeId, setCreativeId] = useState<string>("");
  const [effectiveObjectStoryId, setEffectiveObjectStoryId] = useState(
    "109283746501_8841209381"
  );
  const [selectedTargetCodes, setSelectedTargetCodes] = useState<string[]>([
    "TGT_NU_2542_VN",
  ]);
  const [messagePresetCode, setMessagePresetCode] = useState("MSG_SP01_SIZE");
  const [copyVersion, setCopyVersion] = useState("BanChuA");
  const [primaryText, setPrimaryText] = useState(
    "☀️ NẮNG 40 ĐỘ VẪN MÁT LẠNH! Ưu đãi giảm 35% + Freeship hôm nay. Nhắn tin ngay nhận tư vấn size chuẩn!"
  );
  const [headline, setHeadline] = useState(
    "Ưu Đãi Giảm 35% - Kiểm Hàng Trước Khi Trả"
  );
  const [ctaType, setCtaType] = useState("SEND_MESSAGE");
  const [dailyBudget, setDailyBudget] = useState(1500000);

  const [preflightChecks, setPreflightChecks] = useState<PreflightCheckItem[]>(
    []
  );
  const [canLaunch, setCanLaunch] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [launchSteps, setLaunchSteps] = useState<
    Array<{ step: string; status: string; detail: string }>
  >([]);
  const [translatedError, setTranslatedError] =
    useState<TranslatedMetaError | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [newPreset, setNewPreset] = useState({
    presetType: "target" as "target" | "message",
    code: "TGT_MOI_2545",
    name: "Nữ 25-45 Toàn quốc (Loại trừ Audience Network)",
    configJson: JSON.stringify(
      {
        geo_locations: { countries: ["VN"] },
        age_min: 25,
        age_max: 45,
        genders: [2],
        publisher_platforms: ["facebook", "instagram"],
        facebook_positions: ["feed", "facebook_reels"],
      },
      null,
      2
    ),
  });

  const loadAll = useCallback(async () => {
    try {
      const [assetsRes, crRes, presetsRes, draftsRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/creatives"),
        fetch("/api/presets"),
        fetch("/api/launcher"),
      ]);
      const assetsJson = await assetsRes.json();
      const crJson = await crRes.json();
      const presetsJson = await presetsRes.json();
      const draftsJson = await draftsRes.json();

      const allAssets: MetaAssetDTO[] = assetsJson.assets || [];
      setAdAccounts(allAssets.filter((a) => a.assetType === "ad_account"));
      setFanpages(allAssets.filter((a) => a.assetType === "fanpage"));
      setProductsList(crJson.products || []);
      setCreativesList(crJson.creatives || []);
      setPostsList(crJson.posts || []);
      setPresetsList(presetsJson.presets || []);
      setDraftsList(draftsJson.drafts || []);

      if ((crJson.creatives || []).length > 0 && !creativeId) {
        setCreativeId(String(crJson.creatives[0].id));
      }
    } finally {
      setLoading(false);
    }
  }, [creativeId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const qFlow = searchParams.get("flow");
    const qPostId = searchParams.get("postId");
    const qProduct = searchParams.get("product");
    const qCreativeId = searchParams.get("creativeId");
    const qAdAccount = searchParams.get("adAccount");
    const qTab = searchParams.get("tab");

    if (qTab === "presets") setMainTab("presets");
    if (
      qFlow === "flow1_drive" ||
      qFlow === "flow2_post_id" ||
      qFlow === "flow3_video_id"
    ) {
      setFlowType(qFlow);
    }
    if (qPostId) {
      setEffectiveObjectStoryId(qPostId);
      const prefix = qPostId.split("_")[0];
      if (prefix) setPageMetaId(prefix);
    }
    if (qProduct) setProductCode(qProduct);
    if (qCreativeId) setCreativeId(qCreativeId);
    if (qAdAccount) setAdAccountMetaId(qAdAccount);
  }, [searchParams]);

  const selectedCreative = useMemo(
    () =>
      creativesList.find((c) => String(c.id) === String(creativeId)) ?? null,
    [creativesList, creativeId]
  );

  const dateCompact = getTodayIso().replaceAll("-", "");
  const primaryTargetCode = selectedTargetCodes[0] || "TGT_BROAD";
  const activeCreativeCode =
    flowType === "flow2_post_id"
      ? postsList
          .find((p) => p.effectiveObjectStoryId === effectiveObjectStoryId)
          ?.copyVersion.replaceAll(" ", "") || "POSTID"
      : selectedCreative?.creativeCode || "CR00";

  const generatedCampaignName = `${productCode}_${objective}_${dateCompact}_${primaryTargetCode}`;
  const generatedAdsetName = `${productCode}_${primaryTargetCode}_${Math.round(
    dailyBudget / 1000
  )}K_PAUSED`;
  const generatedAdName = `${productCode}_${objective}_${dateCompact}_${primaryTargetCode}_${activeCreativeCode}_${copyVersion.replaceAll(
    " ",
    ""
  )}`;

  const buildPayload = useCallback(() => {
    const prod = productsList.find((p) => p.code === productCode);
    return {
      flowType,
      productId: prod?.id,
      productCode,
      objective,
      adAccountMetaId:
        flowType === "flow2_post_id"
          ? multiAccountIds[0] || ""
          : adAccountMetaId,
      adAccountIds:
        flowType === "flow2_post_id" ? multiAccountIds : [adAccountMetaId],
      pageMetaId,
      creativeId: creativeId ? Number(creativeId) : undefined,
      effectiveObjectStoryId,
      targetPresetCodes: selectedTargetCodes,
      messagePresetCode,
      copyVersion,
      primaryText,
      headline,
      ctaType,
      dailyBudget,
      generatedCampaignName,
      generatedAdsetName,
      generatedAdName,
    };
  }, [
    productsList,
    productCode,
    flowType,
    objective,
    multiAccountIds,
    adAccountMetaId,
    pageMetaId,
    creativeId,
    effectiveObjectStoryId,
    selectedTargetCodes,
    messagePresetCode,
    copyVersion,
    primaryText,
    headline,
    ctaType,
    dailyBudget,
    generatedCampaignName,
    generatedAdsetName,
    generatedAdName,
  ]);

  const runPreflight = useCallback(async () => {
    if (loading) return;
    const res = await fetch("/api/launcher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preflight", ...buildPayload() }),
    });
    if (res.ok) {
      const json = await res.json();
      setPreflightChecks(json.preflight?.checks || []);
      setCanLaunch(Boolean(json.preflight?.canLaunch));
    }
  }, [loading, buildPayload]);

  useEffect(() => {
    const t = setTimeout(() => {
      runPreflight();
    }, 250);
    return () => clearTimeout(t);
  }, [runPreflight]);

  const handleSaveDraft = async () => {
    setBanner(null);
    const res = await fetch("/api/launcher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_draft", ...buildPayload() }),
    });
    const json = await res.json();
    if (res.ok) {
      setBanner(json.message);
      await loadAll();
    }
  };

  const handleLaunchPaused = async () => {
    setLaunching(true);
    setTranslatedError(null);
    setLaunchSteps([]);
    setBanner(null);
    try {
      const res = await fetch("/api/launcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "launch", ...buildPayload() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTranslatedError(json.translatedError || null);
        if (json.preflight?.checks) setPreflightChecks(json.preflight.checks);
      } else {
        setLaunchSteps(json.steps || []);
        setBanner(json.message);
        await loadAll();
      }
    } finally {
      setLaunching(false);
    }
  };

  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPreset),
    });
    if (res.ok) {
      setBanner(`Đã lưu mẫu cấu hình ${newPreset.code} vào thư viện Presets.`);
      await loadAll();
    } else {
      const json = await res.json();
      setBanner(json.error || "Lỗi lưu mẫu.");
    }
  };

  const handleDeletePreset = async (id: number) => {
    const res = await fetch(`/api/presets?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setPresetsList((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Trình Lên Ads Bán tự động 3 Luồng
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tự động đặt tên chuẩn Auto-Naming, kiểm tra an toàn Pre-flight và khóa cứng <code>status = PAUSED</code>.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-200/70 p-1">
          <button
            onClick={() => setMainTab("builder")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              mainTab === "builder"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            Trình tạo Ads (3 Luồng)
          </button>
          <button
            onClick={() => setMainTab("presets")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              mainTab === "presets"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            Thư viện Presets ({presetsList.length})
          </button>
          <button
            onClick={() => setMainTab("drafts")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              mainTab === "drafts"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            Nháp & Lịch sử ({draftsList.length})
          </button>
        </div>
      </div>

      <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
        <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>
          <strong>Chế độ an toàn PAUSED bắt buộc:</strong> Mọi chiến dịch, nhóm quảng cáo và bài quảng cáo đẩy từ AdsPulse OS lên Meta đều gắn cờ{" "}
          <code className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100">
            status = PAUSED
          </code>{" "}
          để bạn duyệt lần cuối rồi tự bấm bật thủ công trên Meta Ads Manager.
        </span>
      </div>

      <FeedbackBanner
        message={banner}
        variant="info"
        onClose={() => setBanner(null)}
      />

      {mainTab === "builder" && (
        <LauncherFormSection
          flowType={flowType}
            onChangeFlowType={(f) => {
              setFlowType(f);
              setTranslatedError(null);
              setLaunchSteps([]);
            }}
            productsList={productsList}
            productCode={productCode}
            onChangeProductCode={setProductCode}
            objective={objective}
            onChangeObjective={setObjective}
            dailyBudget={dailyBudget}
            onChangeDailyBudget={setDailyBudget}
            adAccounts={adAccounts}
            adAccountMetaId={adAccountMetaId}
            onChangeAdAccountMetaId={setAdAccountMetaId}
            multiAccountIds={multiAccountIds}
            onToggleMultiAccount={(metaId) =>
              setMultiAccountIds((prev) =>
                prev.includes(metaId)
                  ? prev.filter((x) => x !== metaId)
                  : [...prev, metaId]
              )
            }
            fanpages={fanpages}
            pageMetaId={pageMetaId}
            onChangePageMetaId={setPageMetaId}
            ctaType={ctaType}
            onChangeCtaType={setCtaType}
            postsList={postsList}
            effectiveObjectStoryId={effectiveObjectStoryId}
            onChangeEffectiveObjectStoryId={setEffectiveObjectStoryId}
            creativesList={creativesList}
            creativeId={creativeId}
            onChangeCreativeId={setCreativeId}
            copyVersion={copyVersion}
            onChangeCopyVersion={setCopyVersion}
            headline={headline}
            onChangeHeadline={setHeadline}
            primaryText={primaryText}
            onChangePrimaryText={setPrimaryText}
            targetPresets={presetsList.filter((p) => p.presetType === "target")}
            selectedTargetCodes={selectedTargetCodes}
            onToggleTargetPreset={(code) => {
              if (flowType === "flow2_post_id") {
                setSelectedTargetCodes((prev) =>
                  prev.includes(code)
                    ? prev.length > 1
                      ? prev.filter((x) => x !== code)
                      : prev
                    : [...prev, code]
                );
              } else {
                setSelectedTargetCodes([code]);
              }
            }}
            messagePresets={presetsList.filter(
              (p) => p.presetType === "message"
            )}
            messagePresetCode={messagePresetCode}
            onChangeMessagePresetCode={setMessagePresetCode}
          rightPanel={
            <PreflightAndNamingPanel
              generatedCampaignName={generatedCampaignName}
              generatedAdsetName={generatedAdsetName}
              generatedAdName={generatedAdName}
              preflightChecks={preflightChecks}
              canLaunch={canLaunch}
              translatedError={translatedError}
              launching={launching}
              launchSteps={launchSteps}
              onSaveDraft={handleSaveDraft}
              onLaunchPaused={handleLaunchPaused}
            />
          }
        />
      )}

      {mainTab === "presets" && (
        <PresetsManagerSection
          presetsList={presetsList}
          newPreset={newPreset}
          onChangeNewPreset={setNewPreset}
          onCreatePreset={handleCreatePreset}
          onDeletePreset={handleDeletePreset}
        />
      )}

      {mainTab === "drafts" && (
        <DraftsHistorySection
          draftsList={draftsList}
          onLoadDraft={(d) => {
            const p = d.payloadJson;
            if (typeof p.dailyBudget === "number") setDailyBudget(p.dailyBudget);
            if (typeof p.effectiveObjectStoryId === "string")
              setEffectiveObjectStoryId(p.effectiveObjectStoryId);
            if (
              d.flowType === "flow1_drive" ||
              d.flowType === "flow2_post_id" ||
              d.flowType === "flow3_video_id"
            ) {
              setFlowType(d.flowType);
            }
            setMainTab("builder");
            setBanner(`Đã nạp lại cấu hình từ bản ghi #${d.id}.`);
          }}
        />
      )}
    </div>
  );
}

export default function LauncherPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 bg-white rounded-xl border border-slate-200 animate-pulse" />
      }
    >
      <LauncherInner />
    </Suspense>
  );
}
