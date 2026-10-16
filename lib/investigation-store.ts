
import "server-only";
import { supabase } from "./supabase";

export type ApprovalDecision = "approved" | "rejected";

export type InvestigationRecord = {
  id: string;
  ticket_id: string;
  customer_name: string | null;
  model: string | null;
  report: unknown;
  activity: unknown;
  tool_calls_executed: number;
  created_at: string;
};

export type ApprovalRecord = {
  id: string;
  investigation_id: string;
  decision: ApprovalDecision;
  reviewer_name: string;
  reviewer_notes: string | null;
  created_at: string;
};

export async function saveInvestigation(input: {
  ticketId: string;
  customerName?: string;
  model?: string;
  report: unknown;
  activity?: unknown;
  toolCallsExecuted?: number;
}): Promise<InvestigationRecord> {
  const { data, error } = await supabase
    .from("investigations")
    .insert({
      ticket_id: input.ticketId,
      customer_name: input.customerName ?? null,
      model: input.model ?? null,
      report: input.report,
      activity: input.activity ?? [],
      tool_calls_executed: input.toolCallsExecuted ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to save investigation: ${error.message}`
    );
  }

  return data as InvestigationRecord;
}

export async function saveApprovalDecision(input: {
  investigationId: string;
  decision: ApprovalDecision;
  reviewerName: string;
  reviewerNotes?: string;
}): Promise<ApprovalRecord> {
  const { data, error } = await supabase
    .from("approval_decisions")
    .insert({
      investigation_id: input.investigationId,
      decision: input.decision,
      reviewer_name: input.reviewerName,
      reviewer_notes: input.reviewerNotes ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to save approval decision: ${error.message}`
    );
  }

  return data as ApprovalRecord;
}

export async function getInvestigationHistory(
  ticketId: string
): Promise<InvestigationRecord[]> {
  const { data, error } = await supabase
    .from("investigations")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(
      `Failed to retrieve investigations: ${error.message}`
    );
  }

  return (data ?? []) as InvestigationRecord[];
}

export async function getApprovalHistory(
  investigationId: string
): Promise<ApprovalRecord[]> {
  const { data, error } = await supabase
    .from("approval_decisions")
    .select("*")
    .eq("investigation_id", investigationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to retrieve approvals: ${error.message}`
    );
  }

  return (data ?? []) as ApprovalRecord[];
}
