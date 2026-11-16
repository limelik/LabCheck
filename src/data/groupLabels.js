export function labGroupLabel(academicCode, labCode) {
  if (!labCode) return academicCode ?? "";
  if (labCode.startsWith(academicCode)) return labCode;
  const number = academicCode?.match(/\d+$/)?.[0];
  return number && labCode.startsWith(`${number}-`)
    ? `${academicCode}${labCode.slice(number.length)}`
    : labCode;
}
