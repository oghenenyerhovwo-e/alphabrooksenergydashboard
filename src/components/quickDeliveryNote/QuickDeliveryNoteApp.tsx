"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  QuickDeliveryNoteDocument,
  type QuickDeliveryNoteData,
} from "./QuickDeliveryNoteDocument";
import {
  generateDeliveryNotePdfBase64,
  generateQuickNoteNumber,
} from "@/lib/quickDeliveryNote/generatePdf";
import styles from "./QuickDeliveryNoteApp.module.css";

type Step = "details" | "signatures" | "preview";

interface FormState {
  customer: string;
  deliveryAddress: string;
  product: string;
  quantityDelivered: string;
  unit: string;
  representativeName: string;
  receiverName: string;
  receiverPhone: string;
  deliveredAt: string; // datetime-local value
  senderEmail: string;
  clientEmail: string;
}

function nowForInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

const EMPTY_FORM: FormState = {
  customer: "",
  deliveryAddress: "",
  product: "",
  quantityDelivered: "",
  unit: "liters",
  representativeName: "",
  receiverName: "",
  receiverPhone: "",
  deliveredAt: nowForInput(),
  senderEmail: "",
  clientEmail: "",
};

const STEPS: { key: Step; label: string }[] = [
  { key: "details", label: "Delivery details" },
  { key: "signatures", label: "Signatures" },
  { key: "preview", label: "Preview & send" },
];

