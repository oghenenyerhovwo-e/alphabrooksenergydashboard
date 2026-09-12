"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import type { User } from "@/generated/prisma/client";

export interface DeliveryActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
}

function requiredString(
  formData: FormData,
  key: string
): string | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function optionalString(
  formData: FormData,
  key: string
): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

function optionalNumber(
  formData: FormData,
  key: string
): number | undefined {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return undefined;
  }

  return number;
}

function requiredNumber(
  formData: FormData,
  key: string
): number | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function isChecked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Derives the audit-log actor from the authenticated session user —
 * never from client-supplied form data. This closes the identity-
 * spoofing gap flagged in the Phase 1 audit: a caller could
 * previously submit actorName="Admin" / actorRole="Management" and
 * have it written straight into DeliveryAuditLog.
 */
function getActor(user: User) {
  return {
    name: user.name,
    role: user.role,
  };
}

/**
 * Starts a delivery.
 *
 * Allowed transition:
 *
 * DISPATCHED -> IN_TRANSIT
 *
 * This action records the actual departure time and
 * optional starting odometer.
 */
export async function startDeliveryAction(
  _previousState: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const deliveryId = requiredString(formData, "deliveryId");

  if (!deliveryId) {
    return {
      error: "Delivery ID is required.",
    };
  }

  const startingOdometer = optionalNumber(
    formData,
    "odometerBefore"
  );

  if (
    startingOdometer !== undefined &&
    startingOdometer < 0
  ) {
    return {
      fieldErrors: {
        odometerBefore:
          "Starting odometer cannot be negative.",
      },
      error: "Please correct the odometer reading.",
    };
  }

  const actor = getActor(currentUser);

  try {
    const delivery = await prisma.delivery.findUnique({
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
        error: "Delivery was not found.",
      };
    }

    /**
     * Server-side status protection.
     *
     * A delivery can only enter IN_TRANSIT from DISPATCHED.
     */
    if (delivery.status !== "DISPATCHED") {
      return {
        error:
          `This delivery cannot start because its current status is ${delivery.status}.`,
      };
    }

    if (!delivery.driverId || !delivery.driver) {
      return {
        error:
          "A driver must be assigned before the delivery can start.",
      };
    }

    if (!delivery.vehicleId || !delivery.vehicle) {
      return {
        error:
          "A vehicle must be assigned before the delivery can start.",
      };
    }

    if (!delivery.driver.active) {
      return {
        error:
          "The assigned driver is no longer active.",
      };
    }

    if (!delivery.vehicle.active) {
      return {
        error:
          "The assigned vehicle is no longer active.",
      };
    }

    /**
     * A READY_TO_DEPART inspection is mandatory.
     */
    if (!delivery.preTripInspection) {
      return {
        error:
          "A completed pre-trip inspection is required before departure.",
      };
    }

    if (
      delivery.preTripInspection.inspectionStatus !==
      "READY_TO_DEPART"
    ) {
      return {
        error:
          "The vehicle is not cleared for departure.",
      };
    }

    /**
     * Prevent a lower starting odometer than the previous
     * recorded vehicle odometer when one exists.
     */
    if (
      startingOdometer !== undefined &&
      delivery.odometerAfter !== null &&
      delivery.odometerAfter !== undefined &&
      startingOdometer < delivery.odometerAfter
    ) {
      return {
        fieldErrors: {
          odometerBefore:
            `Starting odometer cannot be lower than the previous recorded odometer (${delivery.odometerAfter}).`,
        },
        error: "Invalid starting odometer.",
      };
    }

    const now = new Date();

    /**
     * Conditional update provides another layer of protection
     * against two requests starting the same delivery.
     */
    const updated = await prisma.$transaction(
      async (tx) => {
        const result = await tx.delivery.updateMany({
          where: {
            id: deliveryId,
            status: "DISPATCHED",
          },
          data: {
            status: "IN_TRANSIT",
            departureAt: now,
            odometerBefore: startingOdometer,
          },
        });

        if (result.count !== 1) {
          throw new Error(
            "DELIVERY_STATUS_CHANGED"
          );
        }

        const updatedDelivery =
          await tx.delivery.findUnique({
            where: {
              id: deliveryId,
            },
          });

        if (!updatedDelivery) {
          throw new Error(
            "DELIVERY_NOT_FOUND_AFTER_UPDATE"
          );
        }

        await tx.deliveryAuditLog.create({
          data: {
            deliveryId,
            actorName: actor.name,
            actorRole: actor.role,
            action: "IN_TRANSIT",
            details:
              `Delivery departed and is now in transit.` +
              ` Departure: ${now.toISOString()}.` +
              (
                startingOdometer !== undefined
                  ? ` Starting odometer: ${startingOdometer}.`
                  : ""
              ),
          },
        });

        return updatedDelivery;
      }
    );

    revalidatePath("/operations/deliveries");
    revalidatePath(
      `/operations/deliveries/${updated.id}`
    );
    revalidatePath(
      `/operations/deliveries/${updated.id}/execution`
    );
    revalidatePath(
      "/operations/deliveries/in-transit"
    );

    return {
      success:
        "Delivery started successfully and is now in transit.",
    };
  } catch (error) {
    console.error(
      "[startDeliveryAction]",
      error
    );

    if (
      error instanceof Error &&
      error.message === "DELIVERY_STATUS_CHANGED"
    ) {
      return {
        error:
          "This delivery has already been started or its status changed.",
      };
    }

    return {
      error:
        "Could not start the delivery. Please try again.",
    };
  }
}

/**
 * Completes a delivery.
 *
 * IN_TRANSIT ->
 *   DELIVERED
 *   PARTIALLY_DELIVERED
 */
export async function completeDeliveryAction(
  _previousState: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const fieldErrors: Record<string, string> = {};

  const deliveryId = requiredString(
    formData,
    "deliveryId"
  );

  if (!deliveryId) {
    return {
      error: "Delivery ID is required.",
    };
  }

  const quantityDelivered = requiredNumber(
    formData,
    "quantityDelivered"
  );

  if (
    quantityDelivered === null ||
    quantityDelivered < 0
  ) {
    fieldErrors.quantityDelivered =
      "Enter a valid delivered quantity.";
  }

  const quantityReturned = optionalNumber(
    formData,
    "quantityReturned"
  ) ?? 0;

  if (quantityReturned < 0) {
    fieldErrors.quantityReturned =
      "Returned quantity cannot be negative.";
  }

  const receiverName = requiredString(
    formData,
    "receiverName"
  );

  if (!receiverName) {
    fieldErrors.receiverName =
      "Receiver name is required.";
  }

  const receiverPhone = optionalString(
    formData,
    "receiverPhone"
  );

  const deliveryRemarks = optionalString(
    formData,
    "deliveryRemarks"
  );

  const routeTaken = optionalString(
    formData,
    "routeTaken"
  );

  const routeDeviation = isChecked(
    formData,
    "routeDeviation"
  );

  const routeDeviationNote = optionalString(
    formData,
    "routeDeviationNote"
  );

  if (
    routeDeviation &&
    !routeDeviationNote
  ) {
    fieldErrors.routeDeviationNote =
      "Explain the route deviation.";
  }

  const odometerAfter = optionalNumber(
    formData,
    "odometerAfter"
  );

  if (
    odometerAfter !== undefined &&
    odometerAfter < 0
  ) {
    fieldErrors.odometerAfter =
      "Ending odometer cannot be negative.";
  }

  /*
   * Signatures are validated here too, even though the
   * client already blocks submission until both pads
   * have a stroke and already uploaded them — never
   * trust the client fully.
   */
  const driverSignatureUrl = requiredString(
    formData,
    "driverSignatureUrl"
  );

  if (
    !driverSignatureUrl ||
    !isValidUrl(driverSignatureUrl)
  ) {
    fieldErrors.driverSignatureUrl =
      "Alpha Brooks representative signature is required.";
  }

  const receiverSignatureUrl = requiredString(
    formData,
    "receiverSignatureUrl"
  );

  if (
    !receiverSignatureUrl ||
    !isValidUrl(receiverSignatureUrl)
  ) {
    fieldErrors.receiverSignatureUrl =
      "Retailer's representative signature is required.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const actor = getActor(currentUser);

  try {
    const delivery = await prisma.delivery.findUnique({
      where: {
        id: deliveryId,
      },
    });

    if (!delivery) {
      return {
        error: "Delivery was not found.",
      };
    }

    /**
     * Completion can only happen from IN_TRANSIT.
     */
    if (delivery.status !== "IN_TRANSIT") {
      return {
        error:
          `This delivery cannot be completed because its current status is ${delivery.status}.`,
      };
    }

    if (delivery.quantityLoaded === null) {
      return {
        error:
          "The delivery does not have a loaded quantity.",
      };
    }

    if (quantityDelivered === null) {
      return {
        error:
          "Delivered quantity is required.",
      };
    }

    /**
     * Both signatures must be present. This is the second
     * gate on top of the pre-trip inspection gate that
     * already blocks a driver from reaching this form in
     * the first place: if either signature is missing, no
     * completion fields are written at all.
     */
    if (
      !driverSignatureUrl ||
      !receiverSignatureUrl
    ) {
      return {
        error:
          "Both signatures are required to complete this delivery.",
      };
    }

    /**
     * Delivered + returned can never exceed what was loaded.
     */
    const totalAccountedFor =
      quantityDelivered + quantityReturned;

    if (
      totalAccountedFor >
      delivery.quantityLoaded
    ) {
      return {
        error:
          `Delivered quantity plus returned quantity (${totalAccountedFor}) cannot exceed loaded quantity (${delivery.quantityLoaded}).`,
        fieldErrors: {
          quantityDelivered:
            "Check delivered quantity.",
          quantityReturned:
            "Check returned quantity.",
        },
      };
    }

    /**
     * If less than the loaded quantity was delivered,
     * the delivery is considered partial.
     *
     * This also covers cases where some quantity was returned.
     */
    const finalStatus =
      quantityDelivered === delivery.quantityLoaded &&
      quantityReturned === 0
        ? "DELIVERED"
        : "PARTIALLY_DELIVERED";

    /**
     * If an ending odometer exists, it cannot be lower
     * than the starting odometer.
     */
    if (
      odometerAfter !== undefined &&
      delivery.odometerBefore !== null &&
      delivery.odometerBefore !== undefined &&
      odometerAfter < delivery.odometerBefore
    ) {
      return {
        fieldErrors: {
          odometerAfter:
            `Ending odometer cannot be lower than starting odometer (${delivery.odometerBefore}).`,
        },
        error: "Invalid ending odometer.",
      };
    }

    const arrivalAt = new Date();

    const distanceTravelled =
      odometerAfter !== undefined &&
      delivery.odometerBefore !== null &&
      delivery.odometerBefore !== undefined
        ? odometerAfter -
          delivery.odometerBefore
        : undefined;

    /**
     * A partial delivery should have an explanation.
     */
    if (
      finalStatus === "PARTIALLY_DELIVERED" &&
      !deliveryRemarks
    ) {
      return {
        fieldErrors: {
          deliveryRemarks:
            "Please explain why the full loaded quantity was not delivered.",
        },
        error:
          "A reason is required for a partial delivery.",
      };
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        const result =
          await tx.delivery.updateMany({
            where: {
              id: deliveryId,
              status: "IN_TRANSIT",
            },
            data: {
              status: finalStatus,
              quantityDelivered,
              quantityReturned,
              receiverName,
              receiverPhone,
              deliveryRemarks,
              arrivalAt,
              odometerAfter,
              distanceTravelled,
              routeTaken,
              routeDeviation,
              routeDeviationNote,
              driverSignatureUrl,
              receiverSignatureUrl,
            },
          });

        if (result.count !== 1) {
          throw new Error(
            "DELIVERY_STATUS_CHANGED"
          );
        }

        const updatedDelivery =
          await tx.delivery.findUnique({
            where: {
              id: deliveryId,
            },
          });

        if (!updatedDelivery) {
          throw new Error(
            "DELIVERY_NOT_FOUND_AFTER_UPDATE"
          );
        }

        const action =
          finalStatus === "DELIVERED"
            ? "DELIVERED"
            : "PARTIALLY_DELIVERED";

        const details =
          finalStatus === "DELIVERED"
            ? `Delivery completed successfully. Delivered: ${quantityDelivered}. Returned: ${quantityReturned}. Receiver: ${receiverName}.`
            : `Partial delivery completed. Loaded: ${delivery.quantityLoaded}. Delivered: ${quantityDelivered}. Returned: ${quantityReturned}. Receiver: ${receiverName}. Reason: ${deliveryRemarks}.`;

        await tx.deliveryAuditLog.create({
          data: {
            deliveryId,
            actorName: actor.name,
            actorRole: actor.role,
            action,
            details,
          },
        });

        return updatedDelivery;
      }
    );

    revalidatePath("/operations/deliveries");
    revalidatePath(
      `/operations/deliveries/${updated.id}`
    );
    revalidatePath(
      `/operations/deliveries/${updated.id}/execution`
    );
    revalidatePath(
      "/operations/deliveries/in-transit"
    );

    return {
      success:
        finalStatus === "DELIVERED"
          ? "Delivery completed successfully."
          : "Partial delivery recorded successfully.",
    };
  } catch (error) {
    console.error(
      "[completeDeliveryAction]",
      error
    );

    if (
      error instanceof Error &&
      error.message === "DELIVERY_STATUS_CHANGED"
    ) {
      return {
        error:
          "This delivery has already been completed or its status changed.",
      };
    }

    return {
      error:
        "Could not complete the delivery. Please try again.",
    };
  }
}

