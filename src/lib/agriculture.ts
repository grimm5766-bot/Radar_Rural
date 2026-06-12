const SOY_CYCLE_DAYS = 120;
const DEFAULT_ROW_SPACING_METERS = 0.5;

export type ProductivityInput = {
  plantasPorMetro: number;
  vagensPorPlanta: number;
  graosPorVagem: number;
  pesoMilGraos: number;
  areaHectares: number;
};

export function calculateProductivity(input: ProductivityInput) {
  const plantsPerHectare =
    (input.plantasPorMetro * 10_000) / DEFAULT_ROW_SPACING_METERS;
  const grainsPerHectare =
    plantsPerHectare * input.vagensPorPlanta * input.graosPorVagem;
  const kgPerHectare = (grainsPerHectare * input.pesoMilGraos) / 1_000_000;
  const bagsPerHectare = kgPerHectare / 60;

  return {
    kgPerHectare: round(kgPerHectare),
    bagsPerHectare: round(bagsPerHectare),
    totalKg: round(kgPerHectare * input.areaHectares),
  };
}

export function calculateResponseDays(openedAt: Date, closedAt?: Date | null) {
  if (!closedAt) return null;
  const milliseconds = closedAt.getTime() - openedAt.getTime();
  return Math.max(0, Math.ceil(milliseconds / 86_400_000));
}

export function validateSanitaryBreak(startDate: Date, region = "GO") {
  if (region.toUpperCase() !== "GO") {
    return { valid: true, message: "" };
  }

  const month = startDate.getUTCMonth() + 1;
  const blocked = month >= 6 && month <= 9;
  return {
    valid: !blocked,
    message: blocked
      ? "Em Goiás, o início de um ciclo de soja está bloqueado entre junho e setembro por causa do vazio sanitário."
      : "",
  };
}

export function calculateCycleDay(startDate: Date, reference = new Date()) {
  const elapsed = Math.floor(
    (reference.getTime() - startDate.getTime()) / 86_400_000,
  );
  return Math.min(SOY_CYCLE_DAYS, Math.max(1, elapsed + 1));
}

export function cycleProgress(day: number) {
  return Math.min(100, Math.max(0, (day / SOY_CYCLE_DAYS) * 100));
}

export function phenologicalPhase(day: number) {
  if (day <= 10) return "Emergência";
  if (day <= 45) return "Fase vegetativa";
  if (day <= 70) return "Floração";
  if (day <= 100) return "Enchimento de grãos";
  return "Maturação";
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export { SOY_CYCLE_DAYS };