export function QuickDeliveryNoteApp() {
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [noteNumber, setNoteNumber] = useState(() => generateQuickNoteNumber());

  const driverSigRef = useRef<SignatureCanvas>(null);
  const receiverSigRef = useRef<SignatureCanvas>(null);
  const [driverSigDataUrl, setDriverSigDataUrl] = useState<string | null>(
    null
  );
  const [receiverSigDataUrl, setReceiverSigDataUrl] = useState<string | null>(
    null
  );

  const printableRef = useRef<HTMLDivElement>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const detailsValid =
    form.customer.trim() &&
    form.deliveryAddress.trim() &&
    form.product.trim() &&
    form.quantityDelivered.trim() &&
    form.unit.trim() &&
    form.representativeName.trim() &&
    form.receiverName.trim() &&
    form.receiverPhone.trim() &&
    form.senderEmail.trim() &&
    form.clientEmail.trim() &&
    noteNumber.trim();

  const signaturesValid = Boolean(driverSigDataUrl && receiverSigDataUrl);

  const documentData: QuickDeliveryNoteData = useMemo(
    () => ({
      noteNumber: noteNumber.trim(),
      customer: form.customer,
      deliveryAddress: form.deliveryAddress,
      product: form.product,
      quantityDelivered: form.quantityDelivered,
      unit: form.unit,
      representativeName: form.representativeName,
      receiverName: form.receiverName,
      receiverPhone: form.receiverPhone,
      deliveredAt: form.deliveredAt ? new Date(form.deliveredAt) : new Date(),
      driverSignatureDataUrl: driverSigDataUrl,
      receiverSignatureDataUrl: receiverSigDataUrl,
    }),
    [form, noteNumber, driverSigDataUrl, receiverSigDataUrl]
  );

  function captureDriverSignature() {
    if (!driverSigRef.current || driverSigRef.current.isEmpty()) {
      setDriverSigDataUrl(null);
      return;
    }
    setDriverSigDataUrl(
      driverSigRef.current.getTrimmedCanvas().toDataURL("image/png")
    );
  }

  function captureReceiverSignature() {
    if (!receiverSigRef.current || receiverSigRef.current.isEmpty()) {
      setReceiverSigDataUrl(null);
      return;
    }
    setReceiverSigDataUrl(
      receiverSigRef.current.getTrimmedCanvas().toDataURL("image/png")
    );
  }

  async function handleSend() {
    if (!printableRef.current) return;
    setSending(true);
    setSendError(null);

    try {
      const pdfBase64 = await generateDeliveryNotePdfBase64(
        printableRef.current
      );

      const res = await fetch("/api/quick-delivery-note/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                noteNumber,
                senderEmail: form.senderEmail,
                clientEmail: form.clientEmail,
                customer: form.customer,
                product: form.product,
                quantity: form.quantityDelivered,
                unit: form.unit,
                deliveredAtLabel: documentData.deliveredAt.toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
                representativeName: form.representativeName,
                receiverName: form.receiverName,
                pdfBase64,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSendError(data?.error ?? "Could not send the delivery note.");
        setSending(false);
        return;
      }

      setSent(true);
    } catch {
      setSendError("Something went wrong while sending. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleLock() {
    await fetch("/api/quick-delivery-note/logout", { method: "POST" });
    window.location.reload();
  }

  if (sent) {
    return (
      <div className={styles.screen}>
        <div className={styles.doneCard}>
          <div className={styles.doneMark}>✓</div>
          <h1 className={styles.doneTitle}>Delivery note sent</h1>
          <p className={styles.doneSubtitle}>
            Note <strong>{noteNumber}</strong> was emailed to{" "}
            <strong>{form.senderEmail}</strong> and{" "}
            <strong>{form.clientEmail}</strong>.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => window.location.reload()}
          >
            Start a new note
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.topbarBrand}>Alpha Brooks Energy</div>
          <div className={styles.topbarTitle}>Quick Delivery Note</div>
        </div>
        <button type="button" className={styles.lockButton} onClick={handleLock}>
          Lock
        </button>
      </header>

      <ol className={styles.progress}>
        {STEPS.map((s, index) => {
          const currentIndex = STEPS.findIndex((x) => x.key === step);
          const state =
            s.key === step
              ? "active"
              : index < currentIndex
              ? "done"
              : "upcoming";
          return (
            <li key={s.key} className={styles.progressItem} data-state={state}>
              <span className={styles.progressDot}>{index + 1}</span>
              <span className={styles.progressLabel}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <main className={styles.content}>
        {step === "details" && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Delivery details</h2>
            <p className={styles.panelSubtitle}>
              Enter the details for this delivery. The note number is filled in
              automatically; change it to match the number on your paper pad if
              you want them to agree.
            </p>

            <div className={styles.grid}>
              <Field label="Delivery note number">
                <input
                  className={styles.input}
                  value={noteNumber}
                  onChange={(e) => setNoteNumber(e.target.value)}
                  placeholder="e.g. 0065"
                />
              </Field>
              <Field label="Customer / retailer">
                <input
                  className={styles.input}
                  value={form.customer}
                  onChange={(e) => updateField("customer", e.target.value)}
                  placeholder="e.g. Delta Fuels Ltd"
                />
              </Field>

              <Field label="Delivery address">
                <input
                  className={styles.input}
                  value={form.deliveryAddress}
                  onChange={(e) =>
                    updateField("deliveryAddress", e.target.value)
                  }
                  placeholder="Site / station address"
                />
              </Field>

              <Field label="Product">
                <input
                  className={styles.input}
                  value={form.product}
                  onChange={(e) => updateField("product", e.target.value)}
                  placeholder="e.g. AGO"
                />
              </Field>

              <div className={styles.fieldRow}>
                <Field label="Quantity delivered">
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    value={form.quantityDelivered}
                    onChange={(e) =>
                      updateField("quantityDelivered", e.target.value)
                    }
                    placeholder="0"
                  />
                </Field>
                <Field label="Unit">
                  <input
                    className={styles.input}
                    value={form.unit}
                    onChange={(e) => updateField("unit", e.target.value)}
                    placeholder="liters"
                  />
                </Field>
              </div>

              <Field label="Date & time of delivery">
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={form.deliveredAt}
                  onChange={(e) => updateField("deliveredAt", e.target.value)}
                />
              </Field>

              <Field label="Alpha Brooks representative">
                <input
                  className={styles.input}
                  value={form.representativeName}
                  onChange={(e) =>
                    updateField("representativeName", e.target.value)
                  }
                  placeholder="Driver / rep name"
                />
              </Field>

              <div className={styles.fieldRow}>
                <Field label="Retailer's representative">
                  <input
                    className={styles.input}
                    value={form.receiverName}
                    onChange={(e) =>
                      updateField("receiverName", e.target.value)
                    }
                    placeholder="Receiver name"
                  />
                </Field>
                <Field label="Receiver phone">
                  <input
                    className={styles.input}
                    value={form.receiverPhone}
                    onChange={(e) =>
                      updateField("receiverPhone", e.target.value)
                    }
                    placeholder="080…"
                  />
                </Field>
              </div>

              <div className={styles.fieldRow}>
                <Field label="Your email (gets a copy)">
                  <input
                    type="email"
                    className={styles.input}
                    value={form.senderEmail}
                    onChange={(e) =>
                      updateField("senderEmail", e.target.value)
                    }
                    placeholder="you@alphabrooksenergy.com"
                  />
                </Field>
                <Field label="Client's email">
                  <input
                    type="email"
                    className={styles.input}
                    value={form.clientEmail}
                    onChange={(e) =>
                      updateField("clientEmail", e.target.value)
                    }
                    placeholder="client@example.com"
                  />
                </Field>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!detailsValid}
                onClick={() => setStep("signatures")}
              >
                Continue to signatures
              </button>
            </div>
          </div>
        )}

        {step === "signatures" && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Signatures</h2>
            <p className={styles.panelSubtitle}>
              Sign directly on the screen with a finger or stylus.
            </p>

            <div className={styles.sigGrid}>
              <div className={styles.sigBlock}>
                <div className={styles.sigBlockTitle}>
                  Alpha Brooks Representative
                </div>
                <div className={styles.sigCanvasWrap}>
                  <SignatureCanvas
                    ref={driverSigRef}
                    penColor="#111"
                    canvasProps={{ className: styles.sigCanvas }}
                    onEnd={captureDriverSignature}
                  />
                </div>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => {
                    driverSigRef.current?.clear();
                    setDriverSigDataUrl(null);
                  }}
                >
                  Clear
                </button>
              </div>

              <div className={styles.sigBlock}>
                <div className={styles.sigBlockTitle}>
                  Retailer&apos;s Representative
                </div>
                <div className={styles.sigCanvasWrap}>
                  <SignatureCanvas
                    ref={receiverSigRef}
                    penColor="#111"
                    canvasProps={{ className: styles.sigCanvas }}
                    onEnd={captureReceiverSignature}
                  />
                </div>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => {
                    receiverSigRef.current?.clear();
                    setReceiverSigDataUrl(null);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setStep("details")}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!signaturesValid}
                onClick={() => setStep("preview")}
              >
                Preview document
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Preview & send</h2>
            <p className={styles.panelSubtitle}>
              Check the document below, then send it as a PDF to both email
              addresses.
            </p>

            <ScaledPreview>
              <QuickDeliveryNoteDocument data={documentData} />
            </ScaledPreview>

            {/* Full-size, off-screen copy that is captured into the PDF. */}
            <div className={styles.captureHost} aria-hidden="true">
              <div ref={printableRef}>
                <QuickDeliveryNoteDocument data={documentData} />
              </div>
            </div>

            {sendError && <div className={styles.sendError}>{sendError}</div>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setStep("signatures")}
                disabled={sending}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? "Sending…" : "Send delivery note"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

const NOTE_WIDTH = 794;
const NOTE_HEIGHT = 1123;

/** Shows the A4 note scaled down to fit the screen (tablet / phone friendly). */
function ScaledPreview({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const available = el.clientWidth;
      setScale(Math.min(1, available / NOTE_WIDTH));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={styles.previewWrap}>
      <div
        style={{
          width: NOTE_WIDTH * scale,
          height: NOTE_HEIGHT * scale,
          margin: "0 auto",
          boxShadow: "0 10px 30px -12px rgba(16,35,28,0.35)",
        }}
      >
        <div
          style={{
            width: NOTE_WIDTH,
            height: NOTE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}