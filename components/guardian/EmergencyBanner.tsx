"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface OpenEvent {
  id: string;
  triggerType: string;
  createdAt: string;
  patient: { name: string };
}

const POLL_MS = 1_500;

/**
 * 네이티브(안드로이드 앱) 전체화면 알림 브릿지. 웹뷰가 아니면(일반 브라우저) undefined라
 * 옵셔널 체이닝으로만 호출한다 - FCM 없이 이미 인증된 이 폴링 결과를 그대로 재사용해
 * EmergencyNotifier.showEmergencyAlert()를 네이티브에서 띄운다.
 */
function notifyNativeFullScreen(event: OpenEvent) {
  (
    window as unknown as {
      Android?: { showEmergencyAlert?: (eventId: string, patientName: string, timeText: string) => void };
    }
  ).Android?.showEmergencyAlert?.(
    event.id,
    event.patient.name,
    new Date(event.createdAt).toLocaleTimeString("ko-KR"),
  );
}

/** 보호자 화면 어디서나 미확인 긴급 이벤트가 있으면 눈에 띄게 알린다. */
export function EmergencyBanner() {
  const [events, setEvents] = useState<OpenEvent[]>([]);
  // 같은 미확인 이벤트로 20초마다 전체화면을 반복해서 띄우면 안 되니, 이번 세션에서
  // 이미 네이티브에 알린 이벤트 id를 기억해 한 번만 트리거한다.
  const alertedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch("/api/emergency");
        const data = await response.json();
        if (cancelled || !response.ok) return;
        const nextEvents: OpenEvent[] = data.events ?? [];
        setEvents(nextEvents);
        for (const event of nextEvents) {
          if (alertedIdsRef.current.has(event.id)) continue;
          alertedIdsRef.current.add(event.id);
          notifyNativeFullScreen(event);
        }
      } catch {
        // 배너는 참고용이라 실패해도 조용히 넘어간다.
      }
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="border-b-2 border-rose-500 bg-danger-bg px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href="/emergency"
            className="flex items-center justify-between gap-3 text-sm font-medium text-rose-800"
          >
            <span className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
              </span>
              🆘 {event.patient.name}님에게 긴급 상황이 발생했습니다 ({new Date(event.createdAt).toLocaleTimeString("ko-KR")})
            </span>
            <span className="shrink-0 underline">확인하기 →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
