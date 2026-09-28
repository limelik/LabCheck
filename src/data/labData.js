export const labs = {
  cyber: {
    TT319: [
      {
        id: "lab1",
        title: "Lab 1: Network Basics",
        description: "Intro to security networks",
        hasFiles: true,
        difficulty: 3,
      },
      {
        id: "lab2",
        title: "Lab 2: Encryption",
        description: "Practice symmetric + asymmetric encryption",
        hasFiles: false,
        difficulty: 5,
      },
      {
        id: "lab3",
        title: "Lab 3: Firewall Rules",
        description: "Create & evaluate firewall rules",
        hasFiles: false,
        difficulty: 4,
      },
    ],

    TT320: [
      {
        id: "lab1",
        title: "Lab 1: Network Basics",
        description: "Intro to security networks",
        hasFiles: false,
        difficulty: 3,
      },
      {
        id: "lab2",
        title: "Lab 2: Encryption",
        description: "Symmetric + asymmetric encryption",
        hasFiles: false,
        difficulty: 3,
      },
    ],
  },

  sql: {
    TT319: [
      {
        id: "lab1",
        title: "Lab 1: SELECT queries",
        description: "",
        hasFiles: false,
        difficulty: 2,
      },
      {
        id: "lab2",
        title: "Lab 2: JOINs",
        description: "",
        hasFiles: false,
        difficulty: 4,
      },
    ],
  },
};

// Maximum allowed labs per group
export const MAX_LABS = 14;
export const MIDTERM_LAB_POINTS = 16;
export const MAX_LAB_DIFFICULTY = 5;

export function getLabNumber(lab) {
  if (Number.isInteger(lab.number)) return lab.number;
  const match = /^lab(\d+)$/.exec(String(lab.id));
  return match ? Number(match[1]) : null;
}

export function getLabTitle(lab) {
  const number = getLabNumber(lab);
  if (number === null) return lab.title;
  const title = getEditableLabTitle(lab);
  return title ? `Lab ${number}: ${title}` : `Lab ${number}`;
}

export function getEditableLabTitle(lab) {
  const number = getLabNumber(lab);
  if (number === null) return lab.title;
  return lab.title.replace(new RegExp(`^Lab\\s+${number}\\s*:\\s*`, "i"), "");
}

export function getMidtermLabPoints(labList, midtermNo) {
  return labList
    .filter((lab) => (lab.midtermNo ?? 1) === midtermNo)
    .reduce((total, lab) => total + Number(lab.difficulty ?? 0), 0);
}
