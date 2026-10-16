
# TriageIQ

### AI-Powered Technical Support Investigation Agent

[Live Demo](https://triageiq-alpha.vercel.app)

TriageIQ is a functional AI agent that investigates technical support issues for BookFlow, a fictional appointment scheduling SaaS platform.

Rather than simply generating answers, the agent autonomously selects diagnostic tools, examines technical evidence, identifies likely root causes, and recommends resolutions for human review.

The project demonstrates how AI agents can assist customer-facing technical teams while preserving human oversight.

## The Business Problem

Technical support engineers often investigate customer issues by manually checking API responses, application logs, customer configurations, service health, and product documentation.

This process can be time-consuming and requires information from multiple sources.

TriageIQ demonstrates how an AI agent can orchestrate these diagnostic steps and produce a structured, evidence-based investigation report.

## Live Demo

**[Launch TriageIQ](https://triageiq-alpha.vercel.app)**

The application includes three fictional customer scenarios:

| Customer | Issue | Severity |
|---|---|---|
| Willow Wellness | Appointment booking failures | High |
| Brightside Dental | Missing confirmation emails | Medium |
| Northstar Fitness | Calendar conflicts and double bookings | Critical |

Select a ticket and run an AI investigation to see the agent retrieve diagnostic information and generate a recommendation.

All customer information, documentation, logs, and diagnostic data are fictional.

## Key Capabilities

### Autonomous AI Investigation

Uses the OpenAI Responses API with function calling.

The agent selects and executes diagnostic tools based on the support ticket and the evidence collected.

Available tools:

- `get_booking_status`
- `get_error_logs`
- `get_customer_config`
- `get_service_health`
- `search_documentation`

### Evidence-Based Reports

Each investigation produces a structured report containing:

- Issue summary and severity
- Diagnostic evidence
- Likely root cause
- Confidence level
- Recommended resolution
- Draft customer response
- Escalation recommendation

### Investigation Activity

The dashboard displays the diagnostic tools executed, their results, and the investigation outcome.

This makes the agent's observable tool activity inspectable rather than presenting only a final AI-generated answer.

### Persistent Investigation History

Completed investigations are stored in Supabase.

Users can revisit previous investigations and review their associated diagnostic evidence and approval decisions.

### Human-in-the-Loop Review

A reviewer can inspect the AI recommendation, edit the proposed resolution, and approve or reject it.

Review decisions are saved to Supabase.

Approving a recommendation does not automatically change customer settings, send messages, or execute remediation.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend and backend API routes |
| React and TypeScript | Interactive dashboard and application logic |
| Tailwind CSS | User interface styling |
| OpenAI Responses API | AI reasoning and diagnostic tool selection |
| REST APIs and JSON | Communication between application components |
| Supabase | Persistent investigation and approval records |
| GitHub | Source control |
| Vercel | Application hosting |

## How It Works

1. A user selects a fictional customer support ticket.
2. The frontend sends the ticket ID to the investigation API.
3. The backend provides the ticket context and available diagnostic tools to the OpenAI model.
4. The model requests diagnostic tool calls.
5. The backend validates and executes those calls against fictional BookFlow diagnostic data.
6. The model receives the tool results and continues investigating.
7. A structured investigation report is generated.
8. The report and diagnostic activity are saved to Supabase.
9. A reviewer can inspect, modify, approve, or reject the recommendation.
10. The review decision is persisted and can be retrieved through investigation history.

## Technical Design Decisions

### Backend-Controlled Tool Execution

The AI model can request diagnostic tools, but the application backend controls which tools exist, validates arguments, and executes the functions.

The model does not receive unrestricted access to the database or external systems.

### Structured Outputs

The final investigation report uses a defined JSON schema to produce consistent fields that the frontend can display.

### Human Oversight

AI recommendations require human review before any corrective action.

The current application records review decisions but does not execute remediation or send customer communications.

### Bounded Investigations

The backend limits investigation rounds and diagnostic tool calls to prevent uncontrolled execution.

### Persistence

Investigation reports, tool activity, and review decisions are stored in Supabase rather than existing only in browser memory.

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/investigate` | POST | Run an AI investigation |
| `/api/history` | GET | Retrieve saved investigations |
| `/api/approvals` | POST | Record a review decision |
| `/api/diagnostics/[tool]` | Dynamic | Diagnostic API functionality |

## Security and Production Considerations

This application is a portfolio demonstration, not a production customer-support system.

- All customer and diagnostic data are fictional.
- OpenAI and Supabase credentials are stored server-side.
- The application validates supported ticket IDs and approval inputs.
- Supabase Row Level Security is enabled, and database access uses server-side credentials.
- Public review decisions are not authenticated and should not be treated as verified employee approvals.
- Public AI requests are not currently rate-limited.
- A production implementation would require authentication, authorization, rate limiting, audit controls, and additional operational safeguards.

## What This Project Demonstrates

TriageIQ demonstrates practical capabilities relevant to Sales Engineering and Solutions Engineering:

- AI agent architecture and function calling
- API integrations and JSON data handling
- Technical troubleshooting workflows
- Translating support requirements into technical solutions
- Solution design and architectural tradeoffs
- Database persistence
- Human-in-the-loop workflow design
- Error handling and debugging
- AI-assisted application development
- Deployment and technical documentation

## AI-Assisted Development

TriageIQ was developed with AI assistance.

AI was used to help generate code, troubleshoot implementation issues, and accelerate development. Architectural decisions, application requirements, functional validation, and design tradeoffs were guided through an iterative development process.

## Future Improvements

Potential production enhancements include:

- Authenticated user and reviewer accounts
- Rate limiting and request quotas
- Integrations with real monitoring and ticketing systems
- Automated escalation workflows
- More detailed audit trails
- Expanded diagnostic tools and customer scenarios

---

**Built as a Sales Engineering portfolio project.**

[Try TriageIQ](https://triageiq-alpha.vercel.app)
