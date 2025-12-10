import { useState } from "react";
import { labs, MAX_LABS } from "../../data/labData";
import "./TeacherLabManager.css";

export default function TeacherLabManager({ subjectId, groupId }) {
  const [labList, setLabList] = useState(labs[subjectId]?.[groupId] || []);
  const [editingLabId, setEditingLabId] = useState(null);

  const addLab = () => {
    if (labList.length >= MAX_LABS) {
      alert("Maximum of 14 labs reached.");
      return;
    }

    const newLab = {
      id: "lab" + (labList.length + 1),
      title: "Lab " + (labList.length + 1),
      description: "",
      hasFiles: false,
    };

    const updated = [...labList, newLab];
    setLabList(updated);
    labs[subjectId][groupId] = updated;
  };

  const saveEdit = (id, updatedLab) => {
    const updated = labList.map((lab) =>
      lab.id === id ? { ...lab, ...updatedLab } : lab
    );
    setLabList(updated);
    labs[subjectId][groupId] = updated;
    setEditingLabId(null);
  };

  const deleteLab = (id) => {
    const updated = labList.filter((lab) => lab.id !== id);
    setLabList(updated);
    labs[subjectId][groupId] = updated;
  };

  return (
    <div className="lab-manager">

      <div className="lab-header">
        <h2>Labs for {groupId}</h2>
        <button className="add-lab-btn" onClick={addLab}>
          + Add Lab
        </button>
      </div>

      <div className="lab-list">
        {labList.map((lab) => (
          <LabCard
            key={lab.id}
            lab={lab}
            isEditing={editingLabId === lab.id}
            onEdit={() => setEditingLabId(lab.id)}
            onCancel={() => setEditingLabId(null)}
            onSave={saveEdit}
            onDelete={deleteLab}
          />
        ))}
      </div>

    </div>
  );
}

function LabCard({ lab, isEditing, onEdit, onCancel, onSave, onDelete }) {
  const [tempTitle, setTempTitle] = useState(lab.title);
  const [tempDesc, setTempDesc] = useState(lab.description);

  return (
    <div className="lab-card">

      {/* Normal view */}
      {!isEditing && (
        <>
          <div className="lab-info">
            <h3 className="lab-title">{lab.title}</h3>
            <p className="lab-desc">{lab.description || "No description."}</p>
            <button className="upload-btn">Upload</button>
          </div>

          {/* Hover actions */}
          <div className="lab-actions">
            <button className="icon-btn" onClick={onEdit}>✏️</button>
            <button className="icon-btn delete" onClick={() => onDelete(lab.id)}>
              🗑️
            </button>
          </div>
        </>
      )}

      {/* Edit mode */}
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

          <div className="edit-buttons">
            <button
              className="save-btn"
              onClick={() =>
                onSave(lab.id, { title: tempTitle, description: tempDesc })
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
