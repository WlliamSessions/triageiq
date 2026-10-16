
"use client";

import { useCallback, useEffect, useState } from "react";

type Severity = "Critical" | "High" | "Medium";

type Ticket = {
  id: string;
  title: string;
  customer: string;
  severity: Severity;
  category: string;
  created: string;
  description: string;
  impact: string;
};

type Activity = {
  step: number;
  tool: string;
  arguments: Record<string, unknown>;
  result: unknown;
  status: "success" | "error";
};

type Report = {
  issueSummary: string;
  severity: string;
  evidence: string[];
  likelyRootCause: string;
  confidence: string;
  recommendedResolution: string[];
  customerResponse: string;
  escalationRecommended: boolean;
  escalationReason: string;
};

type Approval = {
  id?: string;
  status: "approved" | "rejected";
  reviewer: string;
  timestamp: string;
  resolution: string;
  reason: string;
};

type Investigation = {
  success: boolean;
  ticketId: string;
  customer: string;
  model: string;
  investigationComplete: boolean;
  toolCallsExecuted: number;
  activity: Activity[];
  report: Report;
  investigationId?: string | null;
  savedToDatabase?: boolean;
  persistenceWarning?: string | null;
  createdAt?: string;
  approval?: Approval | null;
};

type ReviewDraft = {
  resolution: string;
  reason: string;
};

const tickets: Ticket[] = [
  {
    id: "1042",
    title: "Customers unable to book appointments",
    customer: "Willow Wellness",
    severity: "High",
    category: "Booking API",
    created: "Oct 15, 2026 · 9:42 AM",
    description:
      "Customers are reporting errors when attempting to book appointments through our website. The booking page loads, but submitting an appointment fails. This started earlier today.",
    impact:
      "New appointments cannot be completed through the online booking system.",
  },
  {
    id: "1043",
    title: "Appointment confirmation emails not arriving",
    customer: "Brightside Dental",
    severity: "Medium",
    category: "Notifications",
    created: "Oct 15, 2026 · 10:18 AM",
    description:
      "Our customers are successfully booking appointments, but they aren't receiving confirmation emails. Staff can see the appointments in the dashboard.",
    impact:
      "Customers may not know whether their appointments were confirmed.",
  },
  {
    id: "1044",
    title: "Multiple bookings for the same time slot",
    customer: "Northstar Fitness",
    severity: "Critical",
    category: "Calendar Sync",
    created: "Oct 15, 2026 · 11:06 AM",
    description:
      "Several instructors have been assigned two appointments at the same time. We noticed this after connecting our external calendar.",
    impact:
      "Scheduling conflicts are disrupting customer appointments and staff availability.",
  },
];

const severityColors: Record<Severity, string> = {
  Critical: "border-red-500/30 bg-red-500/10 text-red-400",
  High: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

const toolNames: Record<string, string> = {
  get_booking_status: "Booking Status",
  get_error_logs: "Error Logs",
  get_customer_config: "Customer Configuration",
  get_service_health: "Service Health",
  search_documentation: "Documentation Search",
};

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#111a29] p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-[#0b1220] px-5 py12 text-center text-sm text-slate-500">
      <div className="py-8">{message}</div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Current session";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function investigationStatus(item: Investigation) {
  if (item.approval?.status === "approved") return "Approved";
  if (item.approval?.status === "rejected") return "Rejected";
  return "Pending Review";
}

