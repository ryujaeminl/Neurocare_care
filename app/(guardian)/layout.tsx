import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { BottomNav } from "@/components/guardian/BottomNav";
import { EmergencyBanner } from "@/components/guardian/EmergencyBanner";

/** /guardian/* 전체(로그인/가입 화면 제외)의 접근 관문. 여기서 막으면 하위 페이지는 role 체크를 반복하지 않아도 된다. */
export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "guardian") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      {/* 예전엔 여기 우측에 메뉴 9개가 쭉 있었는데, 전부 하단 탭바 4개로 옮겼다. */}
      <header className="border-b border-surface-border px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center">
          <Link href="/" className="text-xl font-bold tracking-tight text-accent">
            보호자 대시보드
          </Link>
        </div>
      </header>

      <EmergencyBanner />

      {/* 의료 면책 - 보호자 화면 전체에 항상 노출되어야 한다. */}
      <p className="border-b border-surface-border bg-surface px-4 py-2 text-center text-xs text-muted-foreground sm:px-6">
        이 정보는 의료적 진단이 아니며 참고용입니다.
      </p>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8">{children}</main>

      <BottomNav />
    </div>
  );
}
