"use client";

import { useEffect, useState } from "react";
import { EmergencySosCard, type EmergencyEventDetail } from "@/components/guardian/EmergencySosCard";

interface OpenEventSummary {
  id: string;
  triggerType: string;
  createdAt: string;
  patient: { name: string };
}

async function fetchEventDetail(eventId: string): Promise<EmergencyEventDetail> {
  const response = await fetch(`/api/emergency/${eventId}`);
  const data = await response.json();
  return data.event;
}

export default function EmergencyIndexPage() {
  const [events, setEvents] = useState<OpenEventSummary[]>([]);
  const [detail, setDetail] = useState<EmergencyEventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/emergency")
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled) return;
        const list: OpenEventSummary[] = data.events ?? [];
        setEvents(list);
        if (list[0]) setDetail(await fetchEventDetail(list[0].id));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">불러오는 중...</p>;
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">✅</div>
        <h2 className="text-lg font-semibold">현재 긴급 상황이 없습니다</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          환자분이 긴급 호출 버튼을 누르거나 대화 중 위급 신호가 감지되면 이 화면에 즉시 표시되고,
          브라우저 알림으로도 전달됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <EmergencySosCard event={detail} onAcknowledged={setDetail} />
      {events.length > 1 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          그 외 미확인 긴급 상황이 {events.length - 1}건 더 있습니다.
        </p>
      )}
    </div>
  );
}
