"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Medication } from "@prisma/client";
import { useLinkedPatients } from "@/hooks/useLinkedPatients";
import { MOOD_LABELS, isMood } from "@/lib/db/types";

interface FamilyMemberOption {
  id: string;
  name: string;
  photos: { url: string }[];
}

interface HistorySession {
  id: string;
  startedAt: string;
  turnCount: number;
}

function isActive(endDate: Date | string | null) {
  return !endDate || new Date(endDate).getTime() >= Date.now();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

// 로그인/보호자 role 검증은 app/(guardian)/layout.tsx에서 이미 끝났다.
export default function GuardianHomePage() {
  const { patients, selectedId, setSelectedId, loading, error } = useLinkedPatients();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [members, setMembers] = useState<FamilyMemberOption[]>([]);
  const [sessions, setSessions] = useState<HistorySession[]>([]);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([
      fetch(`/api/guardian/medications?patientId=${selectedId}`).then((r) => r.json()),
      fetch(`/api/guardian/family?patientId=${selectedId}`).then((r) => r.json()),
      fetch(`/api/history?patientId=${selectedId}`).then((r) => r.json()),
    ])
      .then(([medsData, familyData, historyData]) => {
        setMedications(medsData.medications ?? []);
        setMembers(familyData.members ?? []);
        setSessions((historyData.sessions ?? []).slice(0, 5));
      })
      .catch(() => {});
  }, [selectedId]);

  if (loading) {
    return <p className="text-muted-foreground">불러오는 중...</p>;
  }

  const selectedPatient = patients.find((p) => p.id === selectedId);
  const activeMeds = medications.filter((m) => isActive(m.endDate));
  const mood = selectedPatient?.lastSession?.mood;
  const moodKey = mood && isMood(mood.mood) ? mood.mood : null;

  if (patients.length === 0) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface p-6 text-center">
        <p className="font-medium">아직 연동된 환자가 없습니다.</p>
        <p className="mt-2 text-sm text-muted-foreground">환자분께 초대 코드를 받아 연동해주세요.</p>
        <Link
          href="/link"
          className="mt-4 inline-block rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground hover:brightness-110"
        >
          초대 코드 입력하기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-danger-foreground">{error}</p>}

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

      {selectedId && selectedPatient && (
        <>
          {/* 현재 상태 + 복용약 */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-2xl border border-surface-border bg-surface p-6 md:col-span-2">
              <div>
                <span className="mb-3 inline-flex items-center rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  현재 상태
                </span>
                {moodKey ? (
                  <>
                    <h2 className="text-2xl font-bold">
                      {MOOD_LABELS[moodKey].emoji} {MOOD_LABELS[moodKey].label}
                    </h2>
                    <p className="mt-2 text-muted-foreground">{mood!.summary}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">기록 없음</h2>
                    <p className="mt-2 text-muted-foreground">
                      아직 분석된 기분 기록이 없습니다. 대화를 나누면 여기에 표시됩니다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <Link
              href="/medications"
              className="flex flex-col justify-between rounded-2xl bg-accent p-6 text-accent-foreground transition hover:brightness-110"
            >
              <div className="flex items-start justify-between">
                <span className="text-lg">💊</span>
                <span className="text-xs font-medium opacity-80">복용약 현황</span>
              </div>
              <div className="mt-4">
                <span className="text-[40px] font-bold leading-none">{activeMeds.length}</span>
                <span className="ml-1 text-sm opacity-80">개 복용 중</span>
              </div>
              <div className="mt-4 text-xs font-medium">자세히 보기 →</div>
            </Link>
          </section>

          {/* 가족 구성원 */}
          <section className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <h3 className="text-lg font-semibold">가족 구성원</h3>
              <Link href="/photos" className="text-sm font-medium text-accent hover:underline">
                전체보기
              </Link>
            </div>
            {members.length === 0 ? (
              <Link
                href="/family"
                className="rounded-2xl border border-dashed border-surface-border bg-surface p-6 text-center text-muted-foreground transition hover:border-accent/50"
              >
                등록된 가족이 없습니다. 눌러서 추가하세요.
              </Link>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-1">
                {members.map((member) => (
                  <Link
                    key={member.id}
                    href="/photos"
                    className="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
                  >
                    {member.photos[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.photos[0].url}
                        alt=""
                        className="h-16 w-16 rounded-full border border-surface-border object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-surface-border bg-background text-2xl">
                        👤
                      </div>
                    )}
                    <p className="truncate text-sm font-semibold">{member.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 오늘의 일정 (복용약) */}
          <section className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <h3 className="text-lg font-semibold">오늘의 일정</h3>
              <Link href="/medications" className="text-sm font-medium text-accent hover:underline">
                전체보기
              </Link>
            </div>
            {activeMeds.length === 0 ? (
              <p className="text-muted-foreground">등록된 약이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {activeMeds.slice(0, 4).map((medication) => (
                  <Link
                    key={medication.id}
                    href="/medications"
                    className="flex items-center gap-4 rounded-2xl border border-surface-border bg-surface p-5 transition hover:border-accent/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-lg">
                      💊
                    </div>
                    <div className="flex-1">
                      <p className="mb-0.5 text-xs font-medium text-accent">{medication.frequency}</p>
                      <p className="font-semibold">{medication.name}</p>
                      <p className="text-sm text-muted-foreground">{medication.dosage}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 최근 활동 로그 */}
          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">최근 대화 기록</h3>
            {sessions.length === 0 ? (
              <p className="text-muted-foreground">아직 저장된 대화가 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href="/status"
                    className="flex items-center gap-4 rounded-xl border border-surface-border bg-surface p-4 transition hover:border-accent/50"
                  >
                    <div className="w-20 text-xs text-muted-foreground">{formatDate(session.startedAt)}</div>
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <div className="flex-1">대화 {session.turnCount}번</div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
