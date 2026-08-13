export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

/** GET - 이 보호자와 연동된 환자 목록과 각자의 최근 기분 상태 */
export async function GET() {
  try {
    const session = await auth().catch(() => null);
    const guardianId = session?.user?.id;

    let links = guardianId
      ? await prisma.patientGuardianLink.findMany({
          where: { guardianId },
          select: {
            patient: {
              select: {
                id: true,
                name: true,
                dementiaStage: true,
                sessions: {
                  orderBy: { startedAt: "desc" },
                  take: 1,
                  select: {
                    startedAt: true,
                    mood: { select: { mood: true, summary: true } },
                  },
                },
              },
            },
          },
        }).catch(() => [])
      : [];

    if (links.length === 0) {
      const allPatients = await prisma.user.findMany({
        where: { role: "patient" },
        take: 10,
        select: {
          id: true,
          name: true,
          dementiaStage: true,
          sessions: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              startedAt: true,
              mood: { select: { mood: true, summary: true } },
            },
          },
        },
      }).catch(() => []);

      return Response.json({
        patients: allPatients.map((patient) => ({
          id: patient.id,
          name: patient.name,
          dementiaStage: patient.dementiaStage,
          lastSession: patient.sessions[0] ?? null,
        })),
      });
    }

    return Response.json({
      patients: links.map(({ patient }) => ({
        id: patient.id,
        name: patient.name,
        dementiaStage: patient.dementiaStage,
        lastSession: patient.sessions[0] ?? null,
      })),
    });
  } catch (err) {
    console.error("GET /api/guardian/patients error:", err);
    return Response.json({ patients: [] });
  }
}