export default function Home() {
  const [selectedId, setSelectedId] = useState("1042");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingApproval, setSavingApproval] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const [histories, setHistories] = useState<
    Record<string, Investigation[]>
  >({});

  const [selectedInvestigationIds, setSelectedInvestigationIds] =
    useState<Record<string, string>>({});

  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, ReviewDraft>
  >({});

  const [reviewer, setReviewer] = useState("Support Engineer");

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedId) ??
    tickets[0];

  const history = histories[selectedId] ?? [];

  const selectedInvestigationId =
    selectedInvestigationIds[selectedId];

  const investigation =
    history.find(
      (item) =>
        item.investigationId === selectedInvestigationId
    ) ?? history[0];

  const approval = investigation?.approval ?? null;

  const draftKey =
    investigation?.investigationId ?? selectedId;

  const reviewDraft = reviewDrafts[draftKey] ?? {
    resolution:
      investigation?.report.recommendedResolution.join("\n") ?? "",
    reason: "",
  };

  const filteredTickets = tickets.filter((ticket) =>
    `${ticket.id} ${ticket.title} ${ticket.customer} ${ticket.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const pendingReviews = tickets.filter((ticket) =>
    (histories[ticket.id] ?? []).some(
      (item) => !item.approval
    )
  ).length;

  const loadHistory = useCallback(
    async (ticketId: string, silent = false) => {
      if (!silent) setLoadingHistory(true);

      setHistoryError("");

      try {
        const response = await fetch(
          `/api/history?ticketId=${encodeURIComponent(ticketId)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to load investigation history."
          );
        }

        const records: Investigation[] = (
          data.history ?? []
        ).map((item: Investigation) => ({
          ...item,
          success: true,
          savedToDatabase: true,
        }));

        setHistories((previous) => ({
          ...previous,
          [ticketId]: records,
        }));

        setSelectedInvestigationIds((previous) => {
          const existingId = previous[ticketId];

          const stillExists = records.some(
            (item) => item.investigationId === existingId
          );

          if (stillExists) return previous;

          const next = { ...previous };

          if (records[0]?.investigationId) {
            next[ticketId] = records[0].investigationId;
          } else {
            delete next[ticketId];
          }

          return next;
        });
      } catch (err) {
        setHistoryError(
          err instanceof Error
            ? err.message
            : "Unable to load investigation history."
        );
      } finally {
        if (!silent) setLoadingHistory(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadHistory(selectedId);
  }, [selectedId, loadHistory]);

  function updateDraft(
    field: "resolution" | "reason",
    value: string
  ) {
    setReviewDrafts((previous) => ({
      ...previous,
      [draftKey]: {
        ...reviewDraft,
        [field]: value,
      },
    }));
  }

  async function recordDecision(
    status: "approved" | "rejected"
  ) {
    if (
      !investigation ||
      approval ||
      savingApproval ||
      loading
    ) {
      return;
    }

    const investigationId = investigation.investigationId;
    const name = reviewer.trim();
    const resolution = reviewDraft.resolution.trim();
    const reason = reviewDraft.reason.trim();

    if (!investigationId || !investigation.savedToDatabase) {
      setError(
        "This investigation must be saved to Supabase before it can be reviewed."
      );
      return;
    }

    if (!name || !resolution) {
      setError(
        "Reviewer and proposed resolution are required."
      );
      return;
    }

    if (status === "rejected" && !reason) {
      setError(
        "Please explain why the recommendation was rejected."
      );
      return;
    }

    const ticketId = selectedId;

    setSavingApproval(true);
    setError("");

    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          investigationId,
          decision: status,
          reviewerName: name,
          reviewedResolution: resolution,
          reviewerNotes: reason,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            data.error ||
            "The approval could not be saved."
        );
      }

      const saved = data.approval as Approval;

      setHistories((previous) => ({
        ...previous,
        [ticketId]: (previous[ticketId] ?? []).map(
          (item) =>
            item.investigationId === investigationId
              ? { ...item, approval: saved }
              : item
        ),
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The approval could not be saved."
      );
    } finally {
      setSavingApproval(false);
    }
  }

  async function startInvestigation() {
    if (loading || savingApproval) return;

    const ticketId = selectedId;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            data.error ||
            "Investigation failed."
        );
      }

      const result: Investigation = {
        ...(data as Investigation),
        createdAt: new Date().toISOString(),
        approval: null,
      };

      const investigationId = result.investigationId;

      if (result.savedToDatabase && investigationId) {
        setSelectedInvestigationIds((previous) => ({
          ...previous,
          [ticketId]: investigationId,
        }));

        setHistories((previous) => ({
          ...previous,
          [ticketId]: [
            result,
            ...(previous[ticketId] ?? []).filter(
              (item) =>
                item.investigationId !== investigationId
            ),
          ],
        }));

        setReviewDrafts((previous) => ({
          ...previous,
          [investigationId]: {
            resolution:
              result.report.recommendedResolution.join("\n"),
            reason: "",
          },
        }));

        // Refresh the full saved history from Supabase.
        await loadHistory(ticketId, true);
      } else {
        // Show unsaved results without pretending they are
        // permanently stored.
        const temporaryId = `unsaved-${Date.now()}`;

        result.investigationId = temporaryId;
        result.savedToDatabase = false;

        setSelectedInvestigationIds((previous) => ({
          ...previous,
          [ticketId]: temporaryId,
        }));

        setHistories((previous) => ({
          ...previous,
          [ticketId]: [
            result,
            ...(previous[ticketId] ?? []),
          ],
        }));

        setReviewDrafts((previous) => ({
          ...previous,
          [temporaryId]: {
            resolution:
              result.report.recommendedResolution.join("\n"),
            reason: "",
          },
        }));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-slate-100">
      <header className="border-b border-white/10 bg-[#0d1421]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-[#07111b]">
              IQ
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">
                Triage
                <span className="text-cyan-400">IQ</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                AI Support Operations
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">
              Supporting BookFlow
            </div>
            <div className="mt-1 text-xs text-emerald-400">
              ● Fictional Demo Environment
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-5 py-8 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Support Operations / Overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Investigation Console
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Investigate BookFlow support issues using an AI
            agent, diagnostic tools, persistent history, and
            human-controlled approvals.
          </p>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-4">
          {[
            ["Open Tickets", "03", "Customer support cases"],
            ["Critical Issues", "01", "Priority attention"],
            ["Diagnostic Tools", "05", "Connected to AI agent"],
            [
              "Pending Reviews",
              String(pendingReviews).padStart(2, "0"),
              "Tickets with pending reviews",
            ],
          ].map(([label, value, detail]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-[#111a29] p-5"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-bold">
                {value}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {detail}
              </p>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111a29]">
            <div className="border-b border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">
                  Support Inbox
                </h2>
                <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400">
                  {tickets.length} tickets
                </span>
              </div>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search tickets..."
                aria-label="Search tickets"
                className="w-full rounded-lg border border-white/10 bg-[#0b1220] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-2 p-3">
              {filteredTickets.length === 0 && (
                <p className="p-4 text-sm text-slate-500">
                  No matching tickets.
                </p>
              )}

              {filteredTickets.map((ticket) => {
                const ticketHistory =
                  histories[ticket.id] ?? [];

                const latest = ticketHistory[0];

                return (
                  <button
                    key={ticket.id}
                    disabled={loading || savingApproval}
                    onClick={() => {
                      setSelectedId(ticket.id);
                      setError("");
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      selectedId === ticket.id
                        ? "border-cyan-400/40 bg-cyan-400/10"
                        : "border-transparent bg-[#0c1422] hover:border-white/20"
                    } disabled:cursor-wait`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        #{ticket.id}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-1 text-[11px] ${severityColors[ticket.severity]}`}
                      >
                        {ticket.severity}
                      </span>
                    </div>

                    <p className="text-sm font-semibold leading-6">
                      {ticket.title}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {ticket.customer}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-400">
                        {ticket.category}
                      </span>

                      {latest ? (
                        <span
                          className={`text-xs ${
                            latest.approval?.status ===
                            "approved"
                              ? "text-emerald-400"
                              : latest.approval?.status ===
                                  "rejected"
                                ? "text-red-400"
                                : "text-amber-400"
                          }`}
                        >
                          {investigationStatus(latest)}
                        </span>
                      ) : null}
                    </div>

                    {ticketHistory.length > 0 && (
                      <p className="mt-3 text-xs text-slate-500">
                        {ticketHistory.length} saved/recent
                        investigation
                        {ticketHistory.length === 1
                          ? ""
                          : "s"}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="min-w-0 space-y-5">
            <Panel
              title={`Ticket #${selectedTicket.id}`}
              subtitle={`${selectedTicket.customer} · ${selectedTicket.category}`}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  {selectedTicket.title}
                </h2>
                <span
                  className={`rounded-md border px-3 py-1.5 text-xs ${severityColors[selectedTicket.severity]}`}
                >
                  {selectedTicket.severity} Priority
                </span>
              </div>

              <div className="mb-5 border-y border-white/10 py-4 text-xs text-slate-400">
                {selectedTicket.created} ·{" "}
                {approval
                  ? `Review ${approval.status}`
                  : investigation
                    ? "Investigated"
                    : "Open"}
              </div>

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Customer Description
              </h3>
              <p className="mb-5 text-sm leading-7 text-slate-300">
                {selectedTicket.description}
              </p>

              <div className="mb-6 rounded-lg border border-amber-500/15 bg-amber-500/5 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Business Impact
                </h3>
                <p className="text-sm leading-6 text-slate-300">
                  {selectedTicket.impact}
                </p>
              </div>

              <button
                onClick={startInvestigation}
                disabled={loading || savingApproval}
                className="w-full rounded-lg bg-cyan-400 px-5 py-3.5 text-sm font-bold text-[#07111b] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-50"
              >
                {loading
                  ? "AI Agent Investigating..."
                  : investigation
                    ? "✦ Run New Investigation"
                    : "✦ Start AI Investigation"}
              </button>

              {loading && (
                <p
                  role="status"
                  className="mt-3 text-center text-xs text-cyan-400"
                >
                  OpenAI is selecting and executing diagnostic
                  tools. This may take several seconds.
                </p>
              )}

              {investigation?.persistenceWarning && (
                <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                  {investigation.persistenceWarning}
                </p>
              )}

              {investigation?.savedToDatabase && (
                <p className="mt-4 text-xs text-emerald-400">
                  ✓ Investigation saved to Supabase
                </p>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
                >
                  {error}
                </div>
              )}
            </Panel>

            <Panel
              title="Investigation History"
              subtitle="Previous investigations retrieved from Supabase"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  {history.length} investigation
                  {history.length === 1 ? "" : "s"} available
                </p>

                <button
                  onClick={() => loadHistory(selectedId)}
                  disabled={loadingHistory || loading}
                  className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-400/10 disabled:opacity-50"
                >
                  {loadingHistory
                    ? "Loading..."
                    : "↻ Refresh History"}
                </button>
              </div>

              {historyError && (
                <p
                  role="alert"
                  className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {historyError}
                </p>
              )}

              {loadingHistory && history.length === 0 ? (
                <EmptyState message="Loading saved investigations..." />
              ) : history.length === 0 ? (
                <EmptyState message="No saved investigations yet. Run the AI agent to create the first record." />
              ) : (
                <div className="space-y-3">
                  {history.map((item, index) => {
                    const isSelected =
                      investigation?.investigationId ===
                      item.investigationId;

                    return (
                      <button
                        key={
                          item.investigationId ??
                          `investigation-${index}`
                        }
                        disabled={loading || savingApproval}
                        onClick={() => {
                          if (item.investigationId) {
                            setSelectedInvestigationIds(
                              (previous) => ({
                                ...previous,
                                [selectedId]:
                                  item.investigationId!,
                              })
                            );
                          }
                          setError("");
                        }}
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          isSelected
                            ? "border-cyan-400/50 bg-cyan-400/10"
                            : "border-white/10 bg-[#0b1220] hover:border-white/30"
                        } disabled:cursor-wait`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Investigation #{history.length - index}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(item.createdAt)}
                            </p>
                          </div>

                          <span
                            className={`rounded-md px-3 py-1.5 text-xs ${
                              item.approval?.status ===
                              "approved"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : item.approval?.status ===
                                    "rejected"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {investigationStatus(item)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                          <span>
                            {item.toolCallsExecuted} diagnostic
                            tool calls
                          </span>
                          <span>
                            {item.report.confidence} confidence
                          </span>
                          <span
                            className={
                              isSelected
                                ? "text-cyan-400"
                                : "text-slate-400"
                            }
                          >
                            {isSelected
                              ? "● Currently Viewing"
                              : "View Investigation →"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 text-xs leading-6 text-slate-500">
                History shows up to 20 investigations per
                ticket. Selecting an investigation restores its
                original report, diagnostic activity, and
                recorded human decision.
              </p>
            </Panel>

            <Panel
              title="Agent Investigation Timeline"
              subtitle="Actual diagnostic tool execution and JSON responses"
            >
              {!investigation ? (
                <EmptyState message="Select a saved investigation or launch the AI agent." />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0b1220] p-4 text-xs">
                    <span className="text-cyan-400">
                      {investigation.toolCallsExecuted} tool
                      calls executed
                    </span>
                    <span className="text-slate-400">
                      {investigation.model}
                    </span>
                  </div>

                  {!investigation.investigationComplete && (
                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                      The investigation may be incomplete.
                      Review the diagnostic evidence carefully.
                    </p>
                  )}

                  {investigation.activity.length === 0 && (
                    <EmptyState message="The agent did not request any diagnostic tools." />
                  )}

                  {investigation.activity.map((event) => (
                    <div
                      key={event.step}
                      className="rounded-lg border border-white/10 bg-[#0b1220] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-400">
                            {event.step}
                          </span>
                          <div>
                            <p className="text-sm font-semibold">
                              {toolNames[event.tool] ??
                                event.tool}
                            </p>
                            <p className="mt-1 font-mono text-[11px] text-slate-500">
                              {event.tool}()
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-xs ${
                            event.status === "success"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {event.status === "success"
                            ? "✓ Executed"
                            : "✕ Error"}
                        </span>
                      </div>

                      <details className="mt-4 rounded-lg border border-white/10">
                        <summary className="cursor-pointer px-4 py-3 text-xs text-cyan-400">
                          View Tool Arguments & JSON Response
                        </summary>
                        <div className="border-t border-white/10 p-4">
                          <p className="mb-2 text-xs text-slate-400">
                            Arguments
                          </p>
                          <pre className="mb-4 overflow-x-auto whitespace-pre-wrap break-all rounded bg-black/30 p-3 font-mono text-xs text-slate-300">
                            {JSON.stringify(
                              event.arguments,
                              null,
                              2
                            )}
                          </pre>

                          <p className="mb-2 text-xs text-slate-400">
                            Actual Tool Result
                          </p>
                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-black/30 p-3 font-mono text-xs text-emerald-300">
                            {JSON.stringify(
                              event.result,
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Investigation Report"
              subtitle="AI-generated conclusions grounded in diagnostic evidence"
            >
              {!investigation ? (
                <EmptyState message="Select an investigation to view its report." />
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-400">
                      {investigation.report.confidence}{" "}
                      Confidence
                    </span>
                    <span className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                      {investigation.report.severity}{" "}
                      Severity
                    </span>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Issue Summary
                    </h3>
                    <p className="text-sm leading-7 text-slate-300">
                      {investigation.report.issueSummary}
                    </p>
                  </div>

                  <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-5">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Likely Root Cause
                    </h3>
                    <p className="text-sm leading-7 text-white">
                      {investigation.report.likelyRootCause}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Evidence Gathered
                    </h3>
                    <ul className="space-y-3">
                      {investigation.report.evidence.map(
                        (item, index) => (
                          <li
                            key={index}
                            className="flex gap-3 text-sm leading-6 text-slate-300"
                          >
                            <span className="text-emerald-400">
                              ✓
                            </span>
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Recommended Resolution
                    </h3>
                    <ol className="space-y-3">
                      {investigation.report.recommendedResolution.map(
                        (item, index) => (
                          <li
                            key={index}
                            className="flex gap-3 text-sm leading-6 text-slate-300"
                          >
                            <span className="font-bold text-cyan-400">
                              {index + 1}.
                            </span>
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ol>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-[#0b1220] p-5">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Draft Customer Response
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {investigation.report.customerResponse}
                    </p>
                    <p className="mt-4 text-xs text-slate-500">
                      Draft only — no customer message has
                      been sent.
                    </p>
                  </div>

                  <div
                    className={`rounded-lg border p-5 ${
                      investigation.report.escalationRecommended
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-emerald-500/20 bg-emerald-500/5"
                    }`}
                  >
                    <h3 className="mb-2 text-sm font-semibold">
                      {investigation.report.escalationRecommended
                        ? "⚠ Escalation Recommended"
                        : "✓ No Escalation Recommended"}
                    </h3>
                    <p className="text-sm leading-6 text-slate-300">
                      {investigation.report.escalationReason ||
                        "No engineering escalation is currently recommended."}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      AI recommendation only. Human review is
                      required before any action.
                    </p>
                  </div>
                </div>
              )}
            </Panel>

            <Panel
              title="Human Approval Workflow"
              subtitle="Review AI recommendations before authorizing corrective action"
            >
              {!investigation ? (
                <EmptyState message="Select an investigation to view its review status." />
              ) : approval ? (
                <div className="space-y-5">
                  <div
                    className={`rounded-lg border p-5 ${
                      approval.status === "approved"
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <p className="text-lg font-bold">
                      {approval.status === "approved"
                        ? "✓ Recommendation Approved"
                        : "✕ Recommendation Rejected"}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Reviewed by {approval.reviewer}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(approval.timestamp)}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Reviewed Resolution
                    </h3>
                    <p className="whitespace-pre-wrap rounded-lg bg-[#0b1220] p-4 text-sm leading-7 text-slate-300">
                      {approval.resolution}
                    </p>
                  </div>

                  {approval.reason && (
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Reviewer Notes
                      </h3>
                      <p className="whitespace-pre-wrap text-sm text-slate-300">
                        {approval.reason}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs leading-6 text-slate-300">
                    ✓ Decision saved to Supabase.
                    No remediation API has been called and no
                    customer message has been sent.
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
                    <p className="text-sm font-semibold text-amber-400">
                      ◷ Awaiting Human Review
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      The AI investigation is complete. A
                      support engineer must review the
                      evidence and proposed resolution before
                      any corrective action can proceed.
                    </p>
                  </div>

                  {!investigation.investigationComplete && (
                    <p className="text-sm text-amber-300">
                      Warning: This investigation may be
                      incomplete. Review the evidence carefully.
                    </p>
                  )}

                  {!investigation.savedToDatabase && (
                    <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                      Database saving was unsuccessful.
                      Approvals are unavailable until a new
                      investigation is saved successfully.
                    </p>
                  )}

                  <div>
                    <label
                      htmlFor="reviewer"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                      Reviewer
                    </label>
                    <input
                      id="reviewer"
                      value={reviewer}
                      onChange={(event) =>
                        setReviewer(event.target.value)
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0b1220] p-3 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder="Support Engineer"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="resolution"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                      Proposed Resolution — Editable
                    </label>
                    <textarea
                      id="resolution"
                      rows={7}
                      value={reviewDraft.resolution}
                      onChange={(event) =>
                        updateDraft(
                          "resolution",
                          event.target.value
                        )
                      }
                      className="w-full resize-y rounded-lg border border-white/10 bg-[#0b1220] p-4 text-sm leading-7 text-slate-300 outline-none focus:border-cyan-400"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Modify the AI recommendation before
                      approval if additional steps or safeguards
                      are needed.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="review-notes"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                      Review Notes
                    </label>
                    <textarea
                      id="review-notes"
                      rows={3}
                      value={reviewDraft.reason}
                      onChange={(event) =>
                        updateDraft(
                          "reason",
                          event.target.value
                        )
                      }
                      placeholder="Add justification, concerns, or conditions for approval. Required for rejection."
                      className="w-full resize-y rounded-lg border border-white/10 bg-[#0b1220] p-4 text-sm leading-6 text-slate-300 outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() =>
                        recordDecision("approved")
                      }
                      disabled={
                        loading ||
                        savingApproval ||
                        !investigation.savedToDatabase
                      }
                      className="rounded-lg bg-emerald-500 px-5 py-4 text-sm font-bold text-[#06140f] transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-50"
                    >
                      {savingApproval
                        ? "Saving Decision..."
                        : "✓ Approve Resolution"}
                    </button>

                    <button
                      onClick={() =>
                        recordDecision("rejected")
                      }
                      disabled={
                        loading ||
                        savingApproval ||
                        !investigation.savedToDatabase
                      }
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50"
                    >
                      {savingApproval
                        ? "Saving Decision..."
                        : "✕ Reject Recommendation"}
                    </button>
                  </div>

                  <p className="text-center text-xs leading-6 text-slate-500">
                    Approval records the review decision only.
                    Corrective actions and customer
                    communications remain disabled.
                  </p>
                </div>
              )}
            </Panel>
          </div>
        </div>

        <footer className="mt-8 border-t border-white/10 pt-5 text-xs text-slate-600">
          TriageIQ · AI-Powered Support Investigation ·
          Persistent History · Human-in-the-Loop Review ·
          Fictional BookFlow Demo Environment
        </footer>
      </main>
    </div>
  );
}
