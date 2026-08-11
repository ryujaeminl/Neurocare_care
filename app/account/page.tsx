"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return <p className="p-8 text-muted-foreground">불러오는 중...</p>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-surface-border px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight text-accent">내 계정</h1>
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-2">
          돌아가기
        </Link>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-xl border border-surface-border bg-surface p-5">
          <p className="text-lg font-semibold">{session?.user?.name}</p>
          <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
          <p className="mt-2 text-sm text-muted-foreground">보호자 계정</p>
        </div>

        <Link
          href="/link"
          className="mt-4 block rounded-xl border border-surface-border bg-surface p-5 transition hover:border-accent/50"
        >
          <p className="font-semibold">환자 연동하기</p>
          <p className="mt-1 text-sm text-muted-foreground">초대 코드로 환자를 추가합니다.</p>
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-6 w-full rounded-full border border-surface-border px-6 py-3 text-muted-foreground transition hover:border-danger-border hover:text-danger-foreground"
        >
          로그아웃
        </button>
      </main>
    </div>
  );
}
