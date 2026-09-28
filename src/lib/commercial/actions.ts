"use server";

import { sendAriaMail } from "@/lib/graph/mail";
import {
  createSalesProfitabilityNotification,
} from "@/lib/notifications";
import { createNewLeadNotification } from "@/lib/notifications";
import {
  canCloseLeadWithOutcome,
  canMoveLeadToFollowUp,
  canMoveLeadToProspect,
  canTransitionQualification,
} from "@/lib/commercial/status";
import {
  canCreateLead,
  canMakeCustomer,
  canManageLeads,
  canSendDailyPrice,
  canTransitionLead,
  canUpdateLead,
  canViewLeads,
  canViewOrders,
  canCreateOrder,
} from "@/lib/commercial/permissions";
import {
  createZohoCustomer,
  listZohoCustomers,
  type ZohoCustomer,
} from "@/lib/zoho/books";
import { prisma } from "@/lib/prisma";
import { buildUnsubscribeUrl, filterUnsubscribed } from "@/lib/commercial/unsubscribe";
import { getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DeliveryProduct,
  DeliveryUnit,
  LeadSource,
  LeadStatus,
  QualificationState,
  QuoteRequestStatus,
} from "@/generated/prisma/client";
import {
  generateLeadReferenceNumber,
  generateQuoteRequestReferenceNumber,
  generateInternalOrderReferenceNumber,
} from "@/lib/commercial/referenceNumber";
import {
  requiredString,
  optionalString,
  optionalNumber,
  optionalDate,
  isValidEmail,
  isValidLeadSource,
  isValidProduct,
  isValidUnit,
} from "@/lib/commercial/validation";

export interface CommercialActionState {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

/* =========================================================
   LEAD — CREATE
   ========================================================= */

export async function createLeadAction(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }
  if (!canCreateLead(currentUser.role)) {
    return {
      error: "You do not have permission to create leads.",
    };
  }

  const fieldErrors: Record<string, string> = {};

  const companyName = requiredString(formData, "companyName");
  if (!companyName) {
    fieldErrors.companyName = "Company/lead name is required.";
  }

    const contactPerson = optionalString(formData, "contactPerson");
  const role = optionalString(formData, "role");
  const phone = optionalString(formData, "phone");
  const email = optionalString(formData, "email");

  if (email && !isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const location = optionalString(formData, "location");
  const businessNeed = optionalString(formData, "businessNeed");
  const notes = optionalString(formData, "notes");

  const sourceRaw = requiredString(formData, "source");
  if (!sourceRaw || !isValidLeadSource(sourceRaw)) {
    fieldErrors.source = "Select a valid lead source.";
  }

  const productInterestRaw = optionalString(formData, "productInterest");
  if (productInterestRaw && !isValidProduct(productInterestRaw)) {
    fieldErrors.productInterest = "Select a valid product.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please fix the errors below.", fieldErrors };
  }

    let lead;

  try {
    const referenceNumber = await generateLeadReferenceNumber();

    lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
        data: {
          referenceNumber,
          companyName: companyName!,
          contactPerson,
          role,
          phone,
          email,
          location,
          businessNeed,
          notes,
          source: sourceRaw as LeadSource,
          productInterest: productInterestRaw
            ? (productInterestRaw as DeliveryProduct)
            : undefined,
          createdById: currentUser.id,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId: created.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "LEAD_CREATED",
          details: `Lead ${referenceNumber} created.`,
        },
      });

      return created;
    });

    await createNewLeadNotification(
      lead.id,
      lead.referenceNumber
    );
  } catch (error) {
    console.error("[createLeadAction]", error);
    return { error: "Something went wrong while creating the lead." };
  }

  revalidatePath("/commercial");
  revalidatePath("/commercial/leads");

  redirect(`/commercial/leads/${lead.id}?created=1`);
}

/* =========================================================
   LEAD — UPDATE
   ========================================================= */

