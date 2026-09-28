import { useEffect, useRef, useState } from "react";
import {
  getEditableLabTitle,
  getLabNumber,
  getLabTitle,
  getMidtermLabPoints,
  labs,
  MAX_LAB_DIFFICULTY,
  MAX_LABS,
  MIDTERM_LAB_POINTS,
} from "../../data/labData";
import { useLabChange } from "../../context/LabChangeContext.jsx";
import MidtermControls from "./MidtermControls.jsx";
import "./TeacherLabManager.css";

export default function TeacherLabManager({ subjectId, groupId }) {
  const [labList, setLabList] = useState(labs[subjectId]?.[groupId] || []);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDifficulty, setNewDifficulty] = useState(1);
  const [newFiles, setNewFiles] = useState([]);
  const [createError, setCreateError] = useState("");
  const [editingLabId, setEditingLabId] = useState(null);
  useEffect(() => {
    setLabList(labs[subjectId]?.[groupId] || []);
    setEditingLabId(null);
    setIsCreateOpen(false);
  }, [subjectId, groupId]);
  useEffect(() => {
    if (!isCreateOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsCreateOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isCreateOpen]);
  const { getActiveMidterm, isFirstMidtermLocked, isSecondMidtermLocked } = useLabChange();
  const activeMidterm = getActiveMidterm(subjectId, groupId);
  const readOnly = activeMidterm === 1
    ? isFirstMidtermLocked(subjectId, groupId)
    : isSecondMidtermLocked(subjectId, groupId);
  const visibleLabs = labList.filter((lab) => (lab.midtermNo ?? 1) === activeMidterm);
  const remainingPoints = MIDTERM_LAB_POINTS - getMidtermLabPoints(labList, activeMidterm);
  const nextLabNumber = Math.max(0, ...labList.map((lab) => getLabNumber(lab) ?? 0)) + 1;
  const maxNewDifficulty = Math.min(MAX_LAB_DIFFICULTY, remainingPoints);

  const openCreateDialog = () => {
    if (readOnly) return;
    if (labList.length >= MAX_LABS) {
      alert("Maximum of 14 labs reached.");
      return;
    }
    if (remainingPoints <= 0) {
      alert("This midterm already has 16 lab points.");
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewDifficulty(Math.min(3, maxNewDifficulty));
    setNewFiles([]);
    setCreateError("");
    setIsCreateOpen(true);
  };

  const createLab = (event) => {
    event.preventDefault();
    const title = newTitle.trim();
    const difficulty = Number(newDifficulty);
    if (!title) {
      setCreateError("Enter a lab title.");
      return;
    }
    if (readOnly || labList.length >= MAX_LABS || remainingPoints <= 0 ||
        !Number.isInteger(difficulty) || difficulty < 1 ||
        difficulty > MAX_LAB_DIFFICULTY || difficulty > remainingPoints) {
      setCreateError(`Difficulty must be a whole number from 1 to ${maxNewDifficulty}.`);
      return;
    }

    const newLab = {
      id: `lab${nextLabNumber}`,
      number: nextLabNumber,
      title,
      description: newDescription.trim(),
      attachments: newFiles,
      difficulty,
      midtermNo: activeMidterm,
    };

    const updated = [...labList, newLab];
    setLabList(updated);
    labs[subjectId] ??= {};
    labs[subjectId][groupId] = updated;
    setIsCreateOpen(false);
  };

  const saveEdit = (id, updatedLab) => {
    if (readOnly) return;
    if (!updatedLab.title.trim() || !Number.isInteger(updatedLab.difficulty) ||
        updatedLab.difficulty < 1 || updatedLab.difficulty > MAX_LAB_DIFFICULTY) {
      alert("Enter a lab title and a difficulty from 1 to 5.");
      return;
    }
    const maxPoints = getMidtermLabPoints(labList.filter((lab) => lab.id !== id), activeMidterm);
    if (maxPoints + Number(updatedLab.difficulty) > MIDTERM_LAB_POINTS) {
      alert("Labs in one midterm can total at most 16 points.");
      return;
    }
    const updated = labList.map((lab) =>
      lab.id === id ? { ...lab, ...updatedLab, title: updatedLab.title.trim() } : lab
    );
    setLabList(updated);
    labs[subjectId] ??= {};
    labs[subjectId][groupId] = updated;
    setEditingLabId(null);
  };

  const deleteLab = (id) => {
    if (readOnly) return;
    const updated = labList.filter((lab) => lab.id !== id);
    setLabList(updated);
    labs[subjectId] ??= {};
    labs[subjectId][groupId] = updated;
  };

  const addFiles = (id, files) => {
    if (readOnly || !files.length) return;
    const updated = labList.map((lab) => lab.id === id
      ? { ...lab, attachments: [...(lab.attachments ?? []), ...files] }
      : lab);
    setLabList(updated);
    labs[subjectId][groupId] = updated;
  };

  const removeFile = (id, fileIndex) => {
    if (readOnly) return;
    const updated = labList.map((lab) => lab.id === id
      ? { ...lab, attachments: (lab.attachments ?? []).filter((_, index) => index !== fileIndex) }
      : lab);
    setLabList(updated);
    labs[subjectId][groupId] = updated;
  };

  return (
    <div className="lab-manager">
      <div className="lab-header">
        <h2>Labs for {groupId} — midterm {activeMidterm}</h2>
        <button className="add-lab-btn" onClick={openCreateDialog}
          disabled={readOnly || labList.length >= MAX_LABS || remainingPoints <= 0}>
          + Add Lab
        </button>
      </div>
      <MidtermControls subjectId={subjectId} groupId={groupId} />

      <div className="lab-list">
        {visibleLabs.map((lab) => (
          <LabCard
            key={lab.id}
            lab={lab}
            isEditing={editingLabId === lab.id}
            onEdit={() => setEditingLabId(lab.id)}
            onCancel={() => setEditingLabId(null)}
            onSave={saveEdit}
            onDelete={deleteLab}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            maxDifficulty={Math.min(MAX_LAB_DIFFICULTY, MIDTERM_LAB_POINTS - getMidtermLabPoints(
              labList.filter((item) => item.id !== lab.id), activeMidterm
            ))}
            readOnly={readOnly}
          />
        ))}
      </div>

      {isCreateOpen && (
        <div className="lab-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsCreateOpen(false);
        }}>
          <section className="lab-dialog" role="dialog" aria-modal="true" aria-labelledby="create-lab-heading">
            <div className="lab-dialog-heading">
              <div>
                <h2 id="create-lab-heading">Create Lab {nextLabNumber}</h2>
                <p>Midterm {activeMidterm} · {remainingPoints} points remaining</p>
              </div>
              <button type="button" className="lab-dialog-close" aria-label="Close dialog"
                onClick={() => setIsCreateOpen(false)}>×</button>
            </div>
            <form onSubmit={createLab}>
              <label className="lab-field">
                Lab {nextLabNumber} title
                <input className="lab-input" value={newTitle} autoFocus required
                  onChange={(event) => setNewTitle(event.target.value)} />
              </label>
              <label className="lab-field">
                Description
                <textarea className="lab-textarea" value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)} />
              </label>
              <label className="lab-field">
                Difficulty / maximum points (1–{maxNewDifficulty})
                <select className="lab-input"
                  value={newDifficulty} required
                  onChange={(event) => setNewDifficulty(Number(event.target.value))}>
                  {Array.from({ length: maxNewDifficulty }, (_, index) => index + 1).map((points) => (
                    <option key={points} value={points}>{points}</option>
                  ))}
                </select>
              </label>
              <label className="lab-field">
                Attach files
                <input className="lab-input" type="file" multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    setNewFiles((current) => [...current, ...files]);
                    event.target.value = "";
                  }} />
              </label>
              {newFiles.length > 0 && (
                <ul className="lab-file-list">
                  {newFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <span>{file.name}</span>
                      <button type="button" aria-label={`Remove ${file.name}`}
                        onClick={() => setNewFiles((current) => current.filter((_, i) => i !== index))}>×</button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="lab-file-note">Files in this prototype are available until the page reloads.</p>
              {createError && <p className="lab-form-error" role="alert">{createError}</p>}
              <div className="lab-dialog-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                <button type="submit" className="save-btn">Create Lab {nextLabNumber}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function LabCard({ lab, isEditing, onEdit, onCancel, onSave, onDelete, onAddFiles, onRemoveFile, maxDifficulty, readOnly }) {
  const [tempTitle, setTempTitle] = useState(getEditableLabTitle(lab));
  const [tempDesc, setTempDesc] = useState(lab.description);
  const [tempDifficulty, setTempDifficulty] = useState(lab.difficulty ?? 3);
  const fileInputRef = useRef(null);

  return (
    <div className="lab-card">
      {!isEditing && (
        <>
          <div className="lab-info">
            <h3 className="lab-title">
              {getLabTitle(lab)}{" "}
              <span style={{ fontWeight: 500, opacity: 0.75 }}>
                (Difficulty: {lab.difficulty ?? 3})
              </span>
            </h3>

            <p className="lab-desc">{lab.description || "No description."}</p>
            {(lab.attachments ?? []).length > 0 && (
              <ul className="lab-file-list">
                {lab.attachments.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <span>{file.name}</span>
                    {!readOnly && <button type="button" aria-label={`Remove ${file.name}`}
                      onClick={() => onRemoveFile(lab.id, index)}>×</button>}
                  </li>
                ))}
              </ul>
            )}
            {!readOnly && <>
              <input ref={fileInputRef} className="lab-hidden-input" type="file" multiple
                aria-label={`Attach files to ${getLabTitle(lab)}`}
                onChange={(event) => {
                  onAddFiles(lab.id, Array.from(event.target.files ?? []));
                  event.target.value = "";
                }} />
              <button type="button" className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                Attach files
              </button>
            </>}
          </div>

          <div className="lab-actions">
            <button className="icon-btn" onClick={onEdit} disabled={readOnly}>
              ✏️
            </button>
            <button className="icon-btn delete" onClick={() => onDelete(lab.id)} disabled={readOnly}>
              🗑️
            </button>
          </div>
        </>
      )}

      {isEditing && (
        <div className="lab-edit">
          <input
            className="lab-input"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
          />

          <textarea
            className="lab-textarea"
            value={tempDesc}
            onChange={(e) => setTempDesc(e.target.value)}
          />

          <label style={{ display: "block", marginTop: 8 }}>
            Difficulty / maximum points (1–{maxDifficulty}):
          </label>
          <select
            className="lab-input"
            value={tempDifficulty}
            onChange={(e) => setTempDifficulty(Number(e.target.value))}
          >
            {Array.from({ length: maxDifficulty }, (_, index) => index + 1).map((points) => (
              <option key={points} value={points}>{points}</option>
            ))}
          </select>

          <div className="edit-buttons">
            <button
              className="save-btn"
              onClick={() =>
                onSave(lab.id, {
                  title: tempTitle,
                  description: tempDesc,
                  difficulty: tempDifficulty,
                })
              }
            >
              Save
            </button>

            <button className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
