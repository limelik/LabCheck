export const teacherProgressData = {
  cyber: {
    TT319: {
      "319-1": {
        students: [
          {
            id: 1,
            name: "Milena Simonyan",
            examScores: { 1: 4 },
            labs: {
              lab1: { grade: 3, attendance: "present" },
              lab2: { grade: 2, attendance: "absent" },
              lab3: { grade: "empty", attendance: "empty" },
            },
          },
          {
            id: 2,
            name: "Liana Melikyan",
            examScores: { 1: 3 },
            labs: {
              lab1: { grade: 2, attendance: "present" },
              lab2: { grade: 5, attendance: "present" },
              lab3: { grade: 3, attendance: "empty" },
            },
          },
        ],
      },
      "319-2": {
        students: [{
          id: 3,
          name: "Armen Petrosyan",
          examScores: { 1: 2 },
          labs: {
            lab1: { grade: 1, attendance: "present" },
            lab2: { grade: 1, attendance: "absent" },
            lab3: { grade: 0, attendance: "absent" },
          },
        }],
      },
    },

    TT320: {
      "320-1": { students: [] },
    },
  },

  sql: {
    TT319: {
      "319-1": { students: [] },
    },
  },
};