export async function updateLeadAction(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const leadId = requiredString(formData, "leadId");
  if (!leadId) {
    return { error: "Missing lead reference." };
  }

  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) {
    return { error: "Lead not found." };
  }

  if (!canUpdateLead(currentUser.role)) {
    return {
      error: "You do not have permission to update leads.",
    };
  }

  const fieldErrors: Record<string, string> = {};

  const companyName = requiredString(formData, "companyName");
  if (!companyName) {
    fieldErrors.companyName = "Company/lead name is required.";
  }

    const contactPerson = optionalString(formData, "contactPerson");
  const role = optionalString(formData, "role");
  const phone = optionalString(formData, "phone");
  const email = optionalString(formData, "email");

  if (email && !isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const location = optionalString(formData, "location");
  const businessNeed = optionalString(formData, "businessNeed");
  const nextAction = optionalString(formData, "nextAction");
  const notes = optionalString(formData, "notes");

  const sourceRaw = requiredString(formData, "source");
  if (!sourceRaw || !isValidLeadSource(sourceRaw)) {
    fieldErrors.source = "Select a valid lead source.";
  }

  const productInterestRaw = optionalString(formData, "productInterest");
  if (productInterestRaw && !isValidProduct(productInterestRaw)) {
    fieldErrors.productInterest = "Select a valid product.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please fix the errors below.", fieldErrors };
  }

  try {
    await prisma.$transaction(async (tx) => {
    await tx.lead.update({
        where: { id: leadId },
        data: {
          companyName: companyName!,
          contactPerson,
          role,
          phone,
          email,
          location,
          businessNeed,
          nextAction,
          notes,
          source: sourceRaw as LeadSource,
          productInterest: productInterestRaw
            ? (productInterestRaw as DeliveryProduct)
            : null,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "LEAD_UPDATED",
          details: `Lead ${existing.referenceNumber} updated.`,
        },
      });
    });
  } catch (error) {
    console.error("[updateLeadAction]", error);
    return { error: "Something went wrong while updating the lead." };
  }

  revalidatePath(`/commercial/leads/${leadId}`);
  redirect(`/commercial/leads/${leadId}?updated=1`);
}

/* =========================================================
   LEAD — LIFECYCLE TRANSITION
   ========================================================= */

export async function transitionLeadAction(
  leadId: string,
  nextStatus:
    | "FOLLOW_UP"
    | "PROSPECT"
    | "LOST"
    | "UNQUALIFIED"
    | "NOT_INTERESTED",
  reason?: string
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const existing = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!existing) {
    return { error: "Lead not found." };
  }

  if (!canTransitionLead(currentUser.role)) {
    return {
      error: "You do not have permission to change the Lead status.",
    };
  }

  const requestedStatus = nextStatus as LeadStatus;

  if (existing.status === requestedStatus) {
    return {
      error: `This lead is already ${requestedStatus.toLowerCase().replace("_", " ")}.`,
    };
  }

  /*
   * Forward lifecycle transitions.
   */
  if (requestedStatus === LeadStatus.FOLLOW_UP) {
    if (!canMoveLeadToFollowUp(existing.status)) {
      return {
        error: "This lead cannot be moved to Follow-up from its current status.",
      };
    }
  }

  if (requestedStatus === LeadStatus.PROSPECT) {
    if (!canMoveLeadToProspect(existing.status)) {
      return {
        error: "This lead cannot be converted to Prospect from its current status.",
      };
    }
  }

  /*
   * Terminal outcomes.
   */
  const isOutcome =
    requestedStatus === LeadStatus.LOST ||
    requestedStatus === LeadStatus.UNQUALIFIED ||
    requestedStatus === LeadStatus.NOT_INTERESTED;

  if (isOutcome) {
    if (!canCloseLeadWithOutcome(existing.status)) {
      return {
        error: "This lead cannot be given an unsuccessful outcome from its current status.",
      };
    }

    if (!reason || reason.trim().length === 0) {
      return {
        error: "A reason is required for this outcome.",
        fieldErrors: {
          outcomeReason: "Reason is required.",
        },
      };
    }
  }

  const trimmedReason = reason?.trim() || undefined;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: requestedStatus,
          outcomeReason: isOutcome ? trimmedReason : null,
          outcomeAt: isOutcome ? new Date() : null,
          outcomeById: isOutcome ? currentUser.id : null,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "LEAD_STATUS_CHANGED",
          details: trimmedReason
            ? `Lead ${existing.referenceNumber} changed from ${existing.status} to ${requestedStatus}: ${trimmedReason}`
            : `Lead ${existing.referenceNumber} changed from ${existing.status} to ${requestedStatus}.`,
        },
      });
    });

    revalidatePath(`/commercial/leads/${leadId}`);
    revalidatePath("/commercial/leads");

    return { success: true };
  } catch (error) {
    console.error("[transitionLeadAction]", error);

    return {
      error: "Something went wrong while updating the lead status.",
    };
  }
}

/* =========================================================
   QUOTE REQUEST — CREATE
   ========================================================= */

