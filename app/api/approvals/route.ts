
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_JSON",
          message: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("investigationId" in body) ||
      typeof body.investigationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.investigationId
      ) ||
      !("decision" in body) ||
      (body.decision !== "approved" &&
        body.decision !== "rejected") ||
      !("reviewerName" in body) ||
      typeof body.reviewerName !== "string" ||
      !body.reviewerName.trim() ||
      body.reviewerName.length > 100 ||
      !("reviewedResolution" in body) ||
      typeof body.reviewedResolution !== "string" ||
      !body.reviewedResolution.trim() ||
      body.reviewedResolution.length > 10000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_APPROVAL",
          message:
            "A valid investigation, decision, reviewer, and resolution are required.",
        },
        { status: 400 }
      );
    }

    const investigationId = body.investigationId;
    const decision = body.decision;
    const reviewerName = body.reviewerName.trim();
    const reviewedResolution = body.reviewedResolution.trim();

    const reviewerNotes =
      "reviewerNotes" in body &&
      typeof body.reviewerNotes === "string"
        ? body.reviewerNotes.trim()
        : "";

    if (reviewerNotes.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          error: "NOTES_TOO_LONG",
          message: "Reviewer notes must be under 5,000 characters.",
        },
        { status: 400 }
      );
    }

    if (decision === "rejected" && !reviewerNotes) {
      return NextResponse.json(
        {
          success: false,
          error: "REJECTION_REASON_REQUIRED",
          message: "Please provide a reason for rejection.",
        },
        { status: 400 }
      );
    }

    // Verify the investigation exists.
    const { data: investigation, error: lookupError } =
      await supabase
        .from("investigations")
        .select("id")
        .eq("id", investigationId)
        .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (!investigation) {
      return NextResponse.json(
        {
          success: false,
          error: "INVESTIGATION_NOT_FOUND",
          message: "The investigation was not found.",
        },
        { status: 404 }
      );
    }

    // Save the complete approval in one database operation.
    const { data: saved, error: insertError } = await supabase
      .from("approval_decisions")
      .insert({
        investigation_id: investigationId,
        decision,
        reviewer_name: reviewerName,
        reviewer_notes: reviewerNotes || null,
        reviewed_resolution: reviewedResolution,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "ALREADY_REVIEWED",
            message:
              "This investigation already has a recorded decision.",
          },
          { status: 409 }
        );
      }

      throw new Error(insertError.message);
    }

    return NextResponse.json({
      success: true,
      approval: {
        id: saved.id,
        investigationId: saved.investigation_id,
        status: saved.decision,
        reviewer: saved.reviewer_name,
        timestamp: saved.created_at,
        resolution: saved.reviewed_resolution,
        reason: saved.reviewer_notes ?? "",
      },
    });
  } catch (error) {
    console.error("TriageIQ approval error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "APPROVAL_FAILED",
        message:
          "The approval could not be saved. Check the server logs.",
      },
      { status: 500 }
    );
  }
}
