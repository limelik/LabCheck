export const studentName = "Milena Simonyan";

export const subjects = [
  {
    id: "cyber",
    name: "Cybersecurity",
    labs: [
      {
        id: "lab1",
        title: "Lab 1: Network Security",
        description:
          "Introduction to network security concepts and basic firewall configuration.",
        hasFiles: true,
      },
      {
        id: "lab2",
        title: "Lab 2: Encryption Methods",
        description:
          "Explore different encryption algorithms and their applications.",
        hasFiles: true,
      },
      {
        id: "lab3",
        title: "Lab 3: Firewall Configuration",
        description:
          "Advanced firewall rules and network segmentation.",
        hasFiles: false,
      },
    ],
  },
  {
    id: "sql",
    name: "SQL",
    labs: [
      { id: "lab1", title: "Lab 1: SELECT Basics", description: "", hasFiles: false },
      { id: "lab2", title: "Lab 2: JOINs", description: "", hasFiles: false },
      { id: "lab3", title: "Lab 3: Aggregations", description: "", hasFiles: false },
    ],
  },
  {
    id: "web",
    name: "Web Development",
    labs: [
      { id: "lab1", title: "Lab 1: HTML Layout", description: "", hasFiles: false },
      { id: "lab2", title: "Lab 2: CSS Styling", description: "", hasFiles: false },
      { id: "lab3", title: "Lab 3: JS Basics", description: "", hasFiles: false },
    ],
  },
];

export const progressMatrix = {
  cyber: {
    lab1: {
      status: "completed",
      attendance: "present",
      grade: 2,
    },
    lab2: {
      status: "pending",
      attendance: "absent",
      grade: 1,
    },
    lab3: {
      status: "completed",
      attendance: "present",
      grade: 3,
    },
    finalGrade: 12,
  },

  sql: {
    lab1: {
      status: "completed",
      attendance: "present",
      grade: 2,
    },
    lab2: {
      status: "completed",
      attendance: "present",
      grade: 3,
    },
    lab3: {
      status: "empty",
      attendance: "none",
      grade: 0,
    },
    finalGrade: 14,
  },

  web: {
    lab1: {
      status: "empty",
      attendance: "none",
      grade: 0,
    },
    lab2: {
      status: "empty",
      attendance: "none",
      grade: 0,
    },
    lab3: {
      status: "empty",
      attendance: "none",
      grade: 0,
    },
    finalGrade: "",
  },
};