export async function createQuoteRequestAction(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const leadId = requiredString(formData, "leadId");
  if (!leadId) {
    return { error: "Missing lead reference." };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { error: "The related lead does not exist." };
  }

  const fieldErrors: Record<string, string> = {};

  const requestedProductRaw = requiredString(formData, "requestedProduct");
  if (!requestedProductRaw || !isValidProduct(requestedProductRaw)) {
    fieldErrors.requestedProduct = "Select a valid product.";
  }

  const requestedQuantity = optionalNumber(formData, "requestedQuantity");

  const unitRaw = optionalString(formData, "unit");
  if (unitRaw && !isValidUnit(unitRaw)) {
    fieldErrors.unit = "Select a valid unit.";
  }

  const deliveryLocation = optionalString(formData, "deliveryLocation");
  const requestedDeliveryDate = optionalDate(formData, "requestedDeliveryDate");
  const description = optionalString(formData, "description");
  const notes = optionalString(formData, "notes");

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please fix the errors below.", fieldErrors };
  }

  let quoteRequestId: string;

  try {
    const referenceNumber = await generateQuoteRequestReferenceNumber();

    const created = await prisma.$transaction(async (tx) => {
      const quoteRequest = await tx.quoteRequest.create({
        data: {
          referenceNumber,
          leadId,
          requestedProduct: requestedProductRaw as DeliveryProduct,
          requestedQuantity,
          unit: unitRaw ? (unitRaw as DeliveryUnit) : undefined,
          deliveryLocation,
          requestedDeliveryDate,
          description,
          notes,
          createdById: currentUser.id,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId,
          quoteRequestId: quoteRequest.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "QUOTE_REQUEST_CREATED",
          details: `Quote Request ${referenceNumber} created for lead ${lead.referenceNumber}.`,
        },
      });

      return quoteRequest;
    });

    quoteRequestId = created.id;
  } catch (error) {
    console.error("[createQuoteRequestAction]", error);
    return { error: "Something went wrong while creating the quote request." };
  }

  revalidatePath(`/commercial/leads/${leadId}`);
  revalidatePath("/commercial/quote-requests");
  redirect(`/commercial/quote-requests/${quoteRequestId}?created=1`);
}

export async function createInternalOrderAction(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      error: "You must be signed in to do this.",
    };
  }

  if (!canCreateOrder(currentUser.role)) {
    return {
      error: "You do not have permission to create orders.",
    };
  }

  const fieldErrors: Record<string, string> = {};

  const zohoCustomerId = requiredString(formData, "zohoCustomerId");

  if (!zohoCustomerId) {
    fieldErrors.zohoCustomerId = "Select a customer.";
  }

  const customerName = requiredString(formData, "customerName");

  if (!customerName) {
    fieldErrors.zohoCustomerId = "Select a customer.";
  }

  const productRaw = requiredString(formData, "product");

  if (!productRaw || !isValidProduct(productRaw)) {
    fieldErrors.product = "Select a valid product.";
  }

  const quantityRaw = requiredString(formData, "quantity");
  const quantity = quantityRaw ? Number(quantityRaw) : NaN;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    fieldErrors.quantity = "Enter a quantity greater than zero.";
  }

  const deliveryLocation = requiredString(
    formData,
    "deliveryLocation"
  );

  if (!deliveryLocation) {
    fieldErrors.deliveryLocation = "Delivery location is required.";
  }

  const customerReference = optionalString(
    formData,
    "customerReference"
  );

  const notes = optionalString(formData, "notes");

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  try {
    const referenceNumber =
      await generateInternalOrderReferenceNumber();

    const order = await prisma.internalOrder.create({
      data: {
        referenceNumber,
        zohoCustomerId: zohoCustomerId!,
        customerName: customerName!,
        product: productRaw as DeliveryProduct,
        quantity,
        deliveryLocation: deliveryLocation!,
        customerReference,
        notes,
        createdById: currentUser.id,
      },
    });

    await createSalesProfitabilityNotification({
      internalOrderId: order.id,
      orderReference: order.referenceNumber,
    });

    await prisma.commercialAuditLog.create({
      data: {
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: "INTERNAL_ORDER_CREATED",
        details: `Internal order ${referenceNumber} created for ${customerName}.`,
      },
    });

    revalidatePath("/commercial");
    revalidatePath("/commercial/orders");

    redirect(`/commercial/orders/${order.id}`);
  } catch (error) {
    console.error("[createInternalOrderAction]", error);

    return {
      error: "Something went wrong while creating the internal order.",
    };
  }
}

/* =========================================================
   QUOTE REQUEST — UPDATE
   ========================================================= */

