import styles from "./QuickDeliveryNoteDocument.module.css";

export interface QuickDeliveryNoteData {
  noteNumber: string;
  customer: string;
  deliveryAddress: string;
  product: string;
  quantityDelivered: string;
  unit: string;
  representativeName: string;
  receiverName: string;
  receiverPhone: string;
  deliveredAt: Date;
  driverSignatureDataUrl: string | null;
  receiverSignatureDataUrl: string | null;
}

const LOGO_SRC = "/images/mail_logo.png";

/** 26/9/2026 — matches how the paper form is filled in. */
function formatDate(value: Date) {
  return `${value.getDate()}/${value.getMonth() + 1}/${value.getFullYear()}`;
}

/** 6:35 pm */
function formatTime(value: Date) {
  const hours24 = value.getHours();
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const suffix = hours24 >= 12 ? "pm" : "am";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${suffix}`;
}

/** The logo PNG has white padding; this crops it to the visible mark. */
function CroppedLogo({ width, className }: { width: number; className?: string }) {
  // Visible content sits at x 79..168, y 73..174 of the 247x196 source.
  const scale = width / 90;
  return (
    <div
      className={className}
      style={{ width, height: 102 * scale, overflow: "hidden", position: "relative" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt="Alpha Brooks"
        style={{
          position: "absolute",
          width: 247 * scale,
          height: 196 * scale,
          left: -79 * scale,
          top: -73 * scale,
          maxWidth: "none",
        }}
      />
    </div>
  );
}

function Blank({
  children,
  grow = true,
  minWidth,
}: {
  children?: React.ReactNode;
  grow?: boolean;
  minWidth?: number;
}) {
  return (
    <span
      className={styles.blank}
      style={{ flex: grow ? 1 : undefined, minWidth }}
    >
      <span className={styles.ink}>{children}</span>
    </span>
  );
}

/**
 * Recreates the printed Alpha Brooks "Delivery Acknowledgement" pad page
 * (A4, 794 x 1123 px): logo + serial top right, date and addressee lines top
 * left, faint watermark, fill-in-the-blank acknowledgement, two signature
 * blocks and the green contact footer. Filled-in values appear in blue "ink".
 */
export function QuickDeliveryNoteDocument({
  data,
  printableId,
}: {
  data: QuickDeliveryNoteData;
  printableId?: string;
}) {
  const date = formatDate(data.deliveredAt);
  const time = formatTime(data.deliveredAt);

  return (
    <div id={printableId} className={styles.page}>
      <div className={styles.watermark} aria-hidden="true">
        <CroppedLogo width={400} />
      </div>

      <div className={styles.headerLeft}>
        <div className={styles.dateRow}>
          <span className={styles.printed}>Date:</span>
          <Blank>{date}</Blank>
        </div>
        <div className={styles.addressLine}>
          <Blank>{data.customer}</Blank>
        </div>
        <div className={styles.addressLine}>
          <Blank>{data.deliveryAddress}</Blank>
        </div>
        <div className={styles.addressLine}>
          <Blank />
        </div>
      </div>

      <div className={styles.headerRight}>
        <CroppedLogo width={112} />
        <div className={styles.serial}>{data.noteNumber}</div>
      </div>

      <h1 className={styles.title}>DELIVERY ACKNOWLEDGEMENT</h1>

      <div className={styles.body}>
        <div className={styles.row}>
          <span className={styles.printed}>I,</span>
          <Blank>{data.receiverName}</Blank>
          <span className={styles.printed}>
            <b>[Full Name]</b> , with contact number
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.printed}>(+234)</span>
          <Blank>{data.receiverPhone}</Blank>
          <span className={styles.printed}>
            <b>[Contact Number]</b> , hereby acknowledge that
          </span>
        </div>

        <div className={styles.row}>
          <Blank>{data.quantityDelivered}</Blank>
          <span className={styles.printed}>
            <b>[Quantity]</b> {data.unit || "liters"} of {data.product || "AGO"}{" "}
            was received in favor of
          </span>
        </div>

        <div className={styles.row}>
          <Blank>{data.customer}</Blank>
          <span className={styles.printed}>
            <b>[Company&apos;s Name]</b> located at
          </span>
        </div>

        <div className={styles.row}>
          <Blank>{data.deliveryAddress}</Blank>
        </div>

        <div className={styles.row}>
          <span className={styles.printed}>on</span>
          <Blank>{date}</Blank>
          <span className={styles.printed}>
            <b>[Date]</b> , at
          </span>
          <Blank>{time}</Blank>
          <span className={styles.printed}>
            <b>[Time]</b>
          </span>
        </div>
      </div>

      <p className={styles.declaration}>
        My signature on this document is an acknowledgement that I received the
        exact quantity stated on the invoice.
      </p>

      <div className={styles.signatures}>
        <SignatureBlock
          title="Alpha Brooks Representative:"
          name={data.representativeName}
          signature={data.driverSignatureDataUrl}
          date={date}
        />
        <SignatureBlock
          title="Receiver’s Representative:"
          name={data.receiverName}
          signature={data.receiverSignatureDataUrl}
          date={date}
        />
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerItem}>
          <span className={styles.footerIcon}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1l-2.2 2.2Z" />
            </svg>
          </span>
          <span className={styles.footerText}>08033239934</span>
        </div>
        <div className={styles.footerItem}>
          <span className={styles.footerIcon}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">
              <path d="M3 5h3l6 6 6-6h3v14h-3V9.5l-6 6-6-6V19H3V5Z" />
            </svg>
          </span>
          <span className={styles.footerText}>info@alphabrooksenergy.com</span>
        </div>
        <div className={styles.footerItem}>
          <span className={styles.footerIcon}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">
              <path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3L12 3Z" />
            </svg>
          </span>
          <span className={styles.footerText}>
            Elegonza Biro plaza, Adeyemo
            <br />
            Alakija Street, VI, Lagos
          </span>
        </div>
      </footer>
    </div>
  );
}

function SignatureBlock({
  title,
  name,
  signature,
  date,
}: {
  title: string;
  name: string;
  signature: string | null;
  date: string;
}) {
  return (
    <div className={styles.sigBlock}>
      <div className={styles.sigTitle}>{title}</div>

      <div className={styles.sigRow}>
        <span className={styles.sigLabel}>Name:</span>
        <Blank>{name}</Blank>
      </div>

      <div className={styles.sigRow}>
        <span className={styles.sigLabel}>Signature:</span>
        <span className={styles.blank} style={{ flex: 1, position: "relative" }}>
          {signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signature} alt="Signature" className={styles.sigImage} />
          ) : null}
        </span>
      </div>

      <div className={styles.sigRow}>
        <span className={styles.sigLabel}>Date:</span>
        <Blank>{date}</Blank>
      </div>
    </div>
  );
}