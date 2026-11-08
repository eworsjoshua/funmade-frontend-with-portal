import { useState, useEffect } from "react";
import { api, errorMessages } from "../../api/client";
import { useApi } from "../../lib/useApi";

export default function AttendanceSection() {
  const [subTab, setSubTab] = useState("register"); // 'register' | 'summary'
  const classes = useApi("/api/academics/classes/");

  // Daily Register state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState([]); // array of { student, name, admission_number, status, remarks }
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState([]);

  // Summary state
  const [summaryClassId, setSummaryClassId] = useState("");
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const effectiveClassId = selectedClassId || (classes.data?.[0]?.id ? String(classes.data[0].id) : "");
  const effectiveSummaryClassId = summaryClassId || effectiveClassId;

  const [reloadTick, setReloadTick] = useState(0);

  // Load sheet when effective class or date changes
  useEffect(() => {
    if (!effectiveClassId || !selectedDate) return;
    let cancelled = false;
    api(`/api/attendance/records/register/?school_class=${effectiveClassId}&date=${selectedDate}`)
      .then((data) => {
        if (!cancelled) {
          setEntries(
            (data?.students || []).map((s) => ({
              student: s.student,
              name: s.name,
              admission_number: s.admission_number,
              status: s.status || "present",
              remarks: s.remarks || "",
            }))
          );
          setLoadingSheet(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrors(errorMessages(err));
          setEntries([]);
          setLoadingSheet(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveClassId, selectedDate, reloadTick]);

  function updateStatus(studentId, status) {
    setEntries((prev) =>
      prev.map((e) => (e.student === studentId ? { ...e, status } : e))
    );
  }

  function updateRemarks(studentId, remarks) {
    setEntries((prev) =>
      prev.map((e) => (e.student === studentId ? { ...e, remarks } : e))
    );
  }

  function markAll(status) {
    setEntries((prev) => prev.map((e) => ({ ...e, status })));
  }

  async function handleSaveRegister(e) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      await api("/api/attendance/records/mark/", {
        method: "POST",
        body: {
          school_class: Number(selectedClassId),
          date: selectedDate,
          records: entries.map((e) => ({
            student: e.student,
            status: e.status,
            remarks: e.remarks,
          })),
        },
      });
      setStatusMessage("Attendance register saved successfully.");
      setReloadTick((t) => t + 1);
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      setErrors(errorMessages(err));
    } finally {
      setSaving(false);
    }
  }

  async function loadSummary() {
    if (!effectiveSummaryClassId) return;
    setLoadingSummary(true);
    try {
      const data = await api(`/api/attendance/records/class-summary/?school_class=${effectiveSummaryClassId}`);
      setSummaryData(data);
    } catch (err) {
      alert(errorMessages(err).join("\n"));
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {statusMessage}
        </div>
      )}

      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h4 fw-bold mb-1">Attendance Management</h2>
          <p className="text-muted small mb-0">Record daily attendance registers and inspect class attendance percentages.</p>
        </div>
      </div>

      {/* Subtabs */}
      <div className="nav nav-pills gap-2 border-bottom pb-2">
        <button
          className={`btn btn-sm ${subTab === "register" ? "btn-primary" : "btn-light"}`}
          onClick={() => setSubTab("register")}
        >
          Daily Register
        </button>
        <button
          className={`btn btn-sm ${subTab === "summary" ? "btn-primary" : "btn-light"}`}
          onClick={() => { setSubTab("summary"); loadSummary(); }}
        >
          Class Attendance Summary
        </button>
      </div>

      {errors.length > 0 && (
        <div className="alert alert-danger py-2 small">
          <ul className="mb-0 ps-3">
            {errors.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --- DAILY REGISTER --- */}
      {subTab === "register" && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <label className="form-label small fw-semibold mb-1">Select Class</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  {classes.data?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold mb-1">Select Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  max={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="col-md-4 text-md-end pt-3">
                <div className="btn-group btn-group-sm">
                  <button type="button" className="btn btn-outline-success" onClick={() => markAll("present")}>
                    All Present
                  </button>
                  <button type="button" className="btn btn-outline-danger" onClick={() => markAll("absent")}>
                    All Absent
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {loadingSheet && (
              <div className="text-center py-5 text-muted">
                <span className="spinner-border spinner-border-sm me-2" /> Loading class register…
              </div>
            )}

            {!loadingSheet && entries.length === 0 && (
              <div className="text-center py-5 text-muted">
                No students enrolled in this class for the active session. Enroll students in the Academics tab first.
              </div>
            )}

            {!loadingSheet && entries.length > 0 && (
              <form onSubmit={handleSaveRegister}>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Admission No</th>
                        <th>Student Name</th>
                        <th style={{ width: 260 }}>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.student}>
                          <td>
                            <span className="badge bg-primary-subtle text-primary">
                              {entry.admission_number}
                            </span>
                          </td>
                          <td className="fw-semibold">{entry.name}</td>
                          <td>
                            <div className="btn-group btn-group-sm w-100" role="group">
                              <input
                                type="radio"
                                className="btn-check"
                                id={`present-${entry.student}`}
                                name={`status-${entry.student}`}
                                checked={entry.status === "present"}
                                onChange={() => updateStatus(entry.student, "present")}
                              />
                              <label className="btn btn-outline-success" htmlFor={`present-${entry.student}`}>
                                Present
                              </label>

                              <input
                                type="radio"
                                className="btn-check"
                                id={`late-${entry.student}`}
                                name={`status-${entry.student}`}
                                checked={entry.status === "late"}
                                onChange={() => updateStatus(entry.student, "late")}
                              />
                              <label className="btn btn-outline-warning" htmlFor={`late-${entry.student}`}>
                                Late
                              </label>

                              <input
                                type="radio"
                                className="btn-check"
                                id={`absent-${entry.student}`}
                                name={`status-${entry.student}`}
                                checked={entry.status === "absent"}
                                onChange={() => updateStatus(entry.student, "absent")}
                              />
                              <label className="btn btn-outline-danger" htmlFor={`absent-${entry.student}`}>
                                Absent
                              </label>
                            </div>
                          </td>
                          <td>
                            <input
                              className="form-control form-control-sm"
                              placeholder="e.g. sick with flu"
                              value={entry.remarks}
                              onChange={(e) => updateRemarks(entry.student, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center">
                  <div className="small text-muted">
                    Total Students: <strong>{entries.length}</strong> | Present:{" "}
                    <span className="text-success fw-bold">
                      {entries.filter((e) => e.status === "present").length}
                    </span>{" "}
                    | Late:{" "}
                    <span className="text-warning fw-bold">
                      {entries.filter((e) => e.status === "late").length}
                    </span>{" "}
                    | Absent:{" "}
                    <span className="text-danger fw-bold">
                      {entries.filter((e) => e.status === "absent").length}
                    </span>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold" disabled={saving}>
                    {saving ? "Saving Register…" : "Save Attendance"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- CLASS SUMMARY & PERCENTAGES --- */}
      {subTab === "summary" && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-6">
                <label className="form-label small fw-semibold mb-1">Select Class</label>
                <select
                  className="form-select form-select-sm"
                  value={summaryClassId}
                  onChange={(e) => setSummaryClassId(e.target.value)}
                >
                  {classes.data?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 pt-3 text-md-end">
                <button className="btn btn-sm btn-outline-primary" onClick={loadSummary} disabled={loadingSummary}>
                  {loadingSummary ? "Calculating…" : "Recalculate Percentages"}
                </button>
              </div>
            </div>
          </div>

          <div className="card-body">
            {loadingSummary && (
              <div className="text-center py-5 text-muted">
                <span className="spinner-border spinner-border-sm me-2" /> Calculating attendance percentages…
              </div>
            )}

            {!loadingSummary && summaryData && (
              <div>
                <div className="row g-3 mb-4">
                  <div className="col-sm-3">
                    <div className="p-3 bg-light rounded text-center">
                      <span className="text-muted small d-block">Class Overall</span>
                      <h3 className="fw-bold text-primary mb-0">
                        {summaryData.class_overall?.attendance_percentage ?? 0}%
                      </h3>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-light rounded text-center">
                      <span className="text-muted small d-block">Present Marks</span>
                      <h3 className="fw-bold text-success mb-0">{summaryData.class_overall?.present ?? 0}</h3>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-light rounded text-center">
                      <span className="text-muted small d-block">Late Marks</span>
                      <h3 className="fw-bold text-warning mb-0">{summaryData.class_overall?.late ?? 0}</h3>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-light rounded text-center">
                      <span className="text-muted small d-block">Absent Marks</span>
                      <h3 className="fw-bold text-danger mb-0">{summaryData.class_overall?.absent ?? 0}</h3>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold mb-3">Student Breakdown</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Admission No</th>
                        <th>Student Name</th>
                        <th>Present</th>
                        <th>Late</th>
                        <th>Absent</th>
                        <th>Total Days</th>
                        <th>Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.students?.map((s) => (
                        <tr key={s.student}>
                          <td>
                            <span className="badge bg-primary-subtle text-primary">
                              {s.admission_number}
                            </span>
                          </td>
                          <td className="fw-semibold">{s.name}</td>
                          <td className="text-success">{s.present}</td>
                          <td className="text-warning">{s.late}</td>
                          <td className="text-danger">{s.absent}</td>
                          <td className="text-muted">{s.total}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: 6 }}>
                                <div
                                  className={`progress-bar ${
                                    (s.attendance_percentage ?? 0) >= 75
                                      ? "bg-success"
                                      : (s.attendance_percentage ?? 0) >= 50
                                      ? "bg-warning"
                                      : "bg-danger"
                                  }`}
                                  style={{ width: `${s.attendance_percentage ?? 0}%` }}
                                />
                              </div>
                              <span className="fw-bold small">{s.attendance_percentage ?? 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