export async function updateQuoteRequestAction(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const quoteRequestId = requiredString(formData, "quoteRequestId");
  if (!quoteRequestId) {
    return { error: "Missing quote request reference." };
  }

  const existing = await prisma.quoteRequest.findUnique({
    where: { id: quoteRequestId },
  });
  if (!existing) {
    return { error: "Quote request not found." };
  }

  const fieldErrors: Record<string, string> = {};

  const requestedProductRaw = requiredString(formData, "requestedProduct");
  if (!requestedProductRaw || !isValidProduct(requestedProductRaw)) {
    fieldErrors.requestedProduct = "Select a valid product.";
  }

  const requestedQuantity = optionalNumber(formData, "requestedQuantity");

  const unitRaw = optionalString(formData, "unit");
  if (unitRaw && !isValidUnit(unitRaw)) {
    fieldErrors.unit = "Select a valid unit.";
  }

  const deliveryLocation = optionalString(formData, "deliveryLocation");
  const requestedDeliveryDate = optionalDate(formData, "requestedDeliveryDate");
  const description = optionalString(formData, "description");
  const notes = optionalString(formData, "notes");

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please fix the errors below.", fieldErrors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.quoteRequest.update({
        where: { id: quoteRequestId },
        data: {
          requestedProduct: requestedProductRaw as DeliveryProduct,
          requestedQuantity,
          unit: unitRaw ? (unitRaw as DeliveryUnit) : null,
          deliveryLocation,
          requestedDeliveryDate,
          description,
          notes,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId: existing.leadId,
          quoteRequestId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "QUOTE_REQUEST_UPDATED",
          details: `Quote Request ${existing.referenceNumber} updated.`,
        },
      });
    });
  } catch (error) {
    console.error("[updateQuoteRequestAction]", error);
    return { error: "Something went wrong while updating the quote request." };
  }

  revalidatePath(`/commercial/quote-requests/${quoteRequestId}`);
  redirect(`/commercial/quote-requests/${quoteRequestId}?updated=1`);
}

/* =========================================================
   QUOTE REQUEST — CLOSE
   ========================================================= */

export async function closeQuoteRequestAction(
  quoteRequestId: string
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const existing = await prisma.quoteRequest.findUnique({
    where: { id: quoteRequestId },
  });
  if (!existing) {
    return { error: "Quote request not found." };
  }

  if (existing.status === QuoteRequestStatus.CLOSED) {
    return { error: "This quote request is already closed." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.quoteRequest.update({
        where: { id: quoteRequestId },
        data: { status: QuoteRequestStatus.CLOSED },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId: existing.leadId,
          quoteRequestId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "QUOTE_REQUEST_CLOSED",
          details: `Quote Request ${existing.referenceNumber} closed.`,
        },
      });
    });

    revalidatePath(`/commercial/quote-requests/${quoteRequestId}`);
    return { success: true };
  } catch (error) {
    console.error("[closeQuoteRequestAction]", error);
    return { error: "Something went wrong while closing the quote request." };
  }
}

/* =========================================================
   QUOTE REQUEST — QUALIFY / DISQUALIFY
   ========================================================= */

export async function qualifyQuoteRequestAction(
  quoteRequestId: string,
  decision: "QUALIFIED" | "DISQUALIFIED",
  reason: string | undefined
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const existing = await prisma.quoteRequest.findUnique({
    where: { id: quoteRequestId },
  });
  if (!existing) {
    return { error: "Quote request not found." };
  }

  if (!canTransitionQualification(existing.qualificationState)) {
    return {
      error: `This quote request has already been ${existing.qualificationState.toLowerCase()}.`,
    };
  }

  if (decision === "DISQUALIFIED" && (!reason || reason.trim().length === 0)) {
    return {
      error: "A reason is required to disqualify a quote request.",
      fieldErrors: { qualificationReason: "Reason is required." },
    };
  }

  const trimmedReason = reason?.trim() || undefined;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.quoteRequest.update({
        where: { id: quoteRequestId },
        data: {
          qualificationState: decision as QualificationState,
          qualificationReason: trimmedReason,
          qualifiedAt: new Date(),
          qualifiedById: currentUser.id,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId: existing.leadId,
          quoteRequestId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action:
            decision === "QUALIFIED"
              ? "QUOTE_REQUEST_QUALIFIED"
              : "QUOTE_REQUEST_DISQUALIFIED",
          details: trimmedReason
            ? `Quote Request ${existing.referenceNumber} ${decision.toLowerCase()}: ${trimmedReason}`
            : `Quote Request ${existing.referenceNumber} ${decision.toLowerCase()}.`,
        },
      });
    });

    revalidatePath(`/commercial/quote-requests/${quoteRequestId}`);
    return { success: true };
  } catch (error) {
    console.error("[qualifyQuoteRequestAction]", error);
    return { error: "Something went wrong while qualifying the quote request." };
  }
}

