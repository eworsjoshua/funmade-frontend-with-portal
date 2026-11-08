import { useState } from "react";
import { api, errorMessages } from "../../api/client";
import { naira } from "../../lib/format";
import { useApi } from "../../lib/useApi";

export default function StudentFeesTab() {
  const balance = useApi("/api/fees/my/balance/");
  const payments = useApi("/api/fees/my/payments/");

  const [payingFeeId, setPayingFeeId] = useState(null);
  const [payError, setPayError] = useState("");

  const b = balance.data;
  const paymentList = payments.data?.results || (Array.isArray(payments.data) ? payments.data : []);

  async function handlePayOnline(feeId) {
    setPayingFeeId(feeId);
    setPayError("");
    try {
      const res = await api("/api/fees/online/initialize/", {
        method: "POST",
        body: { fee: feeId },
      });
      if (res.authorization_url) {
        // Redirect to Paystack secure checkout
        window.location.assign(res.authorization_url);
      } else {
        setPayError("Could not initialize Paystack payment session.");
      }
    } catch (err) {
      setPayError(errorMessages(err).join(" "));
    } finally {
      setPayingFeeId(null);
    }
  }

  return (
    <div className="space-y-4">
      {payError && (
        <div className="alert alert-danger py-2 small mb-3">
          {payError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="row g-3">
        <div className="col-sm-4">
          <div className="card shadow-sm border-0 h-100 p-3 text-center">
            <span className="text-muted small d-block">Total Fees Assigned</span>
            <h3 className="fw-bold text-dark mb-0">{naira(b?.total_fees ?? 0)}</h3>
            <span className="text-muted small">{b?.session || "Active Session"}</span>
          </div>
        </div>

        <div className="col-sm-4">
          <div className="card shadow-sm border-0 h-100 p-3 text-center">
            <span className="text-muted small d-block">Total Amount Paid</span>
            <h3 className="fw-bold text-success mb-0">{naira(b?.total_paid ?? 0)}</h3>
            <span className="text-muted small">Confirmed receipts</span>
          </div>
        </div>

        <div className="col-sm-4">
          <div className="card shadow-sm border-0 h-100 p-3 text-center">
            <span className="text-muted small d-block">Outstanding Balance</span>
            <h3 className="fw-bold text-danger mb-0">{naira(b?.total_outstanding ?? 0)}</h3>
            <span className="text-muted small">Amount due</span>
          </div>
        </div>
      </div>

      {/* Fee Breakdown with Pay Online Button */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h5 className="fw-bold mb-0">Fee Schedule & Online Payment</h5>
          <p className="text-muted small mb-0">Term fee breakdown and secure online payment via Paystack.</p>
        </div>
        <div className="card-body p-0">
          {balance.loading && (
            <div className="text-center py-5 text-muted">Loading fee schedule…</div>
          )}
          {!balance.loading && (!b?.fees || b.fees.length === 0) && (
            <div className="text-center py-5 text-muted">
              No fee structures assigned to your class for this session.
            </div>
          )}
          {b?.fees && b.fees.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Fee Name</th>
                    <th>Term</th>
                    <th>Amount Due</th>
                    <th>Amount Paid</th>
                    <th>Remaining Balance</th>
                    <th className="text-end">Pay Online</th>
                  </tr>
                </thead>
                <tbody>
                  {b.fees.map((fee) => {
                    const remaining = Math.max(0, (fee.amount || 0) - (fee.paid || 0));
                    const isFullyPaid = remaining <= 0;
                    const feeId = fee.fee ?? fee.id ?? fee.fee_id;
                    return (
                      <tr key={feeId}>
                        <td className="fw-semibold">
                          {fee.name}
                          {fee.description && (
                            <div className="small text-muted">{fee.description}</div>
                          )}
                        </td>
                        <td className="text-capitalize">
                          {fee.term ? `${fee.term} Term` : "Whole session"}
                        </td>
                        <td className="fw-semibold">{naira(fee.amount)}</td>
                        <td className="text-success">{naira(fee.paid)}</td>
                        <td className={`fw-bold ${isFullyPaid ? "text-success" : "text-danger"}`}>
                          {naira(remaining)}
                        </td>
                        <td className="text-end">
                          {isFullyPaid ? (
                            <span className="badge bg-success">Fully Paid</span>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary fw-semibold"
                              disabled={payingFeeId === feeId}
                              onClick={() => handlePayOnline(feeId)}
                            >
                              {payingFeeId === feeId ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" />
                                  Connecting…
                                </>
                              ) : (
                                "💳 Pay with Paystack"
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment History & Receipts */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h5 className="fw-bold mb-0">Payment History & Receipts</h5>
          <p className="text-muted small mb-0">Official receipts for payments made to Funmade Blueberry School.</p>
        </div>
        <div className="card-body p-0">
          {payments.loading && (
            <div className="text-center py-5 text-muted">Loading payment records…</div>
          )}
          {!payments.loading && paymentList.length === 0 && (
            <div className="text-center py-5 text-muted">No payment records found.</div>
          )}
          {paymentList.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Receipt No</th>
                    <th>Fee Type</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Date Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentList.map((p) => (
                    <tr key={p.id}>
                      <td className="fw-semibold font-monospace">
                        <span className="badge bg-primary-subtle text-primary">
                          {p.receipt_number}
                        </span>
                      </td>
                      <td>{p.fee_name || "School Fee"}</td>
                      <td className="fw-bold text-success">{naira(p.amount)}</td>
                      <td className="text-capitalize small">{p.payment_method?.replace("_", " ")}</td>
                      <td className="text-muted small">{p.payment_date || p.created_at?.split("T")[0]}</td>
                      <td>
                        {p.is_void ? (
                          <span className="badge bg-danger">Voided</span>
                        ) : (
                          <span className="badge bg-success">Confirmed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
