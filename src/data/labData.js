// For demo: 3 labs for TT319 Cybersecurity
export const labs = {
  cyber: {
    TT319: [
      { id: "lab1", title: "Lab 1: Network Basics", description: "Intro to security networks", hasFiles: true },
      { id: "lab2", title: "Lab 2: Encryption", description: "Practice symmetric + asymmetric encryption", hasFiles: false },
      { id: "lab3", title: "Lab 3: Firewall Rules", description: "Create & evaluate firewall rules", hasFiles: false },
    ],

    TT320: [
      { id: "lab1", title: "Lab 1: Network Basics", description: "Intro to security networks", hasFiles: false },
      { id: "lab2", title: "Lab 2: Encryption", description: "Symmetric + asymmetric encryption", hasFiles: false },
    ],
  },

  sql: {
    TT319: [
      { id: "lab1", title: "Lab 1: SELECT queries", description: "", hasFiles: false },
      { id: "lab2", title: "Lab 2: JOINs", description: "", hasFiles: false },
    ],
  }
};

// Maximum allowed labs per group
export const MAX_LABS = 14;