/* =========================================================
   READ — COMMERCIAL DASHBOARD
   ========================================================= */

export async function getCommercialDashboardData() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }

  const [
    totalLeads,
    newLeads,
    followUpLeads,
    prospects,
    lostLeads,
    unqualifiedLeads,
    notInterestedLeads,
    openQuoteRequests,
    recentLeads,
    recentQuoteRequests,
  ] = await Promise.all([
    prisma.lead.count(),

    prisma.lead.count({
      where: { status: LeadStatus.NEW },
    }),

    prisma.lead.count({
      where: { status: LeadStatus.FOLLOW_UP },
    }),

    prisma.lead.count({
      where: { status: LeadStatus.PROSPECT },
    }),

    prisma.lead.count({
      where: { status: LeadStatus.LOST },
    }),

    prisma.lead.count({
      where: { status: LeadStatus.UNQUALIFIED },
    }),

    prisma.lead.count({
      where: { status: LeadStatus.NOT_INTERESTED },
    }),

    prisma.quoteRequest.count({
      where: { status: QuoteRequestStatus.OPEN },
    }),

    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    prisma.quoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { lead: true },
    }),
  ]);

  return {
    totalLeads,
    newLeads,
    followUpLeads,
    prospects,
    lostLeads,
    unqualifiedLeads,
    notInterestedLeads,
    openQuoteRequests,
    recentLeads,
    recentQuoteRequests,
  };
}

/* =========================================================
   READ — LEADS
   ========================================================= */

export async function getLeads() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }
  if (!canViewLeads(currentUser.role)) {
    throw new Error(
      "Forbidden: you do not have permission to view Leads."
    );
  }

  return prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      quoteRequests: true,
    },
  });
}

export async function getLeadDetail(leadId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }
  if (!canViewLeads(currentUser.role)) {
    throw new Error(
      "Forbidden: you do not have permission to view Leads."
    );
  }

  return prisma.lead.findUnique({
    where: { id: leadId },
    include: {
    createdBy: true,
    quoteRequests: {
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/* =========================================================
   READ — QUOTE REQUESTS
   ========================================================= */

export async function getQuoteRequests() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }

  return prisma.quoteRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lead: true,
    },
  });
}

export async function getQuoteRequestDetail(quoteRequestId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }

  return prisma.quoteRequest.findUnique({
    where: { id: quoteRequestId },
    include: {
      lead: true,
      createdBy: true,
      qualifiedBy: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/* =========================================================
   LEAD — CONVERT PROSPECT TO CUSTOMER
   ========================================================= */

export async function makeCustomerAction(
  leadId: string,
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      error: "You must be signed in to do this.",
    };
  }

  if (!canMakeCustomer(currentUser.role)) {
    return {
      error: "Only the Operations Manager can make a Lead a Customer.",
    };
  }

  if (!leadId || !leadId.trim()) {
    return {
      error: "Missing Lead reference.",
    };
  }

  const existing = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!existing) {
    return {
      error: "Lead not found.",
    };
  }

  if (existing.status !== LeadStatus.PROSPECT) {
    return {
      error:
        "Only a Prospect can be converted to a Customer.",
    };
  }

  if (existing.zohoCustomerId) {
    return {
      error:
        "This Prospect already has a Zoho Books customer reference.",
    };
  }

  let zohoCustomer;

  try {
    zohoCustomer = await createZohoCustomer({
      companyName: existing.companyName,
      contactPerson: existing.contactPerson,
      phone: existing.phone,
      email: existing.email,
      notes: existing.notes,
    });
  } catch (error) {
    console.error("[makeCustomerAction] Zoho customer creation failed:", {
      leadId,
      error,
    });

    try {
      await prisma.commercialAuditLog.create({
        data: {
          leadId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "LEAD_CUSTOMER_CONVERSION_FAILED",
          details:
            `Customer conversion failed for Lead ${existing.referenceNumber}. ` +
            `Zoho Books customer creation did not succeed. ` +
            `Reason: ${
              error instanceof Error
                ? error.message
                : "Unknown Zoho error."
            }`,
        },
      });
    } catch (auditError) {
      console.error(
        "[makeCustomerAction] Failed to record conversion failure audit:",
        auditError,
      );
    }

    return {
      error:
        error instanceof Error
          ? error.message
          : "Zoho Books customer creation failed. The Lead remains a Prospect.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.CUSTOMER,
          zohoCustomerId: zohoCustomer.contactId,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "LEAD_CONVERTED_TO_CUSTOMER",
          details:
            `Lead ${existing.referenceNumber} converted from Prospect to Customer. ` +
            `Zoho Books customer ID: ${zohoCustomer.contactId}.`,
        },
      });
    });
    } catch (error) {
    console.error(
      "[makeCustomerAction] Failed to update Lead after Zoho creation:",
      {
        leadId,
        zohoCustomerId: zohoCustomer.contactId,
        error,
      },
    );

    try {
      await prisma.commercialAuditLog.create({
        data: {
          leadId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "LEAD_CUSTOMER_CONVERSION_RECONCILIATION_REQUIRED",
          details:
            `Zoho Books customer ${zohoCustomer.contactId} was created for ` +
            `Lead ${existing.referenceNumber}, but Alpha Brooks could not ` +
            `complete the Lead conversion. Manual reconciliation is required ` +
            `before another conversion attempt.`,
        },
      });
    } catch (auditError) {
      console.error(
        "[makeCustomerAction] Failed to record reconciliation audit:",
        auditError,
      );
    }

    return {
      error:
        "The Zoho Books customer was created, but Alpha Brooks could not finish updating the Lead. Please do not retry yet; the Zoho customer reference needs to be reconciled.",
    };
  }

  revalidatePath(`/commercial/leads/${leadId}`);
  revalidatePath("/commercial/leads");
  revalidatePath("/commercial");

  return {
    success: true,
  };
}


