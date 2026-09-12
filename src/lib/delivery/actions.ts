"use server";

import { getDeliveryStatusGroup } from "@/lib/delivery/statusGroup";
import { sendAriaMail } from "@/lib/graph/mail";
import { prisma } from "@/lib/prisma";
import { generateDeliveryNoteNumber } from "@/lib/deliveryNoteNumber";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DeliveryProduct,
  DeliveryStatus,
  DeliveryUnit,
} from "@/generated/prisma/client";

export interface CreateDeliveryFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface DeliveryActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface SendNoteActionState {
  success?: string;
  error?: string;
}

function requiredString(
  formData: FormData,
  key: string
): string | null {
  const value = formData.get(key);

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}

function optionalString(
  formData: FormData,
  key: string
): string | undefined {
  const value = formData.get(key);

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return undefined;
  }

  return value.trim();
}

function requiredNumber(
  formData: FormData,
  key: string
): number | null {
  const value = formData.get(key);

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseDate(
  value: string | undefined
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}



/* =========================================================
   MODULE 1 — CREATE DELIVERY
   ========================================================= */

export async function createDeliveryAction(
  _prevState: CreateDeliveryFormState,
  formData: FormData
): Promise<CreateDeliveryFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const fieldErrors: Record<string, string> = {};

  const customer = requiredString(
    formData,
    "customer"
  );

  if (!customer) {
    fieldErrors.customer =
      "Customer name is required.";
  }

  const customerLocation = optionalString(
    formData,
    "customerLocation"
  );

  const deliveryAddress = requiredString(
    formData,
    "deliveryAddress"
  );

  if (!deliveryAddress) {
    fieldErrors.deliveryAddress =
      "Delivery address is required.";
  }

  const contactEmail = requiredString(
    formData,
    "contactEmail"
  );

  if (!contactEmail) {
    fieldErrors.contactEmail =
      "Contact email is required.";
  } else if (!EMAIL_PATTERN.test(contactEmail)) {
    fieldErrors.contactEmail =
      "Enter a valid email address.";
  }

  const destination = requiredString(
    formData,
    "destination"
  );

  if (!destination) {
    fieldErrors.destination =
      "Destination is required.";
  }

  const productRaw = requiredString(
    formData,
    "product"
  );

  let product: DeliveryProduct | null = null;

  if (!productRaw) {
    fieldErrors.product =
      "Product is required.";
  } else if (
    !Object.values(DeliveryProduct).includes(
      productRaw as DeliveryProduct
    )
  ) {
    fieldErrors.product =
      "Invalid delivery product.";
  } else {
    product = productRaw as DeliveryProduct;
  }

  const unitRaw = requiredString(
    formData,
    "unit"
  );

  let unit: DeliveryUnit | null = null;

  if (!unitRaw) {
    fieldErrors.unit =
      "Unit is required.";
  } else if (
    !Object.values(DeliveryUnit).includes(
      unitRaw as DeliveryUnit
    )
  ) {
    fieldErrors.unit =
      "Invalid delivery unit.";
  } else {
    unit = unitRaw as DeliveryUnit;
  }

  const quantityLoaded = requiredNumber(
    formData,
    "quantityLoaded"
  );

  if (quantityLoaded === null) {
    fieldErrors.quantityLoaded =
      "Enter a valid quantity.";
  }

  const departureAtRaw = optionalString(
    formData,
    "departureAt"
  );

  const departureAt = parseDate(
    departureAtRaw
  );

  if (
    departureAtRaw &&
    !departureAt
  ) {
    fieldErrors.departureAt =
      "Enter a valid departure date and time.";
  }

  const driverId = optionalString(
    formData,
    "driverId"
  );

  const vehicleId = optionalString(
    formData,
    "vehicleId"
  );

  const loadingPoint = optionalString(
    formData,
    "loadingPoint"
  );

  const deliveryPoint = optionalString(
    formData,
    "deliveryPoint"
  );

  const trailerNumber = optionalString(
    formData,
    "trailerNumber"
  );

  const deliveryRemarks = optionalString(
    formData,
    "deliveryRemarks"
  );

  if (
    Object.keys(fieldErrors).length > 0
  ) {
    return {
      error:
        "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  if (
    !customer ||
    !deliveryAddress ||
    !contactEmail ||
    !destination ||
    !product ||
    !unit ||
    quantityLoaded === null
  ) {
    return {
      error:
        "Please provide all required delivery information.",
    };
  }

  /*
   * If a driver or vehicle is supplied during
   * creation, verify that both records actually
   * exist and are active.
   */

  if (driverId) {
    const driver =
      await prisma.driver.findFirst({
        where: {
          id: driverId,
          active: true,
        },
      });

    if (!driver) {
      return {
        error:
          "The selected driver does not exist or is inactive.",
        fieldErrors: {
          driverId:
            "Select an active driver.",
        },
      };
    }
  }

  if (vehicleId) {
    const vehicle =
      await prisma.vehicle.findFirst({
        where: {
          id: vehicleId,
          active: true,
        },
      });

    if (!vehicle) {
      return {
        error:
          "The selected vehicle does not exist or is inactive.",
        fieldErrors: {
          vehicleId:
            "Select an active vehicle.",
        },
      };
    }
  }

  /*
   * A driver and vehicle must be supplied together
   * when creating an assigned delivery.
   */

  if (
    (driverId && !vehicleId) ||
    (!driverId && vehicleId)
  ) {
    return {
      error:
        "A driver and vehicle must be assigned together.",
    };
  }

  try {
    const dnNumber =
      await generateDeliveryNoteNumber(
        departureAt ?? new Date()
      );

    const delivery =
      await prisma.delivery.create({
        data: {
          deliveryNoteNumber: dnNumber,

          customer,
          customerLocation,
          deliveryAddress,
          contactEmail,

          product,
          unit,
          quantityLoaded,

          loadingPoint,
          deliveryPoint,

          destination,
          departureAt,

          trailerNumber,
          deliveryRemarks,

          driverId,
          vehicleId,

          status: driverId
            ? DeliveryStatus.ASSIGNED
            : DeliveryStatus.DRAFT,
        },
      });

    await prisma.deliveryAuditLog.create({
      data: {
        deliveryId: delivery.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: driverId
          ? "CREATED_AND_ASSIGNED"
          : "CREATED",
        details: driverId
          ? `Delivery ${dnNumber} created and assigned.`
          : `Delivery ${dnNumber} created as draft.`,
      },
    });

    revalidatePath(
      "/operations/deliveries"
    );

    redirect(
      `/operations/deliveries/${delivery.id}?created=1`
    );
  } catch (error) {
    console.error(
      "[createDeliveryAction]",
      error
    );

    return {
      error:
        "Could not create the delivery. Please try again.",
    };
  }
}

/* =========================================================
   MODULE 2 — ASSIGN DELIVERY
   ========================================================= */

export async function assignDeliveryAction(
  _prevState: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const deliveryId = requiredString(
    formData,
    "deliveryId"
  );

  const driverId = requiredString(
    formData,
    "driverId"
  );

  const vehicleId = requiredString(
    formData,
    "vehicleId"
  );

  if (!deliveryId) {
    return {
      error: "Delivery ID is required.",
    };
  }

  if (!driverId) {
    return {
      fieldErrors: {
        driverId:
          "Select a driver.",
      },
      error:
        "A driver must be selected.",
    };
  }

  if (!vehicleId) {
    return {
      fieldErrors: {
        vehicleId:
          "Select a vehicle.",
      },
      error:
        "A vehicle must be selected.",
    };
  }

  try {
    /*
     * Fetch the delivery first.
     */
    const delivery =
      await prisma.delivery.findUnique({
        where: {
          id: deliveryId,
        },
      });

    if (!delivery) {
      return {
        error:
          "Delivery not found.",
      };
    }

    /*
     * Assignment is only allowed before dispatch.
     */
    if (
      delivery.status !== DeliveryStatus.DRAFT &&
      delivery.status !== DeliveryStatus.ASSIGNED
    ) {
      return {
        error:
          "This delivery can no longer be assigned because it has already progressed beyond the assignment stage.",
      };
    }

    /*
     * Driver must exist AND be active.
     */
    const driver =
      await prisma.driver.findFirst({
        where: {
          id: driverId,
          active: true,
        },
      });

    if (!driver) {
      return {
        error:
          "The selected driver does not exist or is inactive.",
        fieldErrors: {
          driverId:
            "Select an active driver.",
        },
      };
    }

    /*
     * Vehicle must exist AND be active.
     */
    const vehicle =
      await prisma.vehicle.findFirst({
        where: {
          id: vehicleId,
          active: true,
        },
      });

    if (!vehicle) {
      return {
        error:
          "The selected vehicle does not exist or is inactive.",
        fieldErrors: {
          vehicleId:
            "Select an active vehicle.",
        },
      };
    }

    /*
     * Update assignment.
     */
    const updated =
      await prisma.$transaction(
        async (tx) => {
          const result =
            await tx.delivery.update({
              where: {
                id: deliveryId,
              },
              data: {
                driverId,
                vehicleId,
                status:
                  DeliveryStatus.ASSIGNED,
              },
            });

          await tx.deliveryAuditLog.create({
            data: {
              deliveryId,

              actorName: currentUser.name,
              actorRole: currentUser.role,

              action: "ASSIGNED",

              details:
                `Assigned driver ${driver.name} ` +
                `and vehicle ${vehicle.plateNumber}.`,
            },
          });

          return result;
        }
      );

    revalidatePath(
      "/operations/deliveries"
    );

    revalidatePath(
      `/operations/deliveries/${deliveryId}`
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "[assignDeliveryAction]",
      error
    );

    return {
      error:
        "Could not assign the delivery. Please try again.",
    };
  }
}

/* =========================================================
   MODULE 2 — DISPATCH DELIVERY
   ========================================================= */

export async function dispatchDeliveryAction(
  _prevState: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const deliveryId = requiredString(
    formData,
    "deliveryId"
  );

  if (!deliveryId) {
    return {
      error: "Delivery ID is required.",
    };
  }

  try {
    /*
     * Get complete delivery information.
     */
    const delivery =
      await prisma.delivery.findUnique({
        where: {
          id: deliveryId,
        },

        include: {
          driver: true,
          vehicle: true,
          preTripInspection: true,
        },
      });

    if (!delivery) {
      return {
        error:
          "Delivery not found.",
      };
    }

    /*
     * Dispatch is only allowed from ASSIGNED.
     */
    if (
      delivery.status !==
      DeliveryStatus.ASSIGNED
    ) {
      return {
        error:
          `This delivery cannot be dispatched from its current status: ${delivery.status}.`,
      };
    }

    /*
     * Driver must still exist and remain active.
     */
    if (
      !delivery.driver ||
      !delivery.driver.active
    ) {
      return {
        error:
          "Dispatch blocked: the assigned driver is missing or inactive.",
      };
    }

    /*
     * Vehicle must still exist and remain active.
     */
    if (
      !delivery.vehicle ||
      !delivery.vehicle.active
    ) {
      return {
        error:
          "Dispatch blocked: the assigned vehicle is missing or inactive.",
      };
    }

    /*
     * Vehicle inspection is mandatory.
     */
    if (!delivery.preTripInspection) {
      return {
        error:
          "Dispatch blocked: no pre-trip vehicle inspection has been completed for this delivery.",
      };
    }

    /*
     * Inspection must be READY_TO_DEPART.
     */
    if (
      delivery.preTripInspection
        .inspectionStatus !==
      "READY_TO_DEPART"
    ) {
      return {
        error:
          "Dispatch blocked: the vehicle pre-trip inspection is NOT_READY_TO_DEPART.",
      };
    }

    /*
     * Inspection must match the assigned
     * driver and vehicle.
     *
     * This prevents an inspection belonging to
     * another driver/vehicle being reused.
     */
    if (
      delivery.preTripInspection.driverId &&
      delivery.preTripInspection.driverId !==
        delivery.driverId
    ) {
      return {
        error:
          "Dispatch blocked: the inspection belongs to a different driver.",
      };
    }

    if (
      delivery.preTripInspection.vehicleId &&
      delivery.preTripInspection.vehicleId !==
        delivery.vehicleId
    ) {
      return {
        error:
          "Dispatch blocked: the inspection belongs to a different vehicle.",
      };
    }

    /*
     * Make dispatch atomic.
     *
     * Re-check the status inside the transaction so
     * two Operations users cannot dispatch the same
     * delivery simultaneously.
     */
    const dispatched =
      await prisma.$transaction(
        async (tx) => {
          const current =
            await tx.delivery.findUnique({
              where: {
                id: deliveryId,
              },
              select: {
                status: true,
              },
            });

          if (!current) {
            throw new Error(
              "DELIVERY_NOT_FOUND"
            );
          }

          if (
            current.status !==
            DeliveryStatus.ASSIGNED
          ) {
            throw new Error(
              "INVALID_DISPATCH_STATUS"
            );
          }

          const updated =
            await tx.delivery.update({
              where: {
                id: deliveryId,
              },
              data: {
                status:
                  DeliveryStatus.DISPATCHED,

                /*
                 * If a planned departure time was
                 * not supplied, record the actual
                 * dispatch time.
                 */
                departureAt:
                  delivery.departureAt ??
                  new Date(),
              },
            });

          await tx.deliveryAuditLog.create({
            data: {
              deliveryId,

              actorName: currentUser.name,
              actorRole: currentUser.role,

              action: "DISPATCHED",

              details:
                `Delivery ${delivery.deliveryNoteNumber} ` +
                `dispatched with driver ` +
                `${delivery.driver?.name ?? "Unknown"} ` +
                `and vehicle ` +
                `${delivery.vehicle?.plateNumber ?? "Unknown"}.`,
            },
          });

          return updated;
        }
      );

    revalidatePath(
      "/operations/deliveries"
    );

    revalidatePath(
      `/operations/deliveries/${deliveryId}`
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "[dispatchDeliveryAction]",
      error
    );

    if (
      error instanceof Error &&
      error.message ===
        "INVALID_DISPATCH_STATUS"
    ) {
      return {
        error:
          "Dispatch failed because another operation has already changed this delivery.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "DELIVERY_NOT_FOUND"
    ) {
      return {
        error:
          "Delivery no longer exists.",
      };
    }

    return {
      error:
        "Could not dispatch the delivery. Please try again.",
    };
  }
}

/* =========================================================
   ACTIVE DRIVER / VEHICLE OPTIONS
   ========================================================= */

export async function getDriversAndVehicles() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }

  const [
    drivers,
    vehicles,
  ] = await Promise.all([
    prisma.driver.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.vehicle.findMany({
      where: {
        active: true,
      },
      orderBy: {
        plateNumber: "asc",
      },
    }),
  ]);

  return {
    drivers,
    vehicles,
  };
}

