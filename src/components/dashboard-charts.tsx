"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RiskSegment = {
  day: number;
  state: "healthy" | "low" | "medium" | "high" | "future";
  label: string;
};

export type ProductivityPoint = {
  day: number;
  bagsPerHectare: number;
  kgPerHectare: number;
  plot: string;
};

export function RiskTimeline({
  data,
  currentDay,
}: {
  data: RiskSegment[];
  currentDay: number;
}) {
  const healthyDays = data.filter((item) => item.state === "healthy").length;
  const riskDays = data.filter((item) =>
    ["low", "medium", "high"].includes(item.state),
  ).length;

  return (
    <div>
      <div className="risk-summary">
        <div>
          <span>Dias monitorados sem ameaça</span>
          <strong>{healthyDays}</strong>
        </div>
        <div>
          <span>Dias sob atenção ou risco</span>
          <strong>{riskDays}</strong>
        </div>
        <div>
          <span>Posição atual</span>
          <strong>Dia {currentDay}</strong>
        </div>
      </div>
      <div className="risk-timeline" aria-label="Risco diário do ciclo">
        {data.map((item) => (
          <div
            className={`risk-day ${item.state}`}
            key={item.day}
            title={`Dia ${item.day}: ${item.label}`}
            aria-label={`Dia ${item.day}: ${item.label}`}
          >
            <span>{item.day}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <Legend color="#51a35f" label="Sem ameaça" />
        <Legend color="#e2bb46" label="Baixo risco" />
        <Legend color="#e88135" label="Atenção" />
        <Legend color="#c93f38" label="Crítico" />
        <Legend color="#dfe5dd" label="Dias futuros" />
      </div>
    </div>
  );
}

export function ProductivityChart({ data }: { data: ProductivityPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="empty-state">
        Registre amostragens para formar a curva de produtividade.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 330, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={330} minWidth={0}>
        <AreaChart data={data} margin={{ top: 15, right: 18, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="productivityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#347d48" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#347d48" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 5" stroke="#e0e9de" />
          <XAxis
            dataKey="day"
            type="number"
            domain={[1, 120]}
            ticks={[1, 20, 40, 60, 80, 100, 120]}
            tickFormatter={(value) => `D${value}`}
          />
          <YAxis
            domain={["dataMin - 5", "dataMax + 5"]}
            tickFormatter={(value) => `${Number(value).toFixed(0)} sc`}
            width={58}
          />
          <Tooltip
            labelFormatter={(day) => `Dia ${day} do ciclo`}
            formatter={(value, name, item) => {
              if (name === "bagsPerHectare") {
                const payload = item.payload as ProductivityPoint;
                return [
                  `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} sc/ha (${payload.kgPerHectare.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg/ha)`,
                  payload.plot,
                ];
              }
              return [value, name];
            }}
          />
          <Area
            type="monotone"
            dataKey="bagsPerHectare"
            stroke="#22663a"
            strokeWidth={3}
            fill="url(#productivityFill)"
            activeDot={{ r: 7 }}
            dot={{ r: 5, fill: "#22663a", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span>
      <i style={{ background: color }} />
      {label}
    </span>
  );
}
