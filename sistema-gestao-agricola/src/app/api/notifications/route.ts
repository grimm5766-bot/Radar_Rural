import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);

  const body = await request.json();
  await prisma.notification.updateMany({
    where: {
      userId: session.id,
      ...(body.id ? { id: String(body.id) } : {}),
    },
    data: { lida: true },
  });
  return NextResponse.json({ ok: true });
}
