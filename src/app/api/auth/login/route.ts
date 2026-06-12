import { NextResponse } from "next/server";
import { apiError, requiredText } from "@/lib/api-response";
import { authenticate, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = requiredText(body.email, "e-mail");
    const password = requiredText(body.password, "senha");
    const user = await authenticate(email, password);
    if (!user) return apiError("E-mail ou senha inválidos.", 401);

    await createSession(user);
    return NextResponse.json({
      user: {
        id: user.id,
        tenantId: user.tenantId,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
      },
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Login inválido.");
  }
}
