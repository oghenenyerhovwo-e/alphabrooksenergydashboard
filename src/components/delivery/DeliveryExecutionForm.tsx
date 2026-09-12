"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { upload } from "@vercel/blob/client";
import {
  completeDeliveryAction,
  type DeliveryActionState,
} from "@/lib/delivery/execution-actions";
import styles from "./DeliveryExecutionForm.module.css";

interface DeliveryExecutionFormProps {
  deliveryId: string;
  quantityLoaded: number;
  odometerBefore: number | null;
  driverName: string | null;
}

const initialState: DeliveryActionState = {};

function canvasToPngBlob(
  canvas: HTMLCanvasElement
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(
          new Error(
            "Could not read the signature."
          )
        );
      }
    }, "image/png");
  });
}

export function DeliveryExecutionForm({
  deliveryId,
  quantityLoaded,
  odometerBefore,
  driverName,
}: DeliveryExecutionFormProps) {
  const [state, formAction, pending] =
    useActionState(
      completeDeliveryAction,
      initialState
    );

  const driverSigRef =
    useRef<SignatureCanvas>(null);
  const receiverSigRef =
    useRef<SignatureCanvas>(null);

  const [driverSigEmpty, setDriverSigEmpty] =
    useState(true);
  const [receiverSigEmpty, setReceiverSigEmpty] =
    useState(true);
  const [uploading, setUploading] =
    useState(false);
  const [uploadError, setUploadError] =
    useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = event.currentTarget;

    if (
      !driverSigRef.current ||
      !receiverSigRef.current ||
      driverSigRef.current.isEmpty() ||
      receiverSigRef.current.isEmpty()
    ) {
      setUploadError(
        "Both signatures are required before completing the delivery."
      );
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const [driverBlob, receiverBlob] =
        await Promise.all([
          canvasToPngBlob(
            driverSigRef.current.getTrimmedCanvas()
          ),
          canvasToPngBlob(
            receiverSigRef.current.getTrimmedCanvas()
          ),
        ]);

      const [driverUpload, receiverUpload] =
        await Promise.all([
          upload(
            `signatures/${deliveryId}-driver-${Date.now()}.png`,
            driverBlob,
            {
              access: "public",
              handleUploadUrl:
                "/api/signature-upload",
              contentType: "image/png",
            }
          ),
          upload(
            `signatures/${deliveryId}-receiver-${Date.now()}.png`,
            receiverBlob,
            {
              access: "public",
              handleUploadUrl:
                "/api/signature-upload",
              contentType: "image/png",
            }
          ),
        ]);

      const formData = new FormData(form);
      formData.set(
        "driverSignatureUrl",
        driverUpload.url
      );
      formData.set(
        "receiverSignatureUrl",
        receiverUpload.url
      );

      formAction(formData);
    } catch (error) {
      console.error(
        "[DeliveryExecutionForm] signature upload failed",
        error
      );

      setUploadError(
        "Could not upload signatures. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  const submitDisabled =
    pending ||
    uploading ||
    driverSigEmpty ||
    receiverSigEmpty;

  return (
    <form
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <input
        type="hidden"
        name="deliveryId"
        value={deliveryId}
      />

      <input
        type="hidden"
        name="actorName"
        value="Operations"
      />

      <input
        type="hidden"
        name="actorRole"
        value="OPERATIONS"
      />

      <div className={styles.header}>
        <h2 className={styles.title}>
          Complete Delivery
        </h2>

        <p className={styles.subtitle}>
          Record the quantity delivered, receiver,
          journey details and final odometer.
        </p>
      </div>

      {state.error && (
        <div className={styles.error}>
          {state.error}
        </div>
      )}

      {state.success && (
        <div className={styles.success}>
          {state.success}
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label
            htmlFor="quantityLoaded"
            className={styles.label}
          >
            Loaded quantity
          </label>

          <input
            id="quantityLoaded"
            value={quantityLoaded}
            disabled
            className={styles.inputDisabled}
          />
        </div>

        <div className={styles.field}>
          <label
            htmlFor="quantityDelivered"
            className={styles.label}
          >
            Quantity delivered
          </label>

          <input
            id="quantityDelivered"
            name="quantityDelivered"
            type="number"
            min="0"
            step="any"
            required
            className={styles.input}
          />

          {state.fieldErrors?.quantityDelivered && (
            <p className={styles.fieldError}>
              {
                state.fieldErrors
                  .quantityDelivered
              }
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label
            htmlFor="quantityReturned"
            className={styles.label}
          >
            Quantity returned
          </label>

          <input
            id="quantityReturned"
            name="quantityReturned"
            type="number"
            min="0"
            step="any"
            defaultValue="0"
            className={styles.input}
          />

          {state.fieldErrors?.quantityReturned && (
            <p className={styles.fieldError}>
              {
                state.fieldErrors
                  .quantityReturned
              }
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label
            htmlFor="receiverPhone"
            className={styles.label}
          >
            Receiver phone
          </label>

          <input
            id="receiverPhone"
            name="receiverPhone"
            type="tel"
            className={styles.input}
            placeholder="Optional"
          />
        </div>

        <div className={styles.field}>
          <label
            htmlFor="odometerAfter"
            className={styles.label}
          >
            Ending odometer
          </label>

          <input
            id="odometerAfter"
            name="odometerAfter"
            type="number"
            min={odometerBefore ?? 0}
            step="any"
            className={styles.input}
            placeholder={
              odometerBefore !== null
                ? `Must be ≥ ${odometerBefore}`
                : "Optional"
            }
          />

          {state.fieldErrors?.odometerAfter && (
            <p className={styles.fieldError}>
              {
                state.fieldErrors
                  .odometerAfter
              }
            </p>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label
          htmlFor="routeTaken"
          className={styles.label}
        >
          Route taken
        </label>

        <textarea
          id="routeTaken"
          name="routeTaken"
          rows={3}
          className={styles.textarea}
          placeholder="Describe the route taken"
        />
      </div>

      <div className={styles.panel}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            name="routeDeviation"
            className={styles.checkbox}
          />

          <span className={styles.checkboxLabel}>
            Route deviation occurred
          </span>
        </label>

        <div className={styles.panelBody}>
          <label
            htmlFor="routeDeviationNote"
            className={styles.labelSm}
          >
            Route deviation explanation
          </label>

          <textarea
            id="routeDeviationNote"
            name="routeDeviationNote"
            rows={3}
            className={styles.textarea}
            placeholder="Explain why the route changed"
          />

          {state.fieldErrors
            ?.routeDeviationNote && (
            <p className={styles.fieldError}>
              {
                state.fieldErrors
                  .routeDeviationNote
              }
            </p>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label
          htmlFor="deliveryRemarks"
          className={styles.label}
        >
          Delivery remarks
        </label>

        <textarea
          id="deliveryRemarks"
          name="deliveryRemarks"
          rows={4}
          className={styles.textarea}
          placeholder="Enter delivery remarks or explanation for a partial delivery"
        />

        {state.fieldErrors?.deliveryRemarks && (
          <p className={styles.fieldError}>
            {
              state.fieldErrors
                .deliveryRemarks
            }
          </p>
        )}
      </div>

      <div className={styles.panel}>
        <h3 className={styles.sectionTitle}>
          Signatures
        </h3>

        <p className={styles.sectionHint}>
          Both signatures are required to complete
          this delivery.
        </p>

        <div className={styles.sigGrid}>
          <div>
            <label className={styles.label}>
              Alpha Brooks Representative
            </label>

            <p className={styles.sigName}>
              {driverName ?? "Assigned driver"}
            </p>

            <div className={styles.sigCanvasWrap}>
              <SignatureCanvas
                ref={driverSigRef}
                penColor="black"
                canvasProps={{
                  className: styles.sigCanvas,
                }}
                onEnd={() =>
                  setDriverSigEmpty(
                    driverSigRef.current?.isEmpty() ??
                      true
                  )
                }
              />
            </div>

            <button
              type="button"
              onClick={() => {
                driverSigRef.current?.clear();
                setDriverSigEmpty(true);
              }}
              className={styles.clearButton}
            >
              Clear signature
            </button>
          </div>

          <div>
            <label
              htmlFor="receiverName"
              className={styles.label}
            >
              Retailer&apos;s Representative
            </label>

            <input
              id="receiverName"
              name="receiverName"
              required
              className={styles.input}
              placeholder="Enter receiver's name"
            />

            {state.fieldErrors?.receiverName && (
              <p className={styles.fieldError}>
                {
                  state.fieldErrors
                    .receiverName
                }
              </p>
            )}

            <div className={styles.sigCanvasWrap}>
              <SignatureCanvas
                ref={receiverSigRef}
                penColor="black"
                canvasProps={{
                  className: styles.sigCanvas,
                }}
                onEnd={() =>
                  setReceiverSigEmpty(
                    receiverSigRef.current?.isEmpty() ??
                      true
                  )
                }
              />
            </div>

            <button
              type="button"
              onClick={() => {
                receiverSigRef.current?.clear();
                setReceiverSigEmpty(true);
              }}
              className={styles.clearButton}
            >
              Clear signature
            </button>
          </div>
        </div>

        {uploadError && (
          <p className={styles.fieldError}>
            {uploadError}
          </p>
        )}

        {state.fieldErrors?.driverSignatureUrl && (
          <p className={styles.fieldError}>
            {
              state.fieldErrors
                .driverSignatureUrl
            }
          </p>
        )}

        {state.fieldErrors?.receiverSignatureUrl && (
          <p className={styles.fieldError}>
            {
              state.fieldErrors
                .receiverSignatureUrl
            }
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitDisabled}
        className={styles.submitButton}
      >
        {uploading
          ? "Uploading signatures..."
          : pending
          ? "Saving delivery..."
          : "Complete Delivery"}
      </button>
    </form>
  );
}