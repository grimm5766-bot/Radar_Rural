"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CycleEvent = {
  day: number;
  inspections: number | null;
  occurrences: number | null;
  critical: number | null;
  management: number | null;
};

export function CycleChart({ data }: { data: CycleEvent[] }) {
  return (
    <div style={{ width: "100%", height: 320, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={320} minWidth={0}>
        <LineChart data={data} margin={{ top: 16, right: 18, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 5" stroke="#e0e9de" />
          <XAxis dataKey="day" type="number" domain={[1, 120]} ticks={[1, 20, 40, 60, 80, 100, 120]} />
          <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} tickFormatter={(value) => ["", "Manejo", "Vistoria", "Ocorrência", "Crítico"][value] ?? ""} width={94} />
          <Tooltip
            labelFormatter={(day) => `Dia ${day} do ciclo`}
            formatter={(value, name) => value ? ["Registrado", chartLabel(String(name))] : ["", ""]}
          />
          <Legend formatter={(value) => chartLabel(value)} />
          <Line type="monotone" dataKey="management" name="management" stroke="#2f855a" strokeWidth={0} dot={{ r: 5, fill: "#2f855a", strokeWidth: 0 }} connectNulls={false} />
          <Line type="monotone" dataKey="inspections" name="inspections" stroke="#76a948" strokeWidth={0} dot={{ r: 5, fill: "#76a948", strokeWidth: 0 }} connectNulls={false} />
          <Line type="monotone" dataKey="occurrences" name="occurrences" stroke="#d19a2b" strokeWidth={0} dot={{ r: 5, fill: "#d19a2b", strokeWidth: 0 }} connectNulls={false} />
          <Line type="monotone" dataKey="critical" name="critical" stroke="#c4413a" strokeWidth={0} dot={{ r: 6, fill: "#c4413a", strokeWidth: 0 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function chartLabel(value: string) {
  return {
    management: "Ações de manejo",
    inspections: "Vistorias",
    occurrences: "Ocorrências",
    critical: "Problemas críticos",
  }[value] ?? value;
}