/**
 * Public-facing links included in the daily price email footer.
 * Keep these pointed at real, owned destinations only (company domain +
 * verified social profiles) — plain https links to a company's own
 * verified profiles do not pose a cybersecurity risk to the recipient's
 * organization. Corporate mail gateways (Mimecast, Proofpoint, MS
 * Defender, etc.) score outbound-looking links on reputation, not
 * presence, so: use the full canonical URL for each (no link shorteners
 * like bit.ly — those get flagged more often), keep the link count small,
 * and don't attach files to this email. If a customer's IT team ever
 * blocks it, it's almost always their gateway sandboxing an unfamiliar
 * sending domain the first time, not something about the links.
 */
const COMPANY_WEBSITE_URL =
  process.env.COMPANY_WEBSITE_URL || "https://alphabrooksenergy.com";

const MAIL_LOGO_URL = `${(
  process.env.NEXT_PUBLIC_APP_URL || "https://alphabrooksenergy.com"
).replace(/\/$/, "")}/images/mail_logo.png`;

const COMPANY_SOCIAL_LINKS: { label: string; url: string }[] = [
  process.env.COMPANY_LINKEDIN_URL
    ? { label: "LinkedIn", url: process.env.COMPANY_LINKEDIN_URL }
    : null,
  process.env.COMPANY_INSTAGRAM_URL
    ? { label: "Instagram", url: process.env.COMPANY_INSTAGRAM_URL }
    : null,
  process.env.COMPANY_X_URL
    ? { label: "X (Twitter)", url: process.env.COMPANY_X_URL }
    : null,
  process.env.COMPANY_FACEBOOK_URL
    ? { label: "Facebook", url: process.env.COMPANY_FACEBOOK_URL }
    : null,
].filter((link): link is { label: string; url: string } => link !== null);

export async function getDailyPriceRecipientsAction(): Promise<
  { email: string; name: string }[]
> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("You must be signed in to do this.");
  }

  if (!canSendDailyPrice(currentUser.role)) {
    throw new Error("Only Sales can send today's price.");
  }

    const customers = await listZohoCustomers();

    const withEmail = customers
      .filter((customer) => customer.email?.trim())
      .map((customer) => ({
        email: customer.email.trim(),
        name:
          customer.companyName?.trim() ||
          customer.contactName?.trim() ||
          "Customer",
      }));

        return filterUnsubscribed(dedupeCustomersByEmail(withEmail));
  }

function dedupeCustomersByEmail<T extends { email: string }>(
  customers: T[]
): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const customer of customers) {
    const key = customer.email.trim().toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(customer);
  }

  return deduped;
}

