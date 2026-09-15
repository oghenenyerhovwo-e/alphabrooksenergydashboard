"use server";

import { canTransitionQualification } from "@/lib/commercial/status"
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
    const referenceNumber = await generateLeadReferenceNumber();

    const lead = await prisma.$transaction(async (tx) => {
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

    revalidatePath("/commercial/leads");
    redirect(`/commercial/leads/${lead.id}?created=1`);
  } catch (error) {
    console.error("[createLeadAction]", error);
    return { error: "Something went wrong while creating the lead." };
  }
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
   LEAD — CLOSE (record lifecycle status, not qualification)
   ========================================================= */

export async function closeLeadAction(
  leadId: string
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) {
    return { error: "Lead not found." };
  }

  if (existing.status === LeadStatus.CLOSED) {
    return { error: "This lead is already closed." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: { status: LeadStatus.CLOSED },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: "LEAD_CLOSED",
          details: `Lead ${existing.referenceNumber} closed.`,
        },
      });
    });

    revalidatePath(`/commercial/leads/${leadId}`);
    return { success: true };
  } catch (error) {
    console.error("[closeLeadAction]", error);
    return { error: "Something went wrong while closing the lead." };
  }
}

/* =========================================================
   LEAD — QUALIFY / DISQUALIFY
   ========================================================= */

export async function qualifyLeadAction(
  leadId: string,
  decision: "QUALIFIED" | "DISQUALIFIED",
  reason: string | undefined
): Promise<CommercialActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) {
    return { error: "Lead not found." };
  }

  if (!canTransitionQualification(existing.qualificationState)) {
    return {
      error: `This lead has already been ${existing.qualificationState.toLowerCase()}.`,
    };
  }

  if (decision === "DISQUALIFIED" && (!reason || reason.trim().length === 0)) {
    return {
      error: "A reason is required to disqualify a lead.",
      fieldErrors: { qualificationReason: "Reason is required." },
    };
  }

  const trimmedReason = reason?.trim() || undefined;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          qualificationState: decision as QualificationState,
          qualificationReason: trimmedReason,
          qualifiedAt: new Date(),
          qualifiedById: currentUser.id,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: decision === "QUALIFIED" ? "LEAD_QUALIFIED" : "LEAD_DISQUALIFIED",
          details: trimmedReason
            ? `Lead ${existing.referenceNumber} ${decision.toLowerCase()}: ${trimmedReason}`
            : `Lead ${existing.referenceNumber} ${decision.toLowerCase()}.`,
        },
      });
    });

    revalidatePath(`/commercial/leads/${leadId}`);
    return { success: true };
  } catch (error) {
    console.error("[qualifyLeadAction]", error);
    return { error: "Something went wrong while qualifying the lead." };
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
    pendingLeads,
    qualifiedLeads,
    disqualifiedLeads,
    openQuoteRequests,
    recentLeads,
    recentQuoteRequests,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { qualificationState: QualificationState.PENDING } }),
    prisma.lead.count({ where: { qualificationState: QualificationState.QUALIFIED } }),
    prisma.lead.count({ where: { qualificationState: QualificationState.DISQUALIFIED } }),
    prisma.quoteRequest.count({ where: { status: QuoteRequestStatus.OPEN } }),
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
    pendingLeads,
    qualifiedLeads,
    disqualifiedLeads,
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

  return prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      createdBy: true,
      qualifiedBy: true,
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

