"use client";

import { useEffect, useState } from "react";
import { MOOD_LABELS, isMood } from "@/lib/db/types";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

/**
 * 하루 1세션 구조라 세션 목록 = 날짜별 대화 기록이다. 저장된 전체 기록(최대 500일치,
 * app/api/history/route.ts 참고)을 처음부터 다 보여주고, 스크롤로 훑어본다.
 */
export function ConversationHistorySection({ patientId }: { patientId: string }) {
  const [sessions, setSessions] = useState<HistorySessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function openSession(sessionId: string) {
    setSelectedId(sessionId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/history?patientId=${patientId}&sessionId=${sessionId}`);
      const data = await response.json();
      if (response.ok) setDetail(data.session ?? null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/history?patientId=${patientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: HistorySessionSummary[] = data.sessions ?? [];
        setSessions(list);
        if (list[0]) void openSession(list[0].id);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">대화 기록</h2>

      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : sessions.length === 0 ? (
        <p className="text-muted-foreground">아직 저장된 대화가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
            {sessions.map((session) => {
              const mood = session.mood && isMood(session.mood.mood) ? session.mood.mood : null;
              const active = session.id === selectedId;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => openSession(session.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active ? "border-accent bg-accent/10" : "border-surface-border bg-surface hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{formatDate(session.startedAt)}</span>
                      {mood && (
                        <span className={`text-xs ${MOOD_LABELS[mood].className}`}>
                          {MOOD_LABELS[mood].emoji} {MOOD_LABELS[mood].label}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">대화 {session.turnCount}번</p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-surface-border bg-surface p-4">
            {detailLoading && <p className="text-muted-foreground">불러오는 중...</p>}
            {!detailLoading && detail && (
              <div className="flex flex-col gap-3">
                {detail.mood && isMood(detail.mood.mood) && (
                  <p className="text-sm text-muted-foreground">{detail.mood.summary}</p>
                )}
                {detail.turns.length === 0 ? (
                  <p className="text-muted-foreground">이 날은 대화 내용이 없습니다.</p>
                ) : (
                  detail.turns.map((turn) => (
                    <div
                      key={turn.id}
                      className={`rounded-lg border p-3 text-sm ${
                        turn.role === "assistant" ? "border-accent/30 bg-accent/10" : "border-surface-border bg-background"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{turn.role === "assistant" ? "AI" : "환자"}</span>
                        <span>
                          {new Date(turn.createdAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      <p>{turn.text}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
