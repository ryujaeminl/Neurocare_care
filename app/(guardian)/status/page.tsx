"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Medication } from "@prisma/client";
import { ConversationHistorySection } from "@/components/guardian/ConversationHistorySection";
import { MoodChart, type MoodPoint } from "@/components/MoodChart";
import { useLinkedPatients } from "@/hooks/useLinkedPatients";
import { MOOD_LABELS, MOOD_VALUES, isMood, type Mood } from "@/lib/db/types";

interface HistorySessionSummary {
  id: string;
  startedAt: string;
  turnCount: number;
  mood: { mood: string; confidence: number; summary: string } | null;
}

interface SessionTurn {
  id: string;
  role: string;
  text: string;
  createdAt: string;
}

interface SessionDetail {
  id: string;
  startedAt: string;
  turns: SessionTurn[];
  mood: { mood: string; confidence: number; summary: string; notableMoments: string[] } | null;
}

function isActive(endDate: Date | string | null) {
  return !endDate || new Date(endDate).getTime() >= Date.now();
}

export default function StatusPage() {
  const { patients, selectedId, setSelectedId, loading: loadingPatients } = useLinkedPatients();
  const [sessions, setSessions] = useState<HistorySessionSummary[]>([]);
  const [latestDetail, setLatestDetail] = useState<SessionDetail | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [historyData, medsData] = await Promise.all([
          fetch(`/api/history?patientId=${selectedId}`).then((r) => r.json()),
          fetch(`/api/guardian/medications?patientId=${selectedId}`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        const list: HistorySessionSummary[] = historyData.sessions ?? [];
        setSessions(list);
        setMedications(medsData.medications ?? []);

        const latestId = list[0]?.id;
        if (latestId) {
          const detailData = await fetch(`/api/history?patientId=${selectedId}&sessionId=${latestId}`).then((r) =>
            r.json(),
          );
          if (!cancelled) setLatestDetail(detailData.session ?? null);
        } else if (!cancelled) {
          setLatestDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const moodPoints: MoodPoint[] = useMemo(
    () =>
      [...sessions]
        .reverse()
        .filter((s) => s.mood && isMood(s.mood.mood))
        .map((s) => ({ date: s.startedAt.slice(0, 10), mood: s.mood!.mood as Mood })),
    [sessions],
  );

  const todayMood = latestDetail?.mood && isMood(latestDetail.mood.mood) ? (latestDetail.mood.mood as Mood) : null;
  const activeMeds = medications.filter((m) => isActive(m.endDate));

  if (loadingPatients) return <p className="text-muted-foreground">불러오는 중...</p>;
  if (patients.length === 0) {
    return <p className="text-muted-foreground">연동된 환자가 없습니다. 먼저 환자를 연동해주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <Link
          href="/medications"
          className="flex-1 rounded-2xl border border-surface-border bg-surface px-4 py-3 text-center text-sm font-medium hover:border-accent/50"
        >
          💊 복용약 관리
        </Link>
        <Link
          href="/emergency"
          className="flex-1 rounded-2xl border border-surface-border bg-surface px-4 py-3 text-center text-sm font-medium hover:border-accent/50"
        >
          🚨 긴급 이력
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {patients.map((patient) => (
          <button
            key={patient.id}
            type="button"
            onClick={() => setSelectedId(patient.id)}
            className={`rounded-2xl border px-5 py-3 text-left font-semibold transition ${
              selectedId === patient.id
                ? "border-accent bg-accent/10"
                : "border-surface-border bg-surface hover:border-accent/50"
            }`}
          >
            {patient.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : (
        <>
          {/* 오늘의 기분 - 실제 분석값만 강조 표시(선택 불가, AI가 분석한 값이라) */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">오늘의 기분</h2>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_VALUES.map((moodValue) => {
                const active = moodValue === todayMood;
                return (
                  <div
                    key={moodValue}
                    className={`flex flex-col items-center rounded-2xl border p-3 transition ${
                      active ? "border-accent bg-accent/10" : "border-surface-border bg-surface opacity-50"
                    }`}
                  >
                    <span className="mb-1 text-2xl">{MOOD_LABELS[moodValue].emoji}</span>
                    <span className={`text-center text-[11px] font-bold ${active ? "text-accent" : "text-muted-foreground"}`}>
                      {MOOD_LABELS[moodValue].label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* AI 대화 요약 + 복용약 현황 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-accent/10 border border-accent/30 p-6 md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <span>✨</span>
                <h3 className="text-lg font-semibold">AI 대화 요약</h3>
              </div>
              {latestDetail?.mood ? (
                <>
                  <p className="mb-4 leading-relaxed text-muted-foreground">&ldquo;{latestDetail.mood.summary}&rdquo;</p>
                  {latestDetail.mood.notableMoments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {latestDetail.mood.notableMoments.slice(0, 4).map((moment, i) => (
                        <span key={i} className="rounded-full border border-accent/30 bg-background px-3 py-1 text-xs">
                          {moment}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">아직 분석된 대화 요약이 없습니다.</p>
              )}
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-surface-border bg-surface p-6">
              <div>
                <h3 className="mb-3 text-xs font-medium text-muted-foreground">복용약 현황</h3>
                {activeMeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">등록된 약이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {activeMeds.slice(0, 3).map((med) => (
                      <div key={med.id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">💊 {med.name}</span>
                        <span className="text-sm font-semibold">{med.frequency}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 border-t border-surface-border pt-3 text-xs text-muted-foreground">
                {activeMeds.length}개 복용 중
              </div>
            </div>
          </div>

          {/* 기분 추이 */}
          <section className="rounded-2xl border border-surface-border bg-surface p-6">
            <h3 className="mb-1 text-lg font-semibold">기분 추이</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              의학적 진단이 아니라 대화에서 드러난 정서적 톤을 참고용으로 정리한 것입니다.
            </p>
            <MoodChart points={moodPoints} />
          </section>

          {selectedId && <ConversationHistorySection key={selectedId} patientId={selectedId} />}
        </>
      )}
    </div>
  );
}
