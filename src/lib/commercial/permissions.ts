import { UserRole } from "@/generated/prisma/client";

/**
 * Lead access
 *
 * ADMIN:
 * Administrative oversight of Leads.
 *
 * OPERATIONS:
 * Operations Manager. Responsible for operational Lead management
 * and follow-up.
 *
 * SALES / BUSINESS_DEVELOPMENT:
 * Commercial visibility into Leads.
 *
 * FINANCE:
 * No Lead access.
 */
export function canViewLeads(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.OPERATIONS ||
    role === UserRole.SALES ||
    role === UserRole.BUSINESS_DEVELOPMENT
  );
}

/**
 * Lead management actions.
 *
 * Lead lifecycle management remains with ADMIN and OPERATIONS.
 */
export function canManageLeads(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.OPERATIONS
  );
}

/**
 * Creating a Lead is a Lead-management action.
 */
export function canCreateLead(role: UserRole): boolean {
  return canManageLeads(role);
}

/**
 * Editing Lead information is a Lead-management action.
 */
export function canUpdateLead(role: UserRole): boolean {
  return canManageLeads(role);
}

/**
 * Changing the Lead lifecycle is a Lead-management action.
 */
export function canTransitionLead(role: UserRole): boolean {
  return canManageLeads(role);
}

/**
 * Converting a Prospect into a Customer is an
 * Operations Manager action.
 */
export function canMakeCustomer(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.OPERATIONS;
}

export function canSendDailyPrice(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SALES;
}

/**
 * Commercial Orders
 *
 * Orders are commercial records. Admin and Sales can create/manage them.
 * Operations can view them because they are required for fulfilment.
 */
export function canViewOrders(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.SALES ||
    role === UserRole.OPERATIONS ||
    role === UserRole.BUSINESS_DEVELOPMENT
  );
}

export function canCreateOrder(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.SALES ||
    role === UserRole.BUSINESS_DEVELOPMENT
  );
}