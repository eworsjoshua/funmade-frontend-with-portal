import { useState, useEffect, useMemo } from "react";
import { api, errorMessages } from "../../api/client";
import { useApi } from "../../lib/useApi";

export default function TeacherAttendanceTab() {
  const myClasses = useApi("/api/academics/my-classes/");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState([]);

  // Extract unique classes assigned to teacher
  const uniqueClasses = useMemo(() => {
    const list = [];
    const seenClassIds = new Set();
    (myClasses.data || []).forEach((item) => {
      if (!seenClassIds.has(item.school_class)) {
        seenClassIds.add(item.school_class);
        list.push({ id: item.school_class, name: item.class_name });
      }
    });
    return list;
  }, [myClasses.data]);

  const effectiveClassId = selectedClassId || (uniqueClasses[0]?.id ? String(uniqueClasses[0].id) : "");
  const [reloadTick, setReloadTick] = useState(0);

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
          school_class: Number(effectiveClassId),
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

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {statusMessage}
        </div>
      )}

      {errors.length > 0 && (
        <div className="alert alert-danger py-2 small">
          <ul className="mb-0 ps-3">
            {errors.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <label className="form-label small fw-semibold mb-1">My Assigned Class</label>
              <select
                className="form-select form-select-sm"
                value={effectiveClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {uniqueClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold mb-1">Date</label>
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
              No students enrolled in this class for the active session.
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
                              id={`t-present-${entry.student}`}
                              name={`t-status-${entry.student}`}
                              checked={entry.status === "present"}
                              onChange={() => updateStatus(entry.student, "present")}
                            />
                            <label className="btn btn-outline-success" htmlFor={`t-present-${entry.student}`}>
                              Present
                            </label>

                            <input
                              type="radio"
                              className="btn-check"
                              id={`t-late-${entry.student}`}
                              name={`t-status-${entry.student}`}
                              checked={entry.status === "late"}
                              onChange={() => updateStatus(entry.student, "late")}
                            />
                            <label className="btn btn-outline-warning" htmlFor={`t-late-${entry.student}`}>
                              Late
                            </label>

                            <input
                              type="radio"
                              className="btn-check"
                              id={`t-absent-${entry.student}`}
                              name={`t-status-${entry.student}`}
                              checked={entry.status === "absent"}
                              onChange={() => updateStatus(entry.student, "absent")}
                            />
                            <label className="btn btn-outline-danger" htmlFor={`t-absent-${entry.student}`}>
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
                  {saving ? "Saving…" : "Save Attendance"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
