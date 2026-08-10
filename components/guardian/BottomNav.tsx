"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 예전 상단 헤더 우측에 있던 9개 메뉴(상태/메시지/복용약/가족·기억/사진/긴급/설정/환자 연동/내 계정)를
 * 성격이 비슷한 것끼리 묶어 탭으로 압축했다. 메시지는 사진 전송까지 포함된 핵심 기능이라
 * 별도 탭으로 뺐고, 나머지 묶인 메뉴는 각 탭의 도착 페이지 안에서 서로 링크로 연결해뒀다
 * (예: 가족 탭 → /family 안에 사진 바로가기).
 */
const ITEMS = [
  { href: "/", emoji: "🏠", label: "홈" },
  { href: "/status", emoji: "📊", label: "케어" },
  { href: "/family", emoji: "👪", label: "가족" },
  { href: "/messages", emoji: "💬", label: "메시지" },
  { href: "/settings", emoji: "⚙️", label: "설정" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-border bg-surface px-2 py-2">
      <div className="mx-auto flex max-w-5xl items-center justify-around">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs transition ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <span className="text-xl leading-none">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
