export const teacherProgressData = {
  cyber: {
    TT319: {
      "319-1": {
        students: [
          {
            id: "s1",
            name: "Milena Simonyan",
            labs: {
              lab1: { status: "completed", attendance: "present" },
              lab2: { status: "incomplete", attendance: "absent" },
              lab3: { status: "empty", attendance: "empty" },
            },
            finalGrade: 15,
          },
          {
            id: "s2",
            name: "Liana Melikyan",
            labs: {
              lab1: { status: "completed", attendance: "present" },
              lab2: { status: "completed", attendance: "present" },
              lab3: { status: "empty", attendance: "empty" },
            },
            finalGrade: 13,
          },
          {
            id: "s3",
            name: "Armen Petrosyan",
            labs: {
              lab1: { status: "completed", attendance: "present" },
              lab2: { status: "completed", attendance: "present" },
              lab3: { status: "incomplete", attendance: "absent" },
            },
            finalGrade: "ՉԹ",
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
