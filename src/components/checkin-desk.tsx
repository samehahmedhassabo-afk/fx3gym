"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { QrCode, Search, CircleCheckBig, CircleX, MessageSquareText, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { physicalChar } from "@/lib/keyboard-layout";
import { checkInByCode, checkInByMemberId, searchMembersForCheckin } from "@/lib/actions/checkin";
import { QrScanner } from "@/components/qr-scanner";
import type { Dictionary } from "@/lib/i18n";

type CheckInResult = Awaited<ReturnType<typeof checkInByCode>>;

function reasonMessage(reason: string | undefined, t: Dictionary) {
  switch (reason) {
    case "NOT_FOUND":
      return t.checkInResult.notFound;
    case "EXPIRED":
      return t.checkInResult.expired;
    case "FROZEN":
      return t.checkInResult.frozen;
    case "NO_SUBSCRIPTION":
      return t.checkInResult.noSubscription;
    case "ALREADY_CHECKED_IN":
      return t.checkInResult.alreadyCheckedIn;
    case "NO_CLASSES_LEFT":
      return t.checkInResult.noClassesLeft;
    case "CHOOSE_SUBSCRIPTION":
      return t.checkInResult.chooseSubscription;
    default:
      return "";
  }
}

function ResultBanner({
  result,
  t,
  onChooseSubscription,
  onForceCheckIn,
}: {
  result: CheckInResult;
  t: Dictionary;
  onChooseSubscription: (memberId: string, subscriptionId: string) => void;
  onForceCheckIn: (memberId: string, subscriptionId: string) => void;
}) {
  if (result.ok && result.needsRenewal) {
    return (
      <Card className="p-5 border-amber-300 bg-amber-50">
        <div className="flex items-start gap-3">
          <CircleCheckBig className="w-8 h-8 text-amber-600 shrink-0" />
          <div>
            <div className="font-bold text-lg text-amber-700">✓ {t.checkInResult.needsRenewalTitle}</div>
            <div className="text-sm">{result.memberName}</div>
            <div className="text-xs text-[var(--muted)] mt-1 font-mono">{result.memberCode}</div>
            {result.planName && (
              <div className="text-xs text-[var(--muted)] mt-1">
                {t.subscriptions.plan}: <strong>{result.planName}</strong>
              </div>
            )}
            <div className="text-xs text-amber-700 mt-1">{result.daysOverdue} يوم متأخر عن التجديد</div>
          </div>
        </div>
      </Card>
    );
  }

  if (result.ok && result.sessionsFinishedEarly) {
    return (
      <Card className="p-5 border-amber-300 bg-amber-50">
        <div className="flex items-start gap-3">
          <CircleCheckBig className="w-8 h-8 text-amber-600 shrink-0" />
          <div>
            <div className="font-bold text-lg text-amber-700">✓ {t.checkInResult.sessionsFinishedEarlyTitle}</div>
            <div className="text-sm">{result.memberName}</div>
            <div className="text-xs text-[var(--muted)] mt-1 font-mono">{result.memberCode}</div>
            {result.planName && (
              <div className="text-xs text-[var(--muted)] mt-1">
                {t.subscriptions.plan}: <strong>{result.planName}</strong>
              </div>
            )}
            <div className="text-xs text-amber-700 mt-2">{t.checkInResult.sessionsFinishedEarlyBody}</div>
          </div>
        </div>
      </Card>
    );
  }

  if (result.ok) {
    return (
      <Card className="p-5 border-emerald-200 bg-emerald-50">
        <div className="flex items-start gap-3">
          <CircleCheckBig className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-lg text-emerald-700">✓ {t.checkInResult.success}</div>
            <div className="text-sm">{result.memberName}</div>
            <div className="text-xs text-[var(--muted)] mt-1 font-mono">{result.memberCode}</div>
            {result.planName && (
              <div className="text-xs text-[var(--muted)] mt-1">
                {t.subscriptions.plan}: <strong>{result.planName}</strong>
              </div>
            )}
            <div className="text-xs text-[var(--muted)] mt-1">
              {t.subscriptions.daysLeft}: <strong>{result.daysLeft}</strong>
            </div>
            {result.classesRemaining != null && (
              <div className="mt-1 text-sm font-bold text-emerald-700">الحصص المتبقية: {result.classesRemaining}</div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (result.reason === "CHOOSE_SUBSCRIPTION") {
    return (
      <Card className="p-5 border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <CircleX className="w-8 h-8 text-amber-600 shrink-0" />
          <div className="min-w-0 flex-1">
            {result.memberName && <div className="text-sm font-medium">{result.memberName}</div>}
            <div className="text-xs text-[var(--muted)] mt-1">{reasonMessage(result.reason, t)}</div>
            <div className="mt-3 space-y-2">
              {result.subscriptionOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChooseSubscription(result.memberId, opt.id)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-[var(--surface)] p-2.5 text-start hover:bg-amber-100 transition-colors"
                >
                  <span className="font-medium text-sm">{opt.planName}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {opt.classesRemaining != null ? `${opt.classesRemaining} حصة متبقية` : "غير محدود"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-red-200 bg-red-50">
      <div className="flex items-start gap-3">
        <CircleX className="w-8 h-8 text-red-600 shrink-0" />
        <div>
          <div className="font-bold text-lg text-red-700">✗</div>
          {result.memberName && <div className="text-sm">{result.memberName}</div>}
          <div className="text-xs text-[var(--muted)] mt-1">{reasonMessage(result.reason, t)}</div>
          {result.reason === "ALREADY_CHECKED_IN" && result.memberId && result.subscriptionId && (
            <button
              type="button"
              onClick={() => onForceCheckIn(result.memberId!, result.subscriptionId!)}
              className="mt-2 text-xs font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
            >
              {t.checkInResult.checkInAnyway}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ClassesRemainingBadge({ value }: { value: number | null }) {
  if (value == null) return <Badge variant="info">غير محدود</Badge>;
  return <Badge variant={value > 0 ? "success" : "danger"}>{value} حصة متبقية</Badge>;
}

export function CheckInDesk({ t }: { t: Dictionary }) {
  const [mode, setMode] = useState<"code" | "search">("code");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [pending, startTransition] = useTransition();
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [codeValue, setCodeValue] = useState("");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof searchMembersForCheckin>>>([]);
  const [searching, startSearching] = useTransition();

  const [commentAlert, setCommentAlert] = useState<{ memberName: string; comments: string } | null>(null);
  const [renewalAlert, setRenewalAlert] = useState<{
    memberId: string;
    memberName: string;
    planName: string | null;
    daysOverdue: number;
  } | null>(null);
  const [sessionsFinishedAlert, setSessionsFinishedAlert] = useState<{
    memberName: string;
    planName: string | null;
  } | null>(null);

  function showResult(next: CheckInResult) {
    setResult(next);
    if (next.ok && next.comments) {
      setCommentAlert({ memberName: next.memberName, comments: next.comments });
    }
    if (next.ok && next.needsRenewal) {
      setRenewalAlert({
        memberId: next.memberId,
        memberName: next.memberName,
        planName: next.planName,
        daysOverdue: next.daysOverdue,
      });
    }
    if (next.ok && !next.needsRenewal && next.sessionsFinishedEarly) {
      setSessionsFinishedAlert({ memberName: next.memberName, planName: next.planName });
    }
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResult(null), 4000);
  }

  function retryCheckIn(memberId: string, options: { subscriptionId?: string; force?: boolean }) {
    startTransition(async () => {
      showResult(await checkInByMemberId(memberId, options));
    });
  }

  function submitCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    startTransition(async () => {
      showResult(await checkInByCode(trimmed));
    });
  }

  useEffect(() => () => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      startSearching(async () => {
        setSearchResults(await searchMembersForCheckin(trimmed));
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const tabs = [
    { key: "code" as const, label: t.members.code, icon: QrCode },
    { key: "search" as const, label: t.common.search, icon: Search },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-2">
        <div className="grid grid-cols-2 gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
                mode === key ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      {mode === "code" && (
        <Card className="p-6">
          <div className="text-center mb-4">
            <QrCode className="w-12 h-12 mx-auto text-[var(--primary)]" />
            <h3 className="text-lg font-semibold mt-2">{t.nav.checkIn}</h3>
            <p className="text-xs text-[var(--muted)]">{t.members.qrCode}</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitCode(codeValue);
              setCodeValue("");
              codeInputRef.current?.focus();
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="code">{t.members.code}</Label>
              <Input
                ref={codeInputRef}
                id="code"
                name="code"
                placeholder="12345"
                autoFocus
                disabled={pending}
                className="text-center text-lg font-mono"
                value={codeValue}
                onChange={() => {}}
                onKeyDown={(e) => {
                  // Ignores whatever OS keyboard layout is active (e.g. Arabic) and always
                  // reads the physical key, so scanner input and manual typing work the same
                  // regardless of layout — see lib/keyboard-layout.ts.
                  if (e.key === "Backspace") {
                    e.preventDefault();
                    setCodeValue((v) => v.slice(0, -1));
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") return;
                  const ch = physicalChar(e);
                  if (ch !== null) {
                    e.preventDefault();
                    setCodeValue((v) => v + ch);
                  }
                }}
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full" size="lg">
              {pending ? t.common.loading : t.nav.checkIn}
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-[var(--border)]">
            <QrScanner t={t} disabled={pending} onScan={submitCode} />
          </div>
        </Card>
      )}

      {mode === "search" && (
        <Card className="p-6">
          <div>
            <Label htmlFor="q">
              {t.members.name} / {t.members.phone}
            </Label>
            <Input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.common.search} autoFocus />
          </div>
          <div className="mt-4 space-y-2">
            {searching && <div className="text-center text-xs text-[var(--muted)] py-4">{t.common.loading}</div>}
            {!searching && query.trim().length >= 2 && searchResults.length === 0 && (
              <div className="text-center text-xs text-[var(--muted)] py-4">{t.common.noData}</div>
            )}
            {searchResults.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
                <div className="min-w-0">
                  <Link href={`/members/${m.id}`} target="_blank" className="font-medium truncate block hover:underline">
                    {m.name}
                  </Link>
                  <div className="text-xs text-[var(--muted)] font-mono">
                    {m.memberCode} · {m.phone}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ClassesRemainingBadge value={m.classesRemaining} />
                    {m.checkedInToday && <Badge variant="warning">تم اليوم</Badge>}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="success"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      showResult(await checkInByMemberId(m.id, {}));
                      const trimmed = query.trim();
                      if (trimmed.length >= 2) setSearchResults(await searchMembersForCheckin(trimmed));
                    })
                  }
                >
                  دخول
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {result && (
        <ResultBanner
          result={result}
          t={t}
          onChooseSubscription={(memberId, subscriptionId) => retryCheckIn(memberId, { subscriptionId })}
          onForceCheckIn={(memberId, subscriptionId) => retryCheckIn(memberId, { subscriptionId, force: true })}
        />
      )}

      {commentAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCommentAlert(null)}>
          <Card className="max-w-sm w-full p-5 border-amber-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <MessageSquareText className="w-5 h-5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-amber-800">{commentAlert.memberName}</div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{commentAlert.comments}</p>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline" onClick={() => setCommentAlert(null)}>
              {t.common.confirm}
            </Button>
          </Card>
        </div>
      )}

      {renewalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRenewalAlert(null)}>
          <Card className="max-w-sm w-full p-5 border-amber-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <CalendarClock className="w-5 h-5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-amber-800">{t.checkInResult.needsRenewalTitle}</div>
                <div className="text-sm mt-1">{renewalAlert.memberName}</div>
                {renewalAlert.planName && (
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {t.subscriptions.plan}: <strong>{renewalAlert.planName}</strong>
                  </div>
                )}
                <div className="text-xs text-amber-700 mt-1">{renewalAlert.daysOverdue} يوم متأخر عن التجديد</div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setRenewalAlert(null)}>
                {t.common.cancel}
              </Button>
              <Link href={`/subscriptions/new?memberId=${renewalAlert.memberId}`} className="flex-1">
                <Button className="w-full">{t.checkInResult.renewNow}</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {sessionsFinishedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSessionsFinishedAlert(null)}>
          <Card className="max-w-sm w-full p-5 border-amber-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <CalendarClock className="w-5 h-5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-amber-800">{t.checkInResult.sessionsFinishedEarlyTitle}</div>
                <div className="text-sm mt-1">{sessionsFinishedAlert.memberName}</div>
                {sessionsFinishedAlert.planName && (
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {t.subscriptions.plan}: <strong>{sessionsFinishedAlert.planName}</strong>
                  </div>
                )}
                <div className="text-xs text-amber-700 mt-2">{t.checkInResult.sessionsFinishedEarlyBody}</div>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline" onClick={() => setSessionsFinishedAlert(null)}>
              {t.common.confirm}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
