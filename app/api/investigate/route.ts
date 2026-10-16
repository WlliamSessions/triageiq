
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import {
  getBookingStatus,
  getErrorLogs,
  getCustomerConfig,
  getServiceHealth,
  searchDocumentation,
} from "../../../lib/diagnostics";

import { saveInvestigation } from "../../../lib/investigation-store";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45000,
  maxRetries: 1,
});

const ticketRecords = {
  "1042": {
    id: "1042",
    customerId: "willow-wellness",
    customer: "Willow Wellness",
    severity: "High",
    title: "Customers unable to book appointments",
    description:
      "Customers receive errors when submitting appointments through our website. The booking page loads, but appointment creation fails.",
  },
  "1043": {
    id: "1043",
    customerId: "brightside-dental",
    customer: "Brightside Dental",
    severity: "Medium",
    title: "Appointment confirmation emails not arriving",
    description:
      "Customers can book appointments successfully, but confirmation emails are not arriving.",
  },
  "1044": {
    id: "1044",
    customerId: "northstar-fitness",
    customer: "Northstar Fitness",
    severity: "Critical",
    title: "Multiple bookings for the same time slot",
    description:
      "Instructors have overlapping appointments after an external calendar was connected.",
  },
} as const;

type TicketId = keyof typeof ticketRecords;

type Activity = {
  step: number;
  tool: string;
  arguments: Record<string, unknown>;
  result: unknown;
  status: "success" | "error";
};

