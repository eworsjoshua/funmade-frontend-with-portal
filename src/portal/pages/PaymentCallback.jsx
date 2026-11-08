import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { api, errorMessages } from "../api/client";

export default function PaymentCallback() {
  const { search } = useLocation();
  const [result, setResult] = useState({ loading: true, payment: null, error: "" });
  const reference = new URLSearchParams(search).get("reference")
    || new URLSearchParams(search).get("trxref");

  useEffect(() => {
    let cancelled = false;

    if (!reference) {
      return;
    }

    api(`/api/fees/online/verify/?reference=${encodeURIComponent(reference)}`)
      .then((payment) => {
        if (!cancelled) setResult({ loading: false, payment, error: "" });
      })
      .catch((error) => {
        if (!cancelled) {
          setResult({ loading: false, payment: null, error: errorMessages(error).join(" ") });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reference]);

  const status = result.payment?.status;
  const missingReference = !reference;
  const loading = result.loading && !missingReference;
  const error = missingReference ? "No payment reference was provided." : result.error;
  const heading = loading
    ? "Verifying your payment…"
    : error
      ? "Payment verification failed"
      : status === "success"
        ? "Payment successful"
        : status === "review"
          ? "Payment needs review"
          : status === "failed"
            ? "Payment was not completed"
            : "Payment is still processing";

  return (
    <section className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 560 }}>
      <div className="card-body p-4 text-center">
        {loading && <span className="spinner-border text-primary mb-3" role="status" />}
        <h1 className="h4 fw-bold">{heading}</h1>
        {error && <p className="text-danger">{error}</p>}
        {result.payment?.receipt_number && (
          <p className="mb-2">Receipt: <strong>{result.payment.receipt_number}</strong></p>
        )}
        {result.payment?.status === "review" && (
          <p className="text-muted">We received a payment notification that needs verification by the school.</p>
        )}
        {result.payment && result.payment.status !== "success" && result.payment.status !== "review" && result.payment.status !== "failed" && (
          <p className="text-muted">Please wait a moment, then check your payment history.</p>
        )}
        {!loading && (
          <Link className="btn btn-primary mt-2" to="/student">
            Return to student portal
          </Link>
        )}
      </div>
    </section>
  );
}
