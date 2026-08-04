"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmergencySosCard, type EmergencyEventDetail } from "@/components/guardian/EmergencySosCard";

async function fetchEventDetail(eventId: string): Promise<EmergencyEventDetail> {
  const response = await fetch(`/api/emergency/${eventId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "이벤트를 불러오지 못했습니다.");
  return data.event;
}

/** 푸시 알림/안드로이드 전체화면 인텐트가 이 경로로 바로 연다 - 특정 이벤트 하나를 딥링크로 본다. */
export default function EmergencyEventPage() {
  const params = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EmergencyEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchEventDetail(params.eventId)
      .then((e) => {
        if (!cancelled) setEvent(e);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "이벤트를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.eventId]);

  if (loading) return <p className="text-muted-foreground">불러오는 중...</p>;
  if (error || !event) return <p className="text-danger-foreground">{error ?? "이벤트를 찾을 수 없습니다."}</p>;

  return (
    <div className="mx-auto w-full max-w-lg">
      <EmergencySosCard event={event} onAcknowledged={setEvent} />
    </div>
  );
}
