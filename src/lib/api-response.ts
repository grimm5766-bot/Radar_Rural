import { NextResponse } from "next/server";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function parseRequiredNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`O campo ${field} deve ser numérico.`);
  }
  return parsed;
}

export function parseRequiredDate(value: unknown, field: string) {
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`O campo ${field} possui uma data inválida.`);
  }
  return parsed;
}

export function requiredText(value: unknown, field: string) {
  const parsed = String(value ?? "").trim();
  if (!parsed) throw new Error(`O campo ${field} é obrigatório.`);
  return parsed;
}
