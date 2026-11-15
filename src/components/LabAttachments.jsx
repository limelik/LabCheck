import { useEffect, useState } from "react";
import { api, uploadLabAttachment } from "../api/client.js";
export default function LabAttachments({ labId, editable = false }) {
  const [files, setFiles] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api(`/labs/${labId}/attachments`)
      .then((rows) => {
        if (active) setFiles(rows);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [labId]);
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = await uploadLabAttachment(labId, file);
      setFiles((current) => [...current, body]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  async function remove(file) {
    if (!window.confirm(`Delete attachment ${file.filename}?`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/attachments/${file.id}`, { method: "DELETE" });
      setFiles((current) => current.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Lab attachments">
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <a
              href={`/api/attachments/${file.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {file.filename}
            </a>{" "}
            ({Math.ceil(file.size / 1024)} KB){" · "}
            <a
              download={file.filename}
              href={`/api/attachments/${file.id}/download`}
              aria-label={`Download ${file.filename}`}
            >
              Download
            </a>{" "}
            {editable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(file)}
              >
                Delete attachment
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <label>
          Upload attachment (PDF, TXT, PNG, JPEG)
          <input
            type="file"
            accept=".pdf,.txt,.png,.jpg,.jpeg"
            disabled={busy}
            onChange={upload}
          />
        </label>
      )}
      {busy && <p role="status">Saving attachment…</p>}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
