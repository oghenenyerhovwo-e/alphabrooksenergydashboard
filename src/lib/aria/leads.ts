import { LeadSource, LeadStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  LEAD_ACTIVE_STATUSES,
  leadStatusLabel,
} from "@/lib/commercial/status";

const MAX_RECENT_LEADS = 20;
const MAX_AUDIT_ENTRIES_PER_LEAD = 8;

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  SALES: "Sales",
  BUSINESS_DEVELOPMENT: "Business Development",
  PHONE: "Phone",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  OTHER: "Other",
};

export interface AriaLeadAuditEntry {
  action: string;
  actorName: string;
  actorRole: string;
  details: string | null;
  createdAt: string;
}

export interface AriaRecentLead {
  referenceNumber: string;
  companyName: string;
  contactPerson: string | null;
  source: string;
  productInterest: string | null;
  status: string;
  statusLabel: string;
  zohoCustomerId: string | null;
  outcomeReason: string | null;
  createdAt: string;
  updatedAt: string;
  ageInDays: number;
  auditHistory: AriaLeadAuditEntry[];
}

export interface AriaLeadsContext {
  generatedAt: string;
  connectionStatus: "connected" | "error";
  hasUsableData: boolean;

  summary: {
    totalLeads: number;
    newLeads: number;
    followUpLeads: number;
    prospects: number;
    customers: number;
    lostLeads: number;
    unqualifiedLeads: number;
    notInterestedLeads: number;
  };

  sources: Array<{
    source: string;
    count: number;
  }>;

  products: Array<{
    product: string;
    count: number;
  }>;

  aging: {
    activeLeadCount: number;
    under7Days: number;
    sevenTo30Days: number;
    thirtyOneTo60Days: number;
    over60Days: number;
  };

  recentLeads: AriaRecentLead[];

  dataIntegrity: {
    leadsAvailable: boolean;
  };
}

function daysSince(date: Date, now: Date): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 86_400_000),
  );
}

function getProductLabel(product: string): string {
  switch (product) {
    case "CNG":
      return "CNG";
    case "AGO":
      return "AGO";
    case "PMS":
      return "PMS";
    case "LPG_BULK":
      return "Bulk LPG";
    case "LPG_CYLINDERS":
      return "LPG Cylinders";
    case "OTHER":
      return "Other";
    default:
      return product;
  }
}

export async function getAriaLeadsContext(): Promise<AriaLeadsContext> {
  const now = new Date();

  try {
    const [
      totalLeads,
      newLeads,
      followUpLeads,
      prospects,
      customers,
      lostLeads,
      unqualifiedLeads,
      notInterestedLeads,
      sourceGroups,
      productGroups,
      activeLeadDates,
      recentLeads,
    ] = await Promise.all([
      prisma.lead.count(),

      prisma.lead.count({
        where: {
          status: LeadStatus.NEW,
        },
      }),

      prisma.lead.count({
        where: {
          status: LeadStatus.FOLLOW_UP,
        },
      }),

      prisma.lead.count({
        where: {
          status: LeadStatus.PROSPECT,
        },
      }),

      prisma.lead.count({
        where: {
          status: LeadStatus.CUSTOMER,
        },
      }),

      prisma.lead.count({
        where: {
          status: LeadStatus.LOST,
        },
      }),

      prisma.lead.count({
        where: {
          status: LeadStatus.UNQUALIFIED,
        },
      }),

      prisma.lead.count({
        where: {
          status: LeadStatus.NOT_INTERESTED,
        },
      }),

      prisma.lead.groupBy({
        by: ["source"],
        _count: true,
      }),

      prisma.lead.groupBy({
        by: ["productInterest"],
        _count: true,
      }),

      prisma.lead.findMany({
        where: {
          status: {
            in: LEAD_ACTIVE_STATUSES,
          },
        },
        select: {
          createdAt: true,
        },
      }),

      prisma.lead.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: MAX_RECENT_LEADS,
        select: {
          referenceNumber: true,
          companyName: true,
          contactPerson: true,
          source: true,
          productInterest: true,
          status: true,
          zohoCustomerId: true,
          outcomeReason: true,
          createdAt: true,
          updatedAt: true,

          auditLogs: {
            orderBy: {
              createdAt: "desc",
            },
            take: MAX_AUDIT_ENTRIES_PER_LEAD,
            select: {
              action: true,
              actorName: true,
              actorRole: true,
              details: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    let under7Days = 0;
    let sevenTo30Days = 0;
    let thirtyOneTo60Days = 0;
    let over60Days = 0;

    for (const lead of activeLeadDates) {
      const age = daysSince(lead.createdAt, now);

      if (age < 7) {
        under7Days += 1;
      } else if (age <= 30) {
        sevenTo30Days += 1;
      } else if (age <= 60) {
        thirtyOneTo60Days += 1;
      } else {
        over60Days += 1;
      }
    }

    return {
      generatedAt: now.toISOString(),
      connectionStatus: "connected",
      hasUsableData: totalLeads > 0,

      summary: {
        totalLeads,
        newLeads,
        followUpLeads,
        prospects,
        customers,
        lostLeads,
        unqualifiedLeads,
        notInterestedLeads,
      },

      sources: sourceGroups
        .map((group) => ({
          source: LEAD_SOURCE_LABELS[group.source],
          count: group._count,
        }))
        .sort((a, b) => b.count - a.count),

      products: productGroups
        .filter((group) => group.productInterest !== null)
        .map((group) => ({
          product: getProductLabel(group.productInterest!),
          count: group._count,
        }))
        .sort((a, b) => b.count - a.count),

      aging: {
        activeLeadCount: activeLeadDates.length,
        under7Days,
        sevenTo30Days,
        thirtyOneTo60Days,
        over60Days,
      },

      recentLeads: recentLeads.map((lead) => ({
        referenceNumber: lead.referenceNumber,
        companyName: lead.companyName,
        contactPerson: lead.contactPerson,
        source: LEAD_SOURCE_LABELS[lead.source],
        productInterest: lead.productInterest
          ? getProductLabel(lead.productInterest)
          : null,
        status: lead.status,
        statusLabel: leadStatusLabel(lead.status),
        zohoCustomerId: lead.zohoCustomerId,
        outcomeReason: lead.outcomeReason,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        ageInDays: daysSince(lead.createdAt, now),

        auditHistory: lead.auditLogs.map((entry) => ({
          action: entry.action,
          actorName: entry.actorName,
          actorRole: entry.actorRole,
          details: entry.details,
          createdAt: entry.createdAt.toISOString(),
        })),
      })),

      dataIntegrity: {
        leadsAvailable: true,
      },
    };
  } catch (error) {
    console.error("[ARIA Leads] Failed to load Lead data:", error);

    return {
      generatedAt: now.toISOString(),
      connectionStatus: "error",
      hasUsableData: false,

      summary: {
        totalLeads: 0,
        newLeads: 0,
        followUpLeads: 0,
        prospects: 0,
        customers: 0,
        lostLeads: 0,
        unqualifiedLeads: 0,
        notInterestedLeads: 0,
      },

      sources: [],
      products: [],

      aging: {
        activeLeadCount: 0,
        under7Days: 0,
        sevenTo30Days: 0,
        thirtyOneTo60Days: 0,
        over60Days: 0,
      },

      recentLeads: [],

      dataIntegrity: {
        leadsAvailable: false,
      },
    };
  }
}