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
