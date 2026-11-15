import { useCallback, useEffect, useState } from "react";
import LabAttachments from "../../components/LabAttachments.jsx";
import { api, uploadLabAttachment } from "../../api/client.js";
import { useLabChange } from "../../context/LabChangeContext.jsx";
import MidtermControls from "./MidtermControls.jsx";
import "./TeacherLabManager.css";

export default function TeacherLabManager({ offeringId }) {
  const { offeringsById } = useLabChange();
  const [attachments, setAttachments] = useState([]);
  const [attachmentVersion, setAttachmentVersion] = useState(0);
  const [midterms, setMidterms] = useState([]);
  const [activeMidterm, setActiveMidterm] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: 1,
  });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setMidterms(await api(`/offerings/${offeringId}/midterms`));
  }, [offeringId]);
  useEffect(() => {
    let active = true;
    api(`/offerings/${offeringId}/midterms`)
      .then((rows) => {
        if (active) setMidterms(rows);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [offeringId]);
  const current = midterms.find((row) => row.midtermNo === activeMidterm);
  const labs = current?.labs || [];
  const allLabs = midterms.flatMap((row) => row.labs);
  const readOnly = current?.status === "LOCKED";
  const remaining = 16 - (current?.assignedPoints || 0);
  const nextNumber = Math.max(0, ...allLabs.map((lab) => lab.labNumber)) + 1;

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let labId = editing;
      if (labId) {
        await api(`/labs/${labId}`, { method: "PATCH", body: form });
      } else {
        const lab = await api(
          `/offerings/${offeringId}/midterms/${activeMidterm}/labs`,
          {
            method: "POST",
            body: form,
          },
        );
        labId = lab.id;
        // Keep the saved lab on upload failure so retry never creates a duplicate.
        setEditing(labId);
      }
      for (const file of attachments) {
        await uploadLabAttachment(labId, file);
        setAttachments((pending) => pending.filter((item) => item !== file));
        setAttachmentVersion((version) => version + 1);
      }
      setEditing(null);
      setIsCreateOpen(false);
      await refresh();
    } catch (err) {
      setError(err.message);
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this lab and its saved results?")) return;
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/labs/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const lock = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/offerings/${offeringId}/midterms/2/start`, {
        method: "POST",
      });
      await refresh();
      if (activeMidterm === 1) setActiveMidterm(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const startEdit = (lab) => {
    setAttachments([]);
    setEditing(lab.id);
    setForm({
      title: lab.title,
      description: lab.description || "",
      difficulty: lab.difficulty,
    });
    setIsCreateOpen(true);
    setError("");
  };
  const startCreate = () => {
    setAttachments([]);
    setEditing(null);
    setForm({ title: "", description: "", difficulty: Math.min(3, remaining) });
    setIsCreateOpen(true);
    setError("");
  };
  return (
    <div className="lab-manager">
      <div className="lab-header">
        <h2>{offeringsById[offeringId]?.academicGroupCode || "Labs"}</h2>
        <button
          className="add-lab-btn"
          onClick={startCreate}
          disabled={
            busy ||
            readOnly ||
            !current ||
            allLabs.length >= 14 ||
            remaining <= 0
          }
        >
          + Add Lab
        </button>
      </div>
      <MidtermControls
        midterms={midterms}
        activeMidterm={activeMidterm}
        onSelect={setActiveMidterm}
        onLock={lock}
        error={error}
        busy={busy}
      />
      <div className="lab-list">
        {labs.map((lab) => (
          <div className="lab-card" key={lab.id}>
            <div className="lab-info">
              <h3 className="lab-title">
                Lab {lab.labNumber}: {lab.title}{" "}
                <span style={{ opacity: 0.75 }}>({lab.difficulty} points)</span>
              </h3>
              <p className="lab-desc">{lab.description || "No description."}</p>
              <LabAttachments
                key={`${lab.id}-${attachmentVersion}`}
                labId={lab.id}
                editable={!readOnly}
              />
            </div>
            <div className="lab-actions">
              <button
                className="icon-btn"
                disabled={readOnly || busy}
                onClick={() => startEdit(lab)}
                aria-label={`Edit lab ${lab.labNumber}`}
              >
                ✏️
              </button>
              <button
                className="icon-btn delete"
                disabled={readOnly || busy}
                onClick={() => remove(lab.id)}
                aria-label={`Delete lab ${lab.labNumber}`}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
      {isCreateOpen && (
        <div className="lab-dialog-backdrop">
          <section
            className="lab-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-heading"
          >
            <div className="lab-dialog-heading">
              <div>
                <h2 id="lab-heading">
                  {editing ? "Edit Lab" : `Create Lab ${nextNumber}`}
                </h2>
                <p>
                  Midterm {activeMidterm} · {remaining} points remaining
                </p>
              </div>
              <button
                type="button"
                className="lab-dialog-close"
                disabled={busy}
                onClick={() => setIsCreateOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={save}>
              <label className="lab-field">
                Title
                <input
                  className="lab-input"
                  required
                  maxLength="255"
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </label>
              <label className="lab-field">
                Description
                <textarea
                  className="lab-textarea"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <label className="lab-field">
                Maximum points
                <select
                  className="lab-input"
                  value={form.difficulty}
                  onChange={(event) =>
                    setForm({ ...form, difficulty: Number(event.target.value) })
                  }
                >
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((point) => (
                    <option key={point} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
              </label>
              <p className="lab-file-note">
                Each lab is worth 1–5 points. Labs must total 16 points per
                midterm, for example 5 + 5 + 5 + 1.
              </p>
              <label className="lab-field">
                Attachments (PDF, TXT, PNG, JPEG)
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.png,.jpg,.jpeg"
                  disabled={busy}
                  onChange={(event) => {
                    const selectedFiles = Array.from(event.target.files);
                    setAttachments((files) => [...files, ...selectedFiles]);
                    event.target.value = "";
                  }}
                />
              </label>
              <ul className="lab-file-list">
                {attachments.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    {file.name}
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        setAttachments((files) =>
                          files.filter((_, i) => i !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              {error && (
                <p className="lab-form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="lab-dialog-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  disabled={busy}
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={busy}>
                  {busy ? "Saving…" : "Save Lab"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
