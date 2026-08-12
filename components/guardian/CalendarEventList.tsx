"use client";

import { useEffect, useState } from "react";
import type { CalendarEvent } from "@prisma/client";

function toDateInput(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

/** 환자가 대화로 확인해 추가했거나(source=patient_voice) 보호자가 직접 등록한
 * (source=guardian_web) 일정. 등록하면 환자 휴대폰의 네이티브 캘린더에도 반영된다
 * (앱 재개 시 자동 동기화, android/app/.../MainActivity.kt 참고). */
export function CalendarEventList({ patientId }: { patientId: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/guardian/calendar-events?patientId=${patientId}`);
        const data = await response.json();
        if (!cancelled) setEvents(data.events ?? []);
      } catch {
        if (!cancelled) setError("일정을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/guardian/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, title, date, notes: notes || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setEvents((prev) => [...prev, data.event].sort((a, b) => a.date.localeCompare(b.date)));
      setTitle("");
      setDate("");
      setNotes("");
    } catch {
      setError("등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/guardian/calendar-events/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
      <h3 className="font-semibold">일정</h3>
      <p className="text-sm text-muted-foreground">
        여기서 등록하거나 환자분이 대화로 확인한 일정이 휴대폰 캘린더에도 자동으로 반영됩니다.
      </p>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정 (예: 병원 진료)"
          required
          className="flex-1 rounded-xl border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rounded-xl border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="메모 (선택)"
          className="rounded-xl border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:w-40"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 disabled:opacity-50"
        >
          등록
        </button>
      </form>

      {error && <p className="text-sm text-danger-foreground">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 일정이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-surface-border bg-background px-3 py-2 text-sm"
            >
              <div>
                <p>
                  <span className="font-medium">{toDateInput(event.date)}</span> {event.title}
                  {event.notes && <span className="text-muted-foreground"> ({event.notes})</span>}
                  <span className="ml-2 rounded-full bg-surface-border px-2 py-0.5 text-xs text-muted-foreground">
                    {event.source === "patient_voice" ? "환자가 추가함" : "보호자가 추가함"}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(event.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-danger-foreground"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
