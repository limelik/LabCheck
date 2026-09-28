import { useEffect, useState } from "react";
import { getMidtermLabPoints, labs, MAX_LABS, MIDTERM_LAB_POINTS } from "../../data/labData";
import { useLabChange } from "../../context/LabChangeContext.jsx";
import MidtermControls from "./MidtermControls.jsx";
import "./TeacherLabManager.css";

export default function TeacherLabManager({ subjectId, groupId }) {
  const [labList, setLabList] = useState(labs[subjectId]?.[groupId] || []);
  useEffect(() => {
    setLabList(labs[subjectId]?.[groupId] || []);
    setEditingLabId(null);
  }, [subjectId, groupId]);
  const [editingLabId, setEditingLabId] = useState(null);
  const { getActiveMidterm, isFirstMidtermLocked, isSecondMidtermLocked } = useLabChange();
  const activeMidterm = getActiveMidterm(subjectId, groupId);
  const readOnly = activeMidterm === 1
    ? isFirstMidtermLocked(subjectId, groupId)
    : isSecondMidtermLocked(subjectId, groupId);
  const visibleLabs = labList.filter((lab) => (lab.midtermNo ?? 1) === activeMidterm);

  const addLab = () => {
    if (readOnly) return;
    if (labList.length >= MAX_LABS) {
      alert("Maximum of 14 labs reached.");
      return;
    }
    const remainingPoints = MIDTERM_LAB_POINTS - getMidtermLabPoints(labList, activeMidterm);
    if (remainingPoints <= 0) {
      alert("This midterm already has 16 lab points.");
      return;
    }

    const newLab = {
      id: "lab" + (Math.max(0, ...labList.map((lab) => Number(lab.id.replace("lab", "")) || 0)) + 1),
      title: "Lab " + (labList.length + 1),
      description: "",
      hasFiles: false,
      difficulty: Math.min(3, remainingPoints),
      midtermNo: activeMidterm,
    };

    const updated = [...labList, newLab];
    setLabList(updated);
    labs[subjectId] ??= {};
    labs[subjectId][groupId] = updated;
  };

  const saveEdit = (id, updatedLab) => {
    if (readOnly) return;
    const maxPoints = getMidtermLabPoints(labList.filter((lab) => lab.id !== id), activeMidterm);
    if (maxPoints + Number(updatedLab.difficulty) > MIDTERM_LAB_POINTS) {
      alert("Labs in one midterm can total at most 16 points.");
      return;
    }
    const updated = labList.map((lab) =>
      lab.id === id ? { ...lab, ...updatedLab } : lab
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

  return (
    <div className="lab-manager">
      <div className="lab-header">
        <h2>Labs for {groupId} — midterm {activeMidterm}</h2>
        <button className="add-lab-btn" onClick={addLab} disabled={readOnly}>
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
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

function LabCard({ lab, isEditing, onEdit, onCancel, onSave, onDelete, readOnly }) {
  const [tempTitle, setTempTitle] = useState(lab.title);
  const [tempDesc, setTempDesc] = useState(lab.description);
  const [tempDifficulty, setTempDifficulty] = useState(lab.difficulty ?? 3);

  return (
    <div className="lab-card">
      {!isEditing && (
        <>
          <div className="lab-info">
            <h3 className="lab-title">
              {lab.title}{" "}
              <span style={{ fontWeight: 500, opacity: 0.75 }}>
                (Difficulty: {lab.difficulty ?? 3})
              </span>
            </h3>

            <p className="lab-desc">{lab.description || "No description."}</p>
            <button className="upload-btn">Upload</button>
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
            Difficulty (1–5):
          </label>
          <select
            className="lab-input"
            value={tempDifficulty}
            onChange={(e) => setTempDifficulty(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
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
