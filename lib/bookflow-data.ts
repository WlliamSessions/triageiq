
export type CustomerId =
  | "willow-wellness"
  | "brightside-dental"
  | "northstar-fitness";

export type DiagnosticLog = {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  service: string;
  code: string;
  message: string;
  httpStatus?: number;
};

export type CustomerRecord = {
  id: CustomerId;
  name: string;
  bookingStatus: {
    status: "healthy" | "degraded" | "failing";
    bookingsLast24Hours: number;
    failedBookingsLast24Hours: number;
    lastSuccessfulBooking: string;
  };
  configuration: {
    bookingEnabled: boolean;
    calendarConnected: boolean;
    calendarSyncEnabled: boolean;
    confirmationEmailsEnabled: boolean;
    timezone: string;
    apiKeyStatus: "active" | "expired";
    maxBookingsPerSlot: number;
  };
  logs: DiagnosticLog[];
};

export const customers: Record<CustomerId, CustomerRecord> = {
  "willow-wellness": {
    id: "willow-wellness",
    name: "Willow Wellness",
    bookingStatus: {
      status: "failing",
      bookingsLast24Hours: 42,
      failedBookingsLast24Hours: 31,
      lastSuccessfulBooking: "2026-10-15T08:45:00Z",
    },
    configuration: {
      bookingEnabled: true,
      calendarConnected: true,
      calendarSyncEnabled: true,
      confirmationEmailsEnabled: true,
      timezone: "America/New_York",
      apiKeyStatus: "expired",
      maxBookingsPerSlot: 1,
    },
    logs: [
      {
        id: "log-1001",
        timestamp: "2026-10-15T09:41:00Z",
        level: "ERROR",
        service: "booking-api",
        code: "AUTH_TOKEN_EXPIRED",
        message:
          "Booking request rejected because the customer's API credential has expired.",
        httpStatus: 401,
      },
      {
        id: "log-1002",
        timestamp: "2026-10-15T09:38:00Z",
        level: "ERROR",
        service: "booking-api",
        code: "UNAUTHORIZED",
        message:
          "Unable to authenticate booking request.",
        httpStatus: 401,
      },
      {
        id: "log-1003",
        timestamp: "2026-10-15T08:45:00Z",
        level: "INFO",
        service: "booking-api",
        code: "BOOKING_CREATED",
        message: "Appointment successfully created.",
        httpStatus: 201,
      },
    ],
  },

  "brightside-dental": {
    id: "brightside-dental",
    name: "Brightside Dental",
    bookingStatus: {
      status: "healthy",
      bookingsLast24Hours: 67,
      failedBookingsLast24Hours: 0,
      lastSuccessfulBooking: "2026-10-15T10:12:00Z",
    },
    configuration: {
      bookingEnabled: true,
      calendarConnected: true,
      calendarSyncEnabled: true,
      confirmationEmailsEnabled: false,
      timezone: "America/Chicago",
      apiKeyStatus: "active",
      maxBookingsPerSlot: 1,
    },
    logs: [
      {
        id: "log-2001",
        timestamp: "2026-10-15T10:13:00Z",
        level: "WARN",
        service: "notification-service",
        code: "EMAIL_NOTIFICATIONS_DISABLED",
        message:
          "Confirmation email skipped because customer notifications are disabled.",
      },
      {
        id: "log-2002",
        timestamp: "2026-10-15T10:12:00Z",
        level: "INFO",
        service: "booking-api",
        code: "BOOKING_CREATED",
        message: "Appointment successfully created.",
        httpStatus: 201,
      },
    ],
  },

  "northstar-fitness": {
    id: "northstar-fitness",
    name: "Northstar Fitness",
    bookingStatus: {
      status: "degraded",
      bookingsLast24Hours: 94,
      failedBookingsLast24Hours: 3,
      lastSuccessfulBooking: "2026-10-15T11:01:00Z",
    },
    configuration: {
      bookingEnabled: true,
      calendarConnected: true,
      calendarSyncEnabled: false,
      confirmationEmailsEnabled: true,
      timezone: "America/Detroit",
      apiKeyStatus: "active",
      maxBookingsPerSlot: 1,
    },
    logs: [
      {
        id: "log-3001",
        timestamp: "2026-10-15T11:04:00Z",
        level: "ERROR",
        service: "calendar-service",
        code: "CALENDAR_SYNC_DISABLED",
        message:
          "External calendar availability was not synchronized before accepting a booking.",
      },
      {
        id: "log-3002",
        timestamp: "2026-10-15T11:02:00Z",
        level: "WARN",
        service: "booking-api",
        code: "SLOT_CONFLICT",
        message:
          "A booking conflicts with an existing external calendar event.",
        httpStatus: 409,
      },
      {
        id: "log-3003",
        timestamp: "2026-10-15T11:01:00Z",
        level: "INFO",
        service: "booking-api",
        code: "BOOKING_CREATED",
        message: "Appointment successfully created.",
        httpStatus: 201,
      },
    ],
  },
};

export const serviceHealth = {
  platform: "BookFlow",
  status: "operational",
  checkedAt: "2026-10-15T11:15:00Z",
  services: [
    { name: "booking-api", status: "operational" },
    { name: "notification-service", status: "operational" },
    { name: "calendar-service", status: "operational" },
    { name: "authentication-service", status: "operational" },
  ],
  activeIncidents: [],
};

export const documentation = [
  {
    id: "DOC-001",
    title: "Troubleshooting Booking Authentication Errors",
    keywords: ["booking", "401", "authentication", "api", "expired", "token"],
    content:
      "HTTP 401 errors may indicate expired or invalid API credentials. Verify the customer's credential status. If expired, generate a replacement credential and update the customer's integration configuration. Do not expose credentials in support logs.",
  },
  {
    id: "DOC-002",
    title: "Troubleshooting Missing Confirmation Emails",
    keywords: ["email", "confirmation", "notification", "delivery", "disabled"],
    content:
      "If bookings are successful but confirmation emails are missing, inspect notification logs and verify that confirmation emails are enabled. If notifications are disabled, recommend enabling them after confirming customer preferences.",
  },
  {
    id: "DOC-003",
    title: "Troubleshooting Calendar Sync Conflicts",
    keywords: ["calendar", "sync", "double", "booking", "conflict", "availability"],
    content:
      "Double bookings can occur when external calendar availability is not synchronized. Verify calendar connection and synchronization settings. Re-enable synchronization after validating the external calendar connection, then test availability before accepting new bookings.",
  },
  {
    id: "DOC-004",
    title: "Investigating BookFlow Service Incidents",
    keywords: ["incident", "outage", "500", "health", "service", "error"],
    content:
      "Check platform service health and recent error logs. Escalate to engineering when evidence indicates a platform-side failure, especially if multiple customers are affected. Do not conclude that a platform outage exists without supporting evidence.",
  },
];
