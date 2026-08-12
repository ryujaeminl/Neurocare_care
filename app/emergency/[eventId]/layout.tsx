import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";

/** (guardian) 레이아웃 밖에 둔다 - 안드로이드 전체화면 인텐트가 여는 단독 알림 화면이라
 * 헤더/하단 탭바 같은 대시보드 크롬이 없어야 방 반대편에서도 한눈에 위급 상황임을
 * 알아볼 수 있다. 권한 검사는 (guardian)/layout.tsx와 동일하게 여기서 그대로 한다. */
export default async function EmergencyAlertLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "guardian") redirect("/login");

  return <>{children}</>;
}