/* =========================================================
   DELIVERY DETAIL
   ========================================================= */

export async function getDeliveryDetail(
  deliveryId: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }

  return prisma.delivery.findUnique({
    where: {
      id: deliveryId,
    },

    include: {
      driver: true,
      vehicle: true,

      preTripInspection: true,

      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

/* =========================================================
   OPERATIONS DELIVERY LIST
   ========================================================= */

export async function getOperationsDeliveries() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }

  return prisma.delivery.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      driver: true,
      vehicle: true,
      preTripInspection: true,
    },
  });
}

/* =========================================================
   DELIVERY NOTE — SEND TO EMAIL
   ========================================================= */

export async function sendDeliveryNoteAction(
  _prevState: SendNoteActionState,
  formData: FormData
): Promise<SendNoteActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const deliveryId = requiredString(formData, "deliveryId");

  if (!deliveryId) {
    return { error: "Delivery ID is required." };
  }

  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      return { error: "Delivery not found." };
    }

    if (getDeliveryStatusGroup(delivery.status) !== "COMPLETED") {
      return {
        error:
          "The delivery note can only be sent once the delivery is completed.",
      };
    }

    if (!delivery.contactEmail) {
      return {
        error: "This delivery has no contact email on file.",
      };
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const noteUrl = `${baseUrl}/operations/deliveries/${delivery.id}/note`;

    await sendAriaMail({
      to: delivery.contactEmail,
      subject: `Delivery Note ${delivery.deliveryNoteNumber} — Alpha Brooks Energy`,
      bodyHtml: `
        <p>Hello,</p>
        <p>The delivery note for <strong>${delivery.deliveryNoteNumber}</strong> is ready to view.</p>
        <p><a href="${noteUrl}">View the delivery note</a></p>
        <p>Alpha Brooks Energy — Operations</p>
      `,
    });

    await prisma.deliveryAuditLog.create({
      data: {
        deliveryId: delivery.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: "DELIVERY_NOTE_SENT",
        details: `Delivery note emailed to ${delivery.contactEmail}.`,
      },
    });

    revalidatePath(`/operations/deliveries/${delivery.id}`);
    revalidatePath(`/operations/deliveries/${delivery.id}/note`);

    return {
      success: `Delivery note sent to ${delivery.contactEmail}.`,
    };
  } catch (error) {
    console.error("[sendDeliveryNoteAction]", error);

    return {
      error: "Could not send the delivery note. Please try again.",
    };
  }
}