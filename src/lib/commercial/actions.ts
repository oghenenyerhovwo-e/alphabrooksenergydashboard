"use server";

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
  canTransitionLead,
  canUpdateLead,
  canViewLeads,
} from "@/lib/commercial/permissions";
import { createZohoCustomer } from "@/lib/zoho/books";
import { prisma } from "@/lib/prisma";
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
  const phone = optionalString(formData, "phone");
  const email = optionalString(formData, "email");

  if (email && !isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const location = optionalString(formData, "location");
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
          phone,
          email,
          location,
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
  const phone = optionalString(formData, "phone");
  const email = optionalString(formData, "email");

  if (email && !isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const location = optionalString(formData, "location");
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
          phone,
          email,
          location,
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

