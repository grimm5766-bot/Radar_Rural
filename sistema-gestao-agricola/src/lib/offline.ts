"use client";

const QUEUE_KEY = "switch-rural-offline-queue";

type QueueItem = {
  id: string;
  endpoint: string;
  method: "POST" | "PATCH";
  body: Record<string, unknown>;
  createdAt: string;
};

export type ApiResult = {
  ok: boolean;
  queued?: boolean;
  error?: string;
  data?: unknown;
};

export async function apiRequest(
  endpoint: string,
  body: Record<string, unknown>,
  options?: { method?: "POST" | "PATCH"; offline?: boolean },
): Promise<ApiResult> {
  const method = options?.method ?? "POST";
  const canQueue = options?.offline ?? false;

  if (canQueue && !navigator.onLine) {
    enqueue({ endpoint, body, method });
    return { ok: true, queued: true };
  }

  try {
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error ?? "Não foi possível salvar." };
    }
    return { ok: true, data };
  } catch {
    if (canQueue) {
      enqueue({ endpoint, body, method });
      return { ok: true, queued: true };
    }
    return { ok: false, error: "Servidor indisponível. Tente novamente." };
  }
}

export async function syncPendingRecords() {
  const queue = getQueue();
  if (!navigator.onLine || queue.length === 0) return 0;

  const pending: QueueItem[] = [];
  let synced = 0;
  for (const item of queue) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (response.ok) synced += 1;
      else pending.push(item);
    } catch {
      pending.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
  window.dispatchEvent(new Event("offline-queue-updated"));
  return synced;
}

export function pendingCount() {
  return getQueue().length;
}

function enqueue(item: Omit<QueueItem, "id" | "createdAt">) {
  const queue = getQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("offline-queue-updated"));
}

function getQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
