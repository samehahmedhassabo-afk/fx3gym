type AppApiError = {
  ok: false;
  reason: string;
  detail?: string;
};

export function ok(data: Record<string, unknown>) {
  return { ok: true as const, ...data };
}

export function fail(reason: string, detail?: string): AppApiError {
  return { ok: false as const, reason, detail: detail?.slice(0, 500) };
}

export function toApiError(err: unknown, fallbackReason = "error"): AppApiError {
  if (err && typeof err === "object" && "ok" in err && (err as any).ok === false) {
    return err as AppApiError;
  }
  const detail = err instanceof Error ? err.message : String(err);
  return fail(fallbackReason, detail);
}
