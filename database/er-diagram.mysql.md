# MySQL ER diagram

This summarizes the active [`schema.mysql.sql`](./schema.mysql.sql). MySQL constraints and triggers in the SQL file define the exact rules.

```mermaid
erDiagram
    USER_ACCOUNTS ||--o| ADMINS : profile
    USER_ACCOUNTS ||--o| TEACHERS : profile
    USER_ACCOUNTS ||--o| STUDENTS : profile
    USER_ACCOUNTS ||--o{ EMAIL_VERIFICATION_TOKENS : verifies
    USER_ACCOUNTS ||--o{ PASSWORD_RESET_TOKENS : resets

    ACADEMIC_UNITS ||--o{ SPECIALIZATIONS : contains
    ACADEMIC_UNITS ||--o| ADMINS : managed_by
    SPECIALIZATIONS ||--o{ ACADEMIC_GROUPS : contains
    ACADEMIC_GROUPS ||--o{ LAB_GROUPS : contains
    ACADEMIC_GROUPS ||--o{ STUDENTS : member_of
    ACADEMIC_GROUPS ||--o{ SUBJECT_GROUP_OFFERINGS : receives
    SUBJECTS ||--o{ SUBJECT_GROUP_OFFERINGS : taught_as

    SUBJECT_GROUP_OFFERINGS ||--o{ TEACHER_SUBJECT_ASSIGNMENTS : covered_by
    TEACHERS ||--o{ TEACHER_SUBJECT_ASSIGNMENTS : teaches
    LAB_GROUPS ||--o{ TEACHER_SUBJECT_ASSIGNMENTS : covered_group

    SUBJECT_GROUP_OFFERINGS ||--o{ STUDENT_SUBJECT_ENROLLMENTS : enrolls
    STUDENTS ||--o{ STUDENT_SUBJECT_ENROLLMENTS : takes
    LAB_GROUPS ||--o{ STUDENT_SUBJECT_ENROLLMENTS : current_or_default
    STUDENT_SUBJECT_ENROLLMENTS ||--o{ LAB_CHANGE_REQUESTS : requests
    TEACHERS ||--o{ LAB_CHANGE_REQUESTS : decides

    SUBJECT_GROUP_OFFERINGS ||--|{ OFFERING_MIDTERMS : has_two
    OFFERING_MIDTERMS ||--o{ LAB_ASSIGNMENTS : contains
    LAB_ASSIGNMENTS ||--o{ STUDENT_LAB_RESULTS : graded_in
    STUDENT_SUBJECT_ENROLLMENTS ||--o{ STUDENT_LAB_RESULTS : earns
    STUDENT_SUBJECT_ENROLLMENTS ||--o{ STUDENT_MIDTERM_RESULTS : exam_score
```

An offering has two midterms. Lab maximum grades must total exactly 16 before each midterm is locked; every enrolled student must also have all lab grades, attendance marks, and a 0–4 exam score. Each midterm has 20 points overall, and three absences always make a student not allowed. At most 14 labs belong to an offering. A unique key allows one teacher per offering and lab group. Each enrollment retains both its default and current lab group. One pending lab change request is allowed per enrollment.