function buildDailyPriceEmail(
  customerName: string,
  price: number,
  salesPersonName: string,
  salesPersonTitle: string | null,
  salesPersonPhone: string | null,
  salesPersonEmail: string,
  unsubscribeUrl: string
): string {
  const formattedPrice = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 2,
  }).format(price);

  const safeCustomerName = customerName || "Customer";

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <div style="max-width:600px;margin:0 auto;padding:28px 20px;">

      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hello ${safeCustomerName},
      </p>

      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
        Please find today's AGO price from AlphaBrooks Energy Limited below.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
          <td align="center" style="background:#f7f2df;border:1px solid #eadcae;border-radius:12px;padding:22px 15px;">
            <div style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#806b25;">
              TODAY'S PRICE
            </div>
            <div style="font-size:36px;font-weight:800;color:#17624b;margin-top:6px;">
              ₦${formattedPrice}
            </div>
          </td>
        </tr>
      </table>

      <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">
        Ready to order? Reply to this email and our team will assist.
      </p>

      <p style="font-size:12.5px;line-height:1.6;color:#5b675f;border-top:1px dashed #e4e9e5;padding-top:14px;margin:0 0 24px;">
        This price applies to <strong>cash (immediate) payment</strong> only.
        Orders on credit days are subject to separate terms and conditions —
        please contact our Sales team to discuss credit pricing.
      </p>

      <p style="font-size:14px;line-height:1.7;margin:0 0 4px;">
        Warm regards,<br />
        <strong style="color:#5a9f35;">${salesPersonName}</strong><br />
        ${
          salesPersonTitle
            ? `<em style="color:#5a9f35;">${salesPersonTitle}</em><br />`
            : ""
        }
        <strong>AlphaBrooks Energy Limited</strong><br />
        ${salesPersonPhone ? `📞 ${salesPersonPhone}<br />` : ""}
        📧 ${salesPersonEmail}
      </p>

      <img
        src="${MAIL_LOGO_URL}"
        alt="AlphaBrooks Energy"
        width="90"
        style="margin-top:18px;display:block;"
      />

      <p style="font-size:12px;color:#9aa59f;margin-top:10px;">
        Adeyemo Alakija, Victoria Island, Lagos
      </p>

      <p style="font-size:12px;color:#9aa59f;margin-top:16px;">
        <a href="${COMPANY_WEBSITE_URL}" style="color:#17624b;text-decoration:none;">${COMPANY_WEBSITE_URL.replace(/^https?:\/\//, "")}</a>
        ${
          COMPANY_SOCIAL_LINKS.length > 0
            ? " &nbsp;|&nbsp; " +
              COMPANY_SOCIAL_LINKS.map(
                (link) =>
                  `<a href="${link.url}" style="color:#17624b;text-decoration:none;">${link.label}</a>`
              ).join(" &nbsp;|&nbsp; ")
            : ""
        }
      </p>

      <p style="font-size:11px;color:#b7c0ba;margin-top:10px;">
        <a href="${unsubscribeUrl}" style="color:#b7c0ba;text-decoration:underline;">Unsubscribe from daily price emails</a>
      </p>

      <p style="font-size:10.5px;line-height:1.6;color:#9aa59f;margin-top:26px;border-top:1px solid #edf0ed;padding-top:16px;">
        The information in this e-mail is regarded as official, confidential, legally privileged and intended solely for the designated recipient(s). Any otherwise usage would be regarded as unauthorized. If this e-mail is received in error, please reply to the sender with the caption "Received in error," and immediately delete the e-mail and copies (if any). Unauthorized disclosure, copying, distribution or any dealings with the contents in this e-mail is prohibited, unlawful and actionable under our laws. Alpha Brooks Energy Limited hereby abdicates itself from any liability resulting from the unintended opinions, conclusions, interpretation of the information in this e-mail and any attachments thereto. Alpha Brooks Energy Limited cannot guarantee that e-mail communications are secure or error-free, as information could be intercepted, corrupted, amended, lost, destroyed, arrive late or incomplete, or contain viruses. Alpha Brooks Energy Limited is a licensed mid-downstream oil and gas company by the Nigerian Midstream and Downstream Petroleum Regulatory Authority registered and operates in accordance with all applicable Nigerian laws and regulations.
      </p>

    </div>
  </body>
</html>
`;
}

export async function sendDailyPriceAction(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      error: "You must be signed in to do this.",
    };
  }

  if (!canSendDailyPrice(currentUser.role)) {
    return {
      error: "Only Sales can send today's price.",
    };
  }

  const priceRaw = formData.get("price");

  if (typeof priceRaw !== "string" || !priceRaw.trim()) {
    return {
      error: "Enter today's price.",
    };
  }

  const price = Number(priceRaw);

  if (!Number.isFinite(price) || price <= 0) {
    return {
      error: "Enter a valid price greater than zero.",
    };
  }

  if (!currentUser.email) {
    return {
      error: "Your Sales account does not have an email address.",
    };
  }

  // Test mode: when the "Send a test to me only" box is checked on the form,
  // the price email is sent ONLY to the current Sales user's own inbox
  // instead of the full customer list. Use this to confirm the pipeline is
  // actually delivering (check the inbox, check console output) before
  // doing a real bulk send.
  const isTestSend = formData.get("testOnly") === "on";

  try {
    const recipients: Pick<
      ZohoCustomer,
      "email" | "companyName" | "contactName"
    >[] = isTestSend
      ? [
          {
            email: currentUser.email,
            companyName: currentUser.name,
            contactName: currentUser.name,
          },
        ]
          : await filterUnsubscribed(
            dedupeCustomersByEmail(
              (await listZohoCustomers()).filter((customer) =>
                customer.email?.trim()
              )
            )
          );

    if (recipients.length === 0) {
      return {
        error: "No customers with email addresses were found.",
      };
    }

    console.log(
      `[sendDailyPriceAction] Starting ${isTestSend ? "TEST" : "bulk"} send — price ₦${price}, ${recipients.length} recipient(s), triggered by ${currentUser.email} at ${new Date().toISOString()}`
    );

    
    const ccRecipients: string[] = isTestSend
      ? []
      : [process.env.ARIA_MD_EMAIL, process.env.ARIA_IT_HEAD_EMAIL].filter(
          (email): email is string => !!email?.trim()
        );

    let sentCount = 0;
    let failedCount = 0;

    for (const customer of recipients) {
      const recipientEmail = customer.email!.trim();

      try {
        const customerName =
          customer.companyName?.trim() ||
          customer.contactName?.trim() ||
          "Customer";

                const unsubscribeUrl = buildUnsubscribeUrl(recipientEmail);

        const bodyHtml = buildDailyPriceEmail(
          customerName,
          price,
          currentUser.name,
          currentUser.jobTitle,
          currentUser.phone,
          currentUser.email,
          unsubscribeUrl
        );

        await sendAriaMail({
          from: currentUser.email,
          to: recipientEmail,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          listUnsubscribeUrl: unsubscribeUrl,
          subject: isTestSend
            ? "[TEST] Today's AGO Price | Alpha Brooks Energy"
            : "Today's AGO Price | Alpha Brooks Energy",
          bodyHtml,
        });

        sentCount++;

        // Confirms, per recipient, that the Graph sendMail call resolved
        // without throwing. Graph's /sendMail returns 202 with no body, so
        // this log line (plus the item landing in the Sent Items folder of
        // ARIA_SENDER_EMAIL) is the actual proof of delivery hand-off —
        // there's no message ID to check here.
        console.log(
          `[sendDailyPriceAction] ✓ sent to ${recipientEmail} (${customerName})`
        );
      } catch (error) {
        failedCount++;

        console.error(
          "[sendDailyPriceAction] ✗ Failed to send to customer:",
          recipientEmail,
          error
        );
      }
    }

    console.log(
      `[sendDailyPriceAction] Finished ${isTestSend ? "TEST" : "bulk"} send — ${sentCount} sent, ${failedCount} failed.`
    );

    if (sentCount === 0) {
      return {
        error: "The price could not be sent to any customer.",
      };
    }

    if (isTestSend) {
      return {
        success: true,
        message: `Test email sent to ${currentUser.email}. Check that inbox before sending to all customers.`,
      };
    }

    if (failedCount > 0) {
      return {
        success: true,
        message: `Today's price was sent to ${sentCount} customer${sentCount === 1 ? "" : "s"}. ${failedCount} customer${failedCount === 1 ? "" : "s"} could not be reached.`,
      };
    }

    return {
      success: true,
      message: `Today's price was sent to ${sentCount} customer${sentCount === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    console.error("[sendDailyPriceAction]", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while sending today's price.",
    };
  }
}

/* =========================================================
   READ — INTERNAL ORDERS
   ========================================================= */

export async function getInternalOrders() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error(
      "Unauthorized: you must be signed in to view Orders.",
    );
  }

  if (!canViewOrders(currentUser.role)) {
    throw new Error(
      "Forbidden: you do not have permission to view Orders.",
    );
  }

  return prisma.internalOrder.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function getInternalOrderDetail(orderId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error(
      "Unauthorized: you must be signed in to view Orders.",
    );
  }

  if (!canViewOrders(currentUser.role)) {
    throw new Error(
      "Forbidden: you do not have permission to view Orders.",
    );
  }

  return prisma.internalOrder.findUnique({
    where: {
      id: orderId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      notifications: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}