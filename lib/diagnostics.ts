
import {
  customers,
  documentation,
  serviceHealth,
  type CustomerId,
} from "./bookflow-data";

function getCustomer(customerId: string) {
  if (!Object.prototype.hasOwnProperty.call(customers, customerId)) {
    return null;
  }

  return customers[customerId as CustomerId];
}

export function getBookingStatus(customerId: string) {
  const customer = getCustomer(customerId);

  if (!customer) {
    return {
      success: false,
      error: "CUSTOMER_NOT_FOUND",
      message: "The requested customer does not exist.",
    };
  }

  const status = customer.bookingStatus;

  return {
    success: true,
    customerId,
    customerName: customer.name,
    data: {
      ...status,
      failureRate:
        status.bookingsLast24Hours > 0
          ? Number(
              (
                (status.failedBookingsLast24Hours /
                  status.bookingsLast24Hours) *
                100
              ).toFixed(1)
            )
          : 0,
    },
  };
}

export function getErrorLogs(
  customerId: string,
  level?: string
) {
  const customer = getCustomer(customerId);

  if (!customer) {
    return {
      success: false,
      error: "CUSTOMER_NOT_FOUND",
      message: "The requested customer does not exist.",
    };
  }

  const logs = level
    ? customer.logs.filter(
        (log) => log.level === level.toUpperCase()
      )
    : customer.logs;

  return {
    success: true,
    customerId,
    total: logs.length,
    logs,
  };
}

export function getCustomerConfig(customerId: string) {
  const customer = getCustomer(customerId);

  if (!customer) {
    return {
      success: false,
      error: "CUSTOMER_NOT_FOUND",
      message: "The requested customer does not exist.",
    };
  }

  return {
    success: true,
    customerId,
    customerName: customer.name,
    configuration: customer.configuration,
  };
}

export function getServiceHealth() {
  return {
    success: true,
    ...serviceHealth,
  };
}

export function searchDocumentation(query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const results = documentation
    .map((doc) => {
      const searchableText = [
        doc.title,
        doc.content,
        ...doc.keywords,
      ]
        .join(" ")
        .toLowerCase();

      const score = terms.reduce(
        (total, term) =>
          total + (searchableText.includes(term) ? 1 : 0),
        0
      );

      return { ...doc, score };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...doc }) => doc);

  return {
    success: true,
    query,
    total: results.length,
    results,
  };
}