/**
 * Marks an in-transit delivery as REJECTED.
 *
 * IN_TRANSIT -> REJECTED
 */
export async function rejectDeliveryAction(
  _previousState: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  return markDeliveryIssueAction(
    "REJECTED",
    formData
  );
}

/**
 * Marks an in-transit delivery as FAILED.
 *
 * IN_TRANSIT -> FAILED
 */
export async function failDeliveryAction(
  _previousState: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  return markDeliveryIssueAction(
    "FAILED",
    formData
  );
}

async function markDeliveryIssueAction(
  status: "REJECTED" | "FAILED",
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

  const reason = requiredString(
    formData,
    "issueDescription"
  );

  if (!reason) {
    return {
      fieldErrors: {
        issueDescription:
          "A reason is required.",
      },
      error:
        `A reason is required to mark the delivery ${status.toLowerCase()}.`,
    };
  }

  const actor = getActor(currentUser);

  try {
    const delivery = await prisma.delivery.findUnique({
      where: {
        id: deliveryId,
      },
    });

    if (!delivery) {
      return {
        error: "Delivery was not found.",
      };
    }

    /**
     * Rejected/failed deliveries can only be recorded
     * while the delivery is IN_TRANSIT.
     */
    if (delivery.status !== "IN_TRANSIT") {
      return {
        error:
          `This delivery cannot be marked ${status} because its current status is ${delivery.status}.`,
      };
    }

    const now = new Date();

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const result =
            await tx.delivery.updateMany({
              where: {
                id: deliveryId,
                status: "IN_TRANSIT",
              },
              data: {
                status,
                arrivalAt: now,
                hasIssue: true,
                issueType: status,
                issueDescription: reason,
                needsAttention: true,
              },
            });

          if (result.count !== 1) {
            throw new Error(
              "DELIVERY_STATUS_CHANGED"
            );
          }

          const updatedDelivery =
            await tx.delivery.findUnique({
              where: {
                id: deliveryId,
              },
            });

          if (!updatedDelivery) {
            throw new Error(
              "DELIVERY_NOT_FOUND_AFTER_UPDATE"
            );
          }

          await tx.deliveryAuditLog.create({
            data: {
              deliveryId,
              actorName: actor.name,
              actorRole: actor.role,
              action: status,
              details:
                `${status === "REJECTED" ? "Delivery rejected" : "Delivery failed"}. ` +
                `Reason: ${reason}`,
            },
          });

          return updatedDelivery;
        }
      );

    revalidatePath("/operations/deliveries");
    revalidatePath(
      `/operations/deliveries/${updated.id}`
    );
    revalidatePath(
      `/operations/deliveries/${updated.id}/execution`
    );
    revalidatePath(
      "/operations/deliveries/in-transit"
    );

    return {
      success:
        status === "REJECTED"
          ? "Delivery marked as rejected."
          : "Delivery marked as failed.",
    };
  } catch (error) {
    console.error(
      `[markDeliveryIssueAction:${status}]`,
      error
    );

    if (
      error instanceof Error &&
      error.message === "DELIVERY_STATUS_CHANGED"
    ) {
      return {
        error:
          "This delivery has already been processed or its status changed.",
      };
    }

    return {
      error:
        `Could not mark the delivery as ${status.toLowerCase()}.`,
    };
  }
}

