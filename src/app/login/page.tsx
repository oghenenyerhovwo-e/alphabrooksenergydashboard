import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginButton } from "@/components/auth/LoginButton";
import styles from "./page.module.css";

/**
 * Human-readable copy for each `authError` code that /api/auth/callback
 * can redirect back with. Keep this in sync with the reasons used there.
 */
const ERROR_MESSAGES: Record<string, string> = {
  invalid_request: "Something went wrong starting sign-in. Please try again.",
  invalid_state: "Your sign-in attempt expired or was invalid. Please try again.",
  login_failed: "Microsoft sign-in failed. Please try again, or contact IT if this continues.",
  not_authorized:
    "This Microsoft account isn't set up for Alpha Brooks Energy access. Contact an administrator to be added.",
  account_disabled:
    "This account has been disabled. Contact an administrator if you believe this is a mistake.",
};

const DEFAULT_ERROR_MESSAGE = "Sign-in was not completed. Please try again.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  // Already signed in? /login has nothing to offer — send them in.
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const { authError } = await searchParams;
  const errorMessage = authError ? ERROR_MESSAGES[authError] ?? DEFAULT_ERROR_MESSAGE : null;

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.mark}>AB</div>
        <h1 className={styles.title}>Alpha Brooks Energy</h1>
        <p className={styles.sub}>Operations Platform</p>

        {errorMessage && (
          <div className={styles.error} role="alert">
            {errorMessage}
          </div>
        )}

        <LoginButton />

        <p className={styles.footnote}>
          Access is limited to Alpha Brooks Energy staff signing in with their
          company Microsoft account.
        </p>
      </div>
    </main>
  );
}