export default function AttachmentLinks({ file }) {
  return (
    <span className="attachment-links">
      <span>{file.name}</span>{" "}
      <a href={`/api/labs/attachments/${file.id}/view`} target="_blank" rel="noopener noreferrer">View</a>{" · "}
      <a href={`/api/labs/attachments/${file.id}/download`}>Download</a>
    </span>
  );
}
