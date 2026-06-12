"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/offline";

type FormState = {
  type: "idle" | "success" | "error";
  message: string;
};

export function useApiForm({
  endpoint,
  method = "POST",
  offline = false,
  transform,
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  offline?: boolean;
  transform?: (data: Record<string, FormDataEntryValue>) => Record<string, unknown>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<FormState>({ type: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setState({ type: "idle", message: "" });
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const body = transform ? transform(raw) : raw;
    const result = await apiRequest(endpoint, body, { method, offline });
    setLoading(false);

    if (!result.ok) {
      setState({ type: "error", message: result.error ?? "Não foi possível salvar." });
      return;
    }

    setState({
      type: "success",
      message: result.queued
        ? "Sem conexão: registro salvo na fila e será sincronizado automaticamente."
        : "Registro salvo com sucesso.",
    });
    form.reset();
    if (!result.queued) router.refresh();
  }

  return { handleSubmit, loading, state, setState };
}

export function FormActions({
  loading,
  state,
  label = "Salvar registro",
}: {
  loading: boolean;
  state: FormState;
  label?: string;
}) {
  return (
    <div className="form-actions">
      <button className="button button-primary" type="submit" disabled={loading}>
        {loading ? "Salvando..." : label}
      </button>
      {state.type !== "idle" && (
        <p className={`form-message ${state.type}`}>{state.message}</p>
      )}
    </div>
  );
}