/**
 * Fetch a delivery for the execution screen.
 */
export async function getDeliveryForExecution(
  deliveryId: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }

  if (!deliveryId) {
    return null;
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

/**
 * Fetch active deliveries currently in transit.
 */
export async function getInTransitDeliveries() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: you must be signed in to view this data.");
  }

  return prisma.delivery.findMany({
    where: {
      status: "IN_TRANSIT",
    },
    include: {
      driver: true,
      vehicle: true,
    },
    orderBy: {
      departureAt: "asc",
    },
  });
}

/**
 * Submits the vehicle pre-trip inspection checklist.
 *
 * Allowed while delivery status is ASSIGNED.
 * Creates or updates the single VehiclePreTripInspection
 * record tied to this delivery (deliveryId is unique on it).
 */
export async function submitPreTripInspectionAction(
  _previousState: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to do this." };
  }

  const deliveryId = requiredString(formData, "deliveryId");

  if (!deliveryId) {
    return { error: "Delivery ID is required." };
  }

  const driverName = requiredString(formData, "driverName");
  const vehicleNumber = requiredString(formData, "vehicleNumber");
  const inspectionDateRaw = requiredString(formData, "inspectionDate");
  const odometerReading = requiredNumber(formData, "odometerReading");

  const fieldErrors: Record<string, string> = {};

  if (!driverName) fieldErrors.driverName = "Driver name is required.";
  if (!vehicleNumber) fieldErrors.vehicleNumber = "Vehicle number is required.";
  if (!inspectionDateRaw) fieldErrors.inspectionDate = "Inspection date/time is required.";
  if (odometerReading === null) fieldErrors.odometerReading = "Odometer reading is required.";

  const inspectionDate = inspectionDateRaw ? new Date(inspectionDateRaw) : null;

  if (inspectionDate && Number.isNaN(inspectionDate.getTime())) {
    fieldErrors.inspectionDate = "Enter a valid date and time.";
  }

  const checklist = {
    tyresSatisfactory: isChecked(formData, "tyresSatisfactory"),
    brakesSatisfactory: isChecked(formData, "brakesSatisfactory"),
    lightsSatisfactory: isChecked(formData, "lightsSatisfactory"),
    hornSatisfactory: isChecked(formData, "hornSatisfactory"),
    mirrorsSatisfactory: isChecked(formData, "mirrorsSatisfactory"),
    vehicleBodySatisfactory: isChecked(formData, "vehicleBodySatisfactory"),
    fireExtinguisherSatisfactory: isChecked(formData, "fireExtinguisherSatisfactory"),
    firstAidKitSatisfactory: isChecked(formData, "firstAidKitSatisfactory"),
    emergencyEquipmentSatisfactory: isChecked(formData, "emergencyEquipmentSatisfactory"),
    vehicleDocumentsSatisfactory: isChecked(formData, "vehicleDocumentsSatisfactory"),
  };

  const hasDefect = isChecked(formData, "hasDefect");
  const defectDescription = optionalString(formData, "defectDescription");
  const defectPhotoUrl = optionalString(formData, "defectPhotoUrl");

  if (hasDefect && !defectDescription) {
    fieldErrors.defectDescription = "Describe the defect.";
  }

  if (defectPhotoUrl && !isValidUrl(defectPhotoUrl)) {
    fieldErrors.defectPhotoUrl = "Enter a valid URL.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      error: "Please correct the highlighted fields.",
    };
  }

  const allSatisfactory = Object.values(checklist).every(Boolean);
  const inspectionStatus =
    allSatisfactory && !hasDefect ? "READY_TO_DEPART" : "NOT_READY_TO_DEPART";

  const actor = getActor(currentUser);

  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { driver: true, vehicle: true },
    });

    if (!delivery) {
      return { error: "Delivery was not found." };
    }

    /**
     * Server-side status protection: the checklist can only be
     * filed while the delivery is ASSIGNED, before dispatch.
     */
    if (delivery.status !== "ASSIGNED") {
      return {
        error: `The pre-trip inspection cannot be filed because this delivery's status is ${delivery.status}.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.vehiclePreTripInspection.upsert({
        where: { deliveryId },
        create: {
          deliveryId,
          driverId: delivery.driverId,
          vehicleId: delivery.vehicleId,
          driverName: driverName!,
          vehicleNumber: vehicleNumber!,
          inspectionDate: inspectionDate!,
          odometerReading: odometerReading!,
          ...checklist,
          hasDefect,
          defectDescription: hasDefect ? defectDescription : undefined,
          defectPhotoUrl,
          inspectionStatus,
        },
        update: {
          driverId: delivery.driverId,
          vehicleId: delivery.vehicleId,
          driverName: driverName!,
          vehicleNumber: vehicleNumber!,
          inspectionDate: inspectionDate!,
          odometerReading: odometerReading!,
          ...checklist,
          hasDefect,
          defectDescription: hasDefect ? defectDescription : null,
          defectPhotoUrl: defectPhotoUrl ?? null,
          inspectionStatus,
        },
      });

      await tx.deliveryAuditLog.create({
        data: {
          deliveryId,
          actorName: actor.name,
          actorRole: actor.role,
          action: "PRE_TRIP_INSPECTION",
          details: `Pre-trip inspection filed. Result: ${inspectionStatus}.${
            hasDefect ? ` Defect: ${defectDescription}.` : ""
          }`,
        },
      });
    });

    revalidatePath(`/operations/deliveries/${deliveryId}`);
    revalidatePath(`/operations/deliveries/${deliveryId}/execution`);
    revalidatePath("/operations/deliveries");

    return {
      success:
        inspectionStatus === "READY_TO_DEPART"
          ? "Inspection filed. Vehicle is cleared for departure."
          : "Inspection filed. Vehicle is NOT cleared — dispatch will remain blocked.",
    };
  } catch (error) {
    console.error("[submitPreTripInspectionAction]", error);
    return { error: "Could not save the inspection. Please try again." };
  }
}