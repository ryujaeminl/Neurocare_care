import { prisma } from "@/lib/db/prisma";
import { authErrorResponse, requireSession } from "@/lib/auth/permissions";

/**
 * GET /api/emergency - 보호자가 연동된 환자들의 미확인 긴급 이벤트를 본다.
 * 긴급 이벤트를 만드는 POST는 환자 앱(../Neurocare)에만 있다 - 거기서 감지된 트리거
 * (긴급 호출 버튼, 음성 신호 등)가 만들고, 그 자리에서 바로 푸시/SMS까지 보낸다.
 * 이 앱은 만들어진 이벤트를 읽고 확인 처리만 한다.
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (session.user.linkedPatientIds.length === 0) return Response.json({ events: [] });

    const events = await prisma.emergencyEvent.findMany({
      where: { patientId: { in: session.user.linkedPatientIds }, status: "open" },
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { name: true } } },
    });
    return Response.json({ events });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: "조회 실패" }, { status: 500 });
  }
}
