"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  sendDailyPriceAction,
  getDailyPriceRecipientsAction,
  type CommercialActionState,
} from "@/lib/commercial/actions";
import styles from "./SendDailyPriceForm.module.css";

const initialState: CommercialActionState = {};

export default function SendDailyPriceForm() {
  const [state, formAction, isPending] = useActionState(
    sendDailyPriceAction,
    initialState
  );

  const [price, setPrice] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [testOnly, setTestOnly] = useState(false);
  const [recipients, setRecipients] = useState<
    { email: string; name: string }[] | null
  >(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientsError, setRecipientsError] = useState<string | null>(
    null
  );
  function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return;
    }

        setShowPreview(true);

    if (!testOnly) {
      setRecipients(null);
      setRecipientsError(null);
      setLoadingRecipients(true);

      getDailyPriceRecipientsAction()
        .then((list) => setRecipients(list))
        .catch((error: unknown) => {
          setRecipientsError(
            error instanceof Error
              ? error.message
              : "Could not load the customer list."
          );
        })
        .finally(() => setLoadingRecipients(false));
    }
  }

  const formattedPrice = Number(price).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  });

  return (
    <section className={styles.card}>
      <div>
        <div className={styles.eyebrow}>CUSTOMER PRICE</div>

        <h2 className={styles.title}>Send Today's Price</h2>

        <p className={styles.subtitle}>
          Enter today's price, preview the customer email, then send it.
        </p>
      </div>

      <form onSubmit={handlePreview} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="daily-price">Today's Price</label>

          <input
            id="daily-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter today's price"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={testOnly}
            onChange={(event) => setTestOnly(event.target.checked)}
          />
          Send a test to my own email only (don&apos;t email customers)
        </label>

        <button
          type="submit"
          className={styles.button}
          disabled={!price || Number(price) <= 0}
        >
          Preview Email
        </button>
      </form>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className={styles.success} role="status">
          {state.message}
        </p>
      )}

      {showPreview && (
        <div className={styles.previewOverlay}>
          <div className={styles.previewModal}>
            <div className={styles.previewHeader}>
              <div>
                <div className={styles.previewEyebrow}>
                  EMAIL PREVIEW
                </div>

                <h3 className={styles.previewTitle}>
                  Today's AGO Price
                </h3>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setShowPreview(false)}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>

            <div className={styles.emailPreview}>
              <div className={styles.emailTop}>
                <div className={styles.emailBrand}>
                  ALPHA BROOKS ENERGY
                </div>

                <div className={styles.emailHeading}>
                  AGO PRICE UPDATE
                </div>
              </div>

              <div className={styles.emailBody}>
                <p className={styles.emailGreeting}>
                  Hello,
                </p>

                <p className={styles.emailIntro}>
                  Here is today's AGO price from Alpha Brooks Energy.
                </p>

                <div className={styles.priceBox}>
                  <div className={styles.priceLabel}>
                    TODAY'S PRICE
                  </div>

                  <div className={styles.priceValue}>
                    ₦{formattedPrice}
                  </div>
                </div>

                <p className={styles.emailCta}>
                  Ready to order? Reply to this email and our team will
                  assist.
                </p>

                <p className={styles.emailTerms}>
                  This price applies to <strong>cash (immediate) payment</strong> only.
                  Orders on credit days are subject to separate terms and
                  conditions — please contact our Sales team to discuss
                  credit pricing.
                </p>
              </div>

              <div className={styles.emailFooter}>
                Sent by your Sales representative
                <br />
                Alpha Brooks Energy
                <br />
                <span className={styles.emailFooterLinks}>
                  alphabrooksenergy.com &nbsp;|&nbsp; social links
                </span>
              </div>
            </div>

                        {!testOnly && (
              <div className={styles.recipientsBox}>
                <div className={styles.recipientsHeading}>
                  {loadingRecipients
                    ? "Loading customer list..."
                    : recipientsError
                      ? "Could not load customer list"
                      : `Will send to ${recipients?.length ?? 0} customer${
                          (recipients?.length ?? 0) === 1 ? "" : "s"
                        }`}
                </div>

                {recipientsError && (
                  <p className={styles.error} role="alert">
                    {recipientsError}
                  </p>
                )}

                {recipients && recipients.length > 0 && (
                  <ul className={styles.recipientsList}>
                    {recipients.map((r) => (
                      <li key={r.email}>
                        {r.name} — {r.email}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {state.error && (
              <p className={styles.error} role="alert">
                {state.error}
              </p>
            )}

            {state.success && (
              <p className={styles.success} role="status">
                {state.message}
              </p>
            )}

            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowPreview(false)}
                disabled={isPending}
              >
                {state.success || state.error ? "Close" : "Back"}
              </button>

              <form action={formAction}>
                <input type="hidden" name="price" value={price} />
                {testOnly && (
                  <input type="hidden" name="testOnly" value="on" />
                )}

                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={
                    isPending ||
                    (!testOnly &&
                      (loadingRecipients ||
                        !!recipientsError ||
                        (recipients?.length ?? 0) === 0))
                  }
                >
                  {isPending
                    ? "Sending..."
                    : testOnly
                      ? "Send Test to Me"
                      : "Send Today's Price"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}