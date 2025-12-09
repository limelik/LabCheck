export const teacher = {
  id: "t1",
  name: "Teacher Example",
  subjects: ["cyber", "sql"], // teacher teaches these subjects
};

export const subjects = {
  cyber: {
    id: "cyber",
    name: "Cybersecurity",
    groups: ["TT319", "TT320"],
  },
  sql: {
    id: "sql",
    name: "SQL Databases",
    groups: ["TT319"],
  },
};

export const groups = {
  TT319: {
    id: "TT319",
    name: "TT319",
    subgroups: ["319-1", "319-2", "319-3"],
  },
  TT320: {
    id: "TT320",
    name: "TT320",
    subgroups: ["320-1", "320-2"],
  },
};

export const subgroups = {
  "319-1": { id: "319-1", name: "Subgroup 1", groupId: "TT319" },
  "319-2": { id: "319-2", name: "Subgroup 2", groupId: "TT319" },
  "319-3": { id: "319-3", name: "Subgroup 3", groupId: "TT319" },

  "320-1": { id: "320-1", name: "Subgroup 1", groupId: "TT320" },
  "320-2": { id: "320-2", name: "Subgroup 2", groupId: "TT320" },
};