const tools: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "get_booking_status",
    description:
      "Retrieve customer booking statistics, success or failure status, and recent booking activity.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_error_logs",
    description:
      "Retrieve technical error logs for the customer. Use these to investigate failures, warnings, and service errors.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        level: {
          type: ["string", "null"],
          enum: ["INFO", "WARN", "ERROR", null],
          description:
            "Optional severity filter. Null retrieves all logs.",
        },
      },
      required: ["level"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_customer_config",
    description:
      "Inspect customer settings including authentication, booking, notification, and calendar synchronization configuration.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_service_health",
    description:
      "Check BookFlow platform service health and active incidents to distinguish customer-specific issues from platform problems.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_documentation",
    description:
      "Search official BookFlow troubleshooting documentation for supported resolution procedures.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Technical troubleshooting search terms.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

const reportSchema = {
  type: "object",
  properties: {
    issueSummary: { type: "string" },
    severity: {
      type: "string",
      enum: ["Critical", "High", "Medium", "Low"],
    },
    evidence: {
      type: "array",
      items: { type: "string" },
    },
    likelyRootCause: { type: "string" },
    confidence: {
      type: "string",
      enum: ["High", "Medium", "Low"],
    },
    recommendedResolution: {
      type: "array",
      items: { type: "string" },
    },
    customerResponse: { type: "string" },
    escalationRecommended: { type: "boolean" },
    escalationReason: { type: "string" },
  },
  required: [
    "issueSummary",
    "severity",
    "evidence",
    "likelyRootCause",
    "confidence",
    "recommendedResolution",
    "customerResponse",
    "escalationRecommended",
    "escalationReason",
  ],
  additionalProperties: false,
} as const;

function executeTool(
  name: string,
  args: Record<string, unknown>,
  customerId: string
) {
  switch (name) {
    case "get_booking_status":
      return getBookingStatus(customerId);

    case "get_error_logs": {
      const level = args.level;

      if (
        level !== null &&
        level !== undefined &&
        !["INFO", "WARN", "ERROR"].includes(String(level))
      ) {
        return {
          success: false,
          error: "INVALID_LOG_LEVEL",
        };
      }

      return getErrorLogs(
        customerId,
        typeof level === "string" ? level : undefined
      );
    }

    case "get_customer_config":
      return getCustomerConfig(customerId);

    case "get_service_health":
      return getServiceHealth();

    case "search_documentation": {
      if (
        typeof args.query !== "string" ||
        !args.query.trim() ||
        args.query.length > 200
      ) {
        return {
          success: false,
          error: "INVALID_SEARCH_QUERY",
        };
      }

      return searchDocumentation(args.query);
    }

    default:
      return {
        success: false,
        error: "UNKNOWN_TOOL",
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_API_KEY",
          message:
            "OPENAI_API_KEY is not configured in .env.local.",
        },
        { status: 500 }
      );
    }

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
      !("ticketId" in body) ||
      typeof body.ticketId !== "string" ||
      !Object.prototype.hasOwnProperty.call(
        ticketRecords,
        body.ticketId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_TICKET",
          message: "A valid ticketId is required.",
        },
        { status: 400 }
      );
    }

    const ticket = ticketRecords[body.ticketId as TicketId];
    const activity: Activity[] = [];

    const input: OpenAI.Responses.ResponseInputItem[] = [
      {
        role: "user",
        content: JSON.stringify({
          task: "Investigate this BookFlow support ticket.",
          ticket,
        }),
      },
    ];

    const instructions = `
You are TriageIQ, an AI technical support investigation agent
for the fictional appointment scheduling platform BookFlow.

Investigate the provided ticket using diagnostic tools.

Rules:
- Select diagnostic tools based on the ticket and evidence.
- Do not assume a root cause before gathering evidence.
- Use multiple tools when necessary to validate a hypothesis.
- Consult troubleshooting documentation when useful.
- The customer identity is fixed by the backend.
- Never claim you executed a repair or changed a setting.
- Do not fabricate logs, tool results, or documentation.
- Distinguish observed facts from hypotheses.
- If evidence is insufficient, state uncertainty.
- Recommend escalation for unresolved critical incidents
  or issues requiring engineering intervention.
- Escalations require human approval and cannot be
  executed by you.
- Return a concise, evidence-based final report.
`;

    const model = "gpt-4.1-mini";
    const maxRounds = 6;
    const maxToolCalls = 12;

    let totalToolCalls = 0;
    let investigationComplete = false;

    for (let round = 0; round < maxRounds; round++) {
      const response = await openai.responses.create({
        model,
        instructions,
        input,
        tools,
        tool_choice: "auto",
        parallel_tool_calls: true,
        max_output_tokens: 1200,
        store: false,
      });

      const calls = response.output.filter(
        (item) => item.type === "function_call"
      );

      for (const item of response.output) {
        if (item.type === "message") {
          const text = item.content
            .filter((part) => part.type === "output_text")
            .map((part) => part.text)
            .join("\n");

          if (text) {
            input.push({
              role: "assistant",
              content: text,
            });
          }
        }
      }

      if (calls.length === 0) {
        investigationComplete = true;
        break;
      }

      if (totalToolCalls + calls.length > maxToolCalls) {
        break;
      }

      for (const call of calls) {
        input.push({
          type: "function_call",
          call_id: call.call_id,
          name: call.name,
          arguments: call.arguments,
        });

        let args: Record<string, unknown> = {};
        let result: unknown;

        try {
          const parsed: unknown = JSON.parse(call.arguments);

          if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
          ) {
            throw new Error("Invalid tool arguments");
          }

          args = parsed as Record<string, unknown>;

          result = executeTool(
            call.name,
            args,
            ticket.customerId
          );
        } catch {
          result = {
            success: false,
            error: "INVALID_TOOL_ARGUMENTS",
          };
        }

        totalToolCalls++;

        const succeeded =
          typeof result === "object" &&
          result !== null &&
          "success" in result &&
          result.success === true;

        activity.push({
          step: totalToolCalls,
          tool: call.name,
          arguments: args,
          result,
          status: succeeded ? "success" : "error",
        });

        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        });
      }
    }

    const finalResponse = await openai.responses.create({
      model,
      instructions: `
You are writing the final TriageIQ investigation report.

Use ONLY evidence from the supplied diagnostic tool results.
Do not invent facts, tests, repairs, or documentation.
If evidence is incomplete, clearly state the limitation.
Do not claim an escalation has been created.
The customer response is a draft, not a sent message.
`,
      input: [
        {
          role: "user",
          content: JSON.stringify({
            ticket,
            investigationComplete,
            diagnosticActivity: activity,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "investigation_report",
          strict: true,
          schema: reportSchema,
        },
      },
      max_output_tokens: 1800,
      store: false,
    });

    if (!finalResponse.output_text) {
      throw new Error("No investigation report was generated.");
    }

    const report = JSON.parse(finalResponse.output_text);

    // Phase 4: Persist completed investigation in Supabase.
    // Database errors must not erase successful AI results.
    let investigationId: string | null = null;
    let savedToDatabase = false;
    let persistenceWarning: string | null = null;

    try {
      const saved = await saveInvestigation({
        ticketId: ticket.id,
        customerName: ticket.customer,
        model,
        report,
        activity,
        toolCallsExecuted: totalToolCalls,
      });

      investigationId = saved.id;
      savedToDatabase = true;

      console.log(
        `TriageIQ investigation saved: ${saved.id}`
      );
    } catch (databaseError) {
      console.error(
        "TriageIQ database persistence error:",
        databaseError
      );

      persistenceWarning =
        "Investigation completed, but could not be saved to the database.";
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      customer: ticket.customer,
      model,
      investigationComplete,
      toolCallsExecuted: totalToolCalls,
      activity,
      report,
      investigationId,
      savedToDatabase,
      persistenceWarning,
    });
  } catch (error) {
    console.error("TriageIQ investigation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INVESTIGATION_FAILED",
        message:
          "The investigation could not be completed. Check the VS Code terminal for details.",
      },
      { status: 500 }
    );
  }
}
