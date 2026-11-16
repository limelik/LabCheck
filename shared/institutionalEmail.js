export function classifyInstitutionalEmail(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@polytechnic\.am$/.test(normalized)) return null;
  const local = normalized.split("@")[0];
  const group = local.match(/\.([a-z]+\d+)(?:-\d+)?$/i)?.[1];
  return { role: group ? "STUDENT" : "TEACHER", groupCode: group?.toUpperCase() ?? null };
}
