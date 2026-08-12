import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authErrorResponse, requireGuardianAccess, requirePatientAccess } from "@/lib/auth/permissions";

interface CalendarEventInput {
  patientId?: string;
  title?: string;
  date?: string;
  notes?: string | null;
}

function validate(body: CalendarEventInput) {
  if (!body.patientId || !body.title?.trim() || !body.date) {
    throw new Error("환자, 일정 제목, 날짜는 필수입니다.");
  }
}

/** GET /api/guardian/calendar-events?patientId=... - 날짜순 일정 목록 */
export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId") ?? "";
    if (!patientId) return Response.json({ error: "patientId가 필요합니다." }, { status: 400 });
    await requirePatientAccess(patientId);

    const events = await prisma.calendarEvent.findMany({
      where: { patientId },
      orderBy: { date: "asc" },
    });
    return Response.json({ events });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: "조회 실패" }, { status: 500 });
  }
}

/** POST /api/guardian/calendar-events - 일정 등록 (보호자만, 확인 절차 없이 바로 저장) */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CalendarEventInput;
    validate(body);
    const session = await requireGuardianAccess(body.patientId!);

    const event = await prisma.calendarEvent.create({
      data: {
        patientId: body.patientId!,
        title: body.title!.trim(),
        date: new Date(body.date!),
        notes: body.notes?.trim() || null,
        source: "guardian_web",
        addedBy: session.user.id,
      },
    });
    return Response.json({ event }, { status: 201 });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "등록 실패";
    return Response.json({ error: message }, { status: 400 });
  }
}
