
import { NextRequest, NextResponse } from "next/server";

import {
  getBookingStatus,
  getErrorLogs,
  getCustomerConfig,
  getServiceHealth,
  searchDocumentation,
} from "../../../../lib/diagnostics";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tool: string }> }
) {
  const { tool } = await context.params;

  const { searchParams } = new URL(request.url);

  const customerId = searchParams.get("customerId") ?? "";
  const level = searchParams.get("level") ?? undefined;
  const query = searchParams.get("query") ?? "";

  try {
    let result;

    switch (tool) {
      case "booking-status":
        if (!customerId) {
          return NextResponse.json(
            { success: false, error: "customerId is required" },
            { status: 400 }
          );
        }

        result = getBookingStatus(customerId);
        break;

      case "error-logs":
        if (!customerId) {
          return NextResponse.json(
            { success: false, error: "customerId is required" },
            { status: 400 }
          );
        }

        if (
          level &&
          !["INFO", "WARN", "ERROR"].includes(level.toUpperCase())
        ) {
          return NextResponse.json(
            { success: false, error: "Invalid log level" },
            { status: 400 }
          );
        }

        result = getErrorLogs(customerId, level);
        break;

      case "customer-config":
        if (!customerId) {
          return NextResponse.json(
            { success: false, error: "customerId is required" },
            { status: 400 }
          );
        }

        result = getCustomerConfig(customerId);
        break;

      case "service-health":
        result = getServiceHealth();
        break;

      case "documentation":
        if (!query.trim()) {
          return NextResponse.json(
            { success: false, error: "query is required" },
            { status: 400 }
          );
        }

        result = searchDocumentation(query);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: "UNKNOWN_DIAGNOSTIC_TOOL",
            message: `Diagnostic tool '${tool}' does not exist.`,
          },
          { status: 404 }
        );
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Diagnostic API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "The diagnostic request could not be completed.",
      },
      { status: 500 }
    );
  }
}
