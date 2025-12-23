export const teacherProgressData = {
  cyber: {
    TT319: {
      "319-1": {
        students: [
          {
            id: "s1",
            name: "Milena Simonyan",
            labs: {
              lab1: { grade: 3, attendance: "present" },
              lab2: { grade: 2, attendance: "absent" },
              lab3: { grade: "empty", attendance: "empty" },
            },
          },
          {
            id: "s2",
            name: "Liana Melikyan",
            labs: {
              lab1: { grade: 2, attendance: "present" },
              lab2: { grade: 5, attendance: "present" },
              lab3: { grade: 3, attendance: "empty" },
            },
          },
          {
            id: "s3",
            name: "Armen Petrosyan",
            labs: {
              lab1: { grade: 1, attendance: "present" },
              lab2: { grade: 1, attendance: "absent" },
              lab3: { grade: 0, attendance: "absent" },
            },
          },
        ],
      },
      "319-2": { students: [] },
      "319-3": { students: [] },
    },

    TT320: {
      "320-1": { students: [] },
      "320-2": { students: [] },
    },
  },

  sql: {
    TT319: {
      "319-1": { students: [] },
    },
  },
};
