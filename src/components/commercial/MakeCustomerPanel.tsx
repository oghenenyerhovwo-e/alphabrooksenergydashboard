"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeCustomerAction } from "@/lib/commercial/actions";
import styles from "./MakeCustomerPanel.module.css";
type CustomerMatch = {
  contactId: string;
  contactName: string;
  companyName: string;
  phone: string;
};

export function MakeCustomerPanel({
  leadId,
  companyName,
  phone,
}: {
  leadId: string;
  companyName: string;
  phone: string | null;
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [checked, setChecked] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarNameMatches, setSimilarNameMatches] = useState<
    CustomerMatch[]
  >([]);
  const [exactPhoneMatches, setExactPhoneMatches] = useState<
    CustomerMatch[]
  >([]);
  const router = useRouter();

async function checkZohoCustomers() {
  setIsChecking(true);
  setError(null);

  try {
    const response = await fetch("/api/zoho/customer-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyName,
        phone: phone ?? "",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      console.warn(
        "[MakeCustomerPanel] Existing-customer check failed:",
        data?.message || "Unable to check Zoho Books customers.",
      );

      setSimilarNameMatches([]);
      setExactPhoneMatches([]);
      setChecked(false);
      setCheckFailed(true);
      setError(
        "Existing-customer check could not be completed. You can still continue with customer creation.",
      );

      return;
    }

    setSimilarNameMatches(
      Array.isArray(data.similarNameMatches)
        ? data.similarNameMatches
        : [],
    );

    setExactPhoneMatches(
      Array.isArray(data.exactPhoneMatches)
        ? data.exactPhoneMatches
        : [],
    );

    setChecked(true);
    setCheckFailed(false);
  } catch (err) {
    console.warn(
      "[MakeCustomerPanel] Existing-customer check failed:",
      err,
    );

    setSimilarNameMatches([]);
    setExactPhoneMatches([]);
    setChecked(false);
    setCheckFailed(true);
    setError(
      "Existing-customer check could not be completed. You can still continue with customer creation.",
    );
  } finally {
    setIsChecking(false);
  }
}

    async function makeCustomer() {
    setIsCreating(true);
    setError(null);

    try {
      const result = await makeCustomerAction(leadId);

      if (!result.success) {
        setError(
          result.error ||
            "Unable to create the customer in Zoho Books.",
        );
        return;
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the customer.",
      );
    } finally {
      setIsCreating(false);
    }
  }


  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Customer Conversion</h2>

      <p className={styles.subtitle}>
        Check Zoho Books before registering this Prospect as a Customer.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      {!checked && !checkFailed ? (
        <button
          type="button"
          className={styles.button}
          disabled={isChecking}
          onClick={checkZohoCustomers}
        >
          {isChecking ? "Checking Zoho Books…" : "Check Zoho Books"}
        </button>
      ) : checkFailed ? (
        <>
          <button
            type="button"
            className={styles.button}
            disabled={isCreating}
            onClick={makeCustomer}
          >
            {isCreating ? "Creating Customer…" : "Make Customer"}
          </button>

          <p className={styles.note}>
            The existing-customer check could not be completed. You may
            continue with customer creation.
          </p>
        </>
      ) : (
        <>
          {similarNameMatches.length > 0 && (
            <div className={styles.warning}>
              There{" "}
              {similarNameMatches.length === 1 ? "is" : "are"}{" "}
              {similarNameMatches.length} customer
              {similarNameMatches.length === 1 ? "" : "s"} with a
              similar company name in Zoho Books.
            </div>
          )}

          {exactPhoneMatches.length > 0 && (
            <div className={styles.warning}>
              There{" "}
              {exactPhoneMatches.length === 1 ? "is" : "are"}{" "}
              {exactPhoneMatches.length} customer
              {exactPhoneMatches.length === 1 ? "" : "s"} with the
              same phone number in Zoho Books.
            </div>
          )}

          {similarNameMatches.length === 0 &&
            exactPhoneMatches.length === 0 && (
              <div className={styles.success}>
                No similar company name or matching phone number was
                found in Zoho Books.
              </div>
            )}

          <button
            type="button"
            className={styles.button}
            disabled={isCreating}
            onClick={makeCustomer}
          >
            {isCreating ? "Creating Customer…" : "Make Customer"}
          </button>

          <p className={styles.note}>
            Possible existing customers are shown for awareness only. This
            check does not block customer creation.
          </p>
        </>
      )}
    </section>
  );
}