
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";

const validTicketIds = new Set(["1042", "1043", "1044"]);

export async function GET(request: NextRequest) {
  try {
    const ticketId = request.nextUrl.searchParams.get("ticketId");

    if (!ticketId || !validTicketIds.has(ticketId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_TICKET",
          message: "A valid ticket ID is required.",
        },
        { status: 400 }
      );
    }

    // Retrieve the 20 most recent investigations for this ticket.
    const { data: investigations, error: investigationError } =
      await supabase
        .from("investigations")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(20);

    if (investigationError) {
      throw new Error(investigationError.message);
    }

    const records = investigations ?? [];

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        ticketId,
        history: [],
      });
    }

    const investigationIds = records.map(
      (record) => record.id as string
    );

    // Retrieve approval decisions linked to these investigations.
    const { data: approvals, error: approvalError } =
      await supabase
        .from("approval_decisions")
        .select("*")
        .in("investigation_id", investigationIds);

    if (approvalError) {
      throw new Error(approvalError.message);
    }

    const approvalByInvestigation = new Map(
      (approvals ?? []).map((approval) => [
        approval.investigation_id,
        approval,
      ])
    );

    const history = records.map((record) => {
      const approval = approvalByInvestigation.get(record.id);

      return {
        investigationId: record.id,
        ticketId: record.ticket_id,
        customer: record.customer_name,
        model: record.model,
        createdAt: record.created_at,
        toolCallsExecuted: record.tool_calls_executed,
        activity: record.activity,
        report: record.report,
        savedToDatabase: true,
        investigationComplete: true,
        approval: approval
          ? {
              id: approval.id,
              status: approval.decision,
              reviewer: approval.reviewer_name,
              timestamp: approval.created_at,
              resolution: approval.reviewed_resolution,
              reason: approval.reviewer_notes ?? "",
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      ticketId,
      history,
    });
  } catch (error) {
    console.error("TriageIQ history error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "HISTORY_FAILED",
        message: "Could not retrieve investigation history.",
      },
      { status: 500 }
    );
  }
}
