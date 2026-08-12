"use client";

import Link from "next/link";
import { useState } from "react";

export interface EmergencyEventDetail {
  id: string;
  patientId: string;
  triggerType: string;
  detail: string | null;
  status: string;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  patient: { name: string };
}

const TRIGGER_LABELS: Record<string, string> = {
  voice_distress: "대화 중 도움을 요청하는 말을 했습니다",
  manual_button: "긴급 호출 버튼을 눌렀습니다",
  session_timeout: "대화가 응답 없이 중단되었습니다",
  mood_critical: "정서 상태가 심각하게 우려됩니다",
};

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  return `${Math.round(minutes / 60)}시간 전`;
}

interface EmergencySosCardProps {
  event: EmergencyEventDetail;
  onAcknowledged: (event: EmergencyEventDetail) => void;
  /** "fullscreen"은 안드로이드 전체화면 인텐트(잠금화면 위)로 열리는 단독 페이지 전용 -
   * 방 반대편에서도 한눈에 "위급 상황"임을 알아볼 수 있게 화면 전체를 채우는 큰 글씨/고대비
   * 디자인을 쓴다. 목록 화면(app/(guardian)/emergency/page.tsx)의 카드형은 "compact" 그대로. */
  variant?: "compact" | "fullscreen";
}

/** 긴급 상황 확인 화면. 실제로 되는 액션만 둔다: 119 신고(진짜 tel: 링크), 최근 대화 보기, 확인 처리. */
export function EmergencySosCard({ event, onAcknowledged, variant = "compact" }: EmergencySosCardProps) {
  const [acking, setAcking] = useState(false);
  const isOpen = event.status === "open";

  async function handleAcknowledge() {
    setAcking(true);
    try {
      await fetch(`/api/emergency/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acknowledged" }),
      });
      // PATCH 응답에는 acknowledgedByName(조인된 값)이 없어서, 확인한 사람 이름을
      // 보여주려면 GET으로 다시 가져와야 한다.
      const detailResponse = await fetch(`/api/emergency/${event.id}`);
      const detailData = await detailResponse.json();
      if (detailResponse.ok) onAcknowledged(detailData.event);
    } finally {
      setAcking(false);
    }
  }

  if (variant === "fullscreen") {
    return (
      <div
        className={`flex min-h-screen flex-col text-white ${
          isOpen ? "animate-pulse-red bg-rose-600" : "bg-slate-700"
        }`}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <div className="text-7xl">🆘</div>
          <h1 className="text-5xl font-extrabold leading-tight sm:text-6xl">
            {event.patient.name} 어르신
          </h1>
          <p className="text-3xl font-bold sm:text-4xl">{isOpen ? "SOS 발생" : "SOS 확인됨"}</p>
          <p className="text-lg opacity-90 sm:text-xl">
            {TRIGGER_LABELS[event.triggerType] ?? "확인이 필요합니다"}
          </p>
          <p className="text-base opacity-75">{timeAgo(event.createdAt)}</p>
          {event.detail && (
            <div className="mt-2 max-w-md rounded-xl bg-black/20 p-4 text-base">{event.detail}</div>
          )}
          {event.acknowledgedByName && (
            <p className="mt-2 text-base opacity-90">
              {event.acknowledgedByName}님이 확인했습니다
              {event.acknowledgedAt && ` (${new Date(event.acknowledgedAt).toLocaleString("ko-KR")})`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <a
            href="tel:119"
            className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-white text-3xl font-extrabold text-rose-600 shadow-lg transition active:scale-[0.98]"
          >
            📞 119 긴급 신고
          </a>
          {isOpen && (
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={acking}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-white/20 text-2xl font-bold text-white transition hover:bg-white/30 disabled:opacity-50"
            >
              {acking ? "처리 중..." : "✅ 확인했습니다"}
            </button>
          )}
          <Link
            href="/"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/40 text-lg font-medium text-white"
          >
            대시보드로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-surface-border bg-surface">
      {/* 상단 헤더 */}
      <div
        className={`flex items-center gap-4 p-6 ${
          isOpen ? "animate-pulse-red border-b-2 border-rose-500 bg-danger-bg" : "border-b border-surface-border bg-surface"
        }`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-2xl">
          🆘
        </div>
        <div>
          <h1 className="text-xl font-bold">
            {event.patient.name} 어르신 {isOpen ? "SOS 발생" : "SOS 확인됨"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {TRIGGER_LABELS[event.triggerType] ?? "확인이 필요합니다"} · {timeAgo(event.createdAt)}
          </p>
        </div>
      </div>

      {/* 상태 카드 */}
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span className="mb-1 block text-xs text-muted-foreground">환자 상태</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{event.patient.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  isOpen ? "bg-danger-bg text-danger-foreground" : "bg-emerald-500/20 text-emerald-700"
                }`}
              >
                {isOpen ? "미확인" : "확인됨"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="mb-1 block text-xs text-muted-foreground">발생 시각</span>
            <p className="text-sm font-medium">{new Date(event.createdAt).toLocaleString("ko-KR")}</p>
          </div>
        </div>

        {event.detail && (
          <div className="mb-2 rounded-xl bg-background p-3 text-sm text-muted-foreground">{event.detail}</div>
        )}

        {event.acknowledgedByName && (
          <p className="mt-2 text-sm text-emerald-700">
            {event.acknowledgedByName}님이 확인했습니다
            {event.acknowledgedAt && ` (${new Date(event.acknowledgedAt).toLocaleString("ko-KR")})`}
          </p>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-3 border-t border-surface-border p-6">
        <a
          href="tel:119"
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-rose-500 text-lg font-bold text-white transition active:scale-[0.98]"
        >
          📞 119 긴급 신고
        </a>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/status"
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-surface-border font-medium transition hover:border-accent/50"
          >
            💬 대화 기록 보기
          </Link>
          {isOpen ? (
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={acking}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {acking ? "처리 중..." : "✅ 확인했습니다"}
            </button>
          ) : (
            <Link
              href="/"
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-medium text-accent-foreground transition hover:brightness-110"
            >
              대시보드로
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
