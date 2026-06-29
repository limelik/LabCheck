# MySQL ER Diagram

This diagram reflects [`schema.mysql.sql`](./schema.mysql.sql).

```mermaid
erDiagram
    USER_ACCOUNTS {
        bigint id PK
        varchar email
        varchar password_hash
        enum account_type
        enum approval_status
        boolean is_active
        datetime last_login_at
        bigint reviewed_by_user_account_id FK
        datetime reviewed_at
    }

    ACADEMIC_UNITS {
        bigint id PK
        varchar code
        varchar name
        enum unit_type
    }

    SPECIALIZATIONS {
        bigint id PK
        bigint academic_unit_id FK
        varchar code
        varchar name
    }

    ACADEMIC_GROUPS {
        bigint id PK
        bigint specialization_id FK
        varchar code
        varchar name
        int start_year
    }

    LAB_GROUPS {
        bigint id PK
        bigint academic_group_id FK
        varchar code
        int lab_group_number
    }

    SUBJECTS {
        bigint id PK
        varchar code
        varchar name
    }

    ADMINS {
        bigint id PK
        bigint user_account_id FK
        bigint academic_unit_id FK
        varchar first_name
        varchar last_name
        enum admin_level
    }

    TEACHERS {
        bigint id PK
        bigint user_account_id FK
        varchar first_name
        varchar last_name
        varchar employee_number
    }

    STUDENTS {
        bigint id PK
        bigint user_account_id FK
        varchar first_name
        varchar last_name
        varchar student_number
    }

    SUBJECT_GROUP_OFFERINGS {
        bigint id PK
        bigint subject_id FK
        bigint academic_group_id FK
        varchar academic_year
        enum semester
        int max_absences_before_block
        boolean is_active
    }

    TEACHER_SUBJECT_ASSIGNMENTS {
        bigint id PK
        bigint teacher_id FK
        bigint subject_group_offering_id FK
        bigint lab_group_id FK
    }

    STUDENT_SUBJECT_ENROLLMENTS {
        bigint id PK
        bigint student_id FK
        bigint subject_group_offering_id FK
        bigint lab_group_id FK
    }

    LAB_ASSIGNMENTS {
        bigint id PK
        bigint subject_group_offering_id FK
        int midterm_no
        int lab_number
        decimal max_points
        int difficulty
    }

    LAB_ASSIGNMENT_LAB_GROUPS {
        bigint lab_assignment_id PK, FK
        bigint lab_group_id PK, FK
    }

    STUDENT_LAB_RESULTS {
        bigint id PK
        bigint lab_assignment_id FK
        bigint student_subject_enrollment_id FK
        enum attendance
        decimal grade
    }

    STUDENT_MIDTERM_RESULTS {
        bigint id PK
        bigint student_subject_enrollment_id FK
        int midterm_no
        decimal exam_score
    }

    PASSWORD_RESET_TOKENS {
        bigint id PK
        bigint user_account_id FK
        varchar token_hash
        datetime expires_at
        datetime used_at
    }

    ACTIVITY_LOGS {
        bigint id PK
        bigint actor_user_account_id FK
        varchar action_type
        varchar entity_type
        varchar entity_id
        enum status
    }

    USER_ACCOUNTS ||--|| ADMINS : has
    USER_ACCOUNTS ||--|| TEACHERS : has
    USER_ACCOUNTS ||--|| STUDENTS : has
    USER_ACCOUNTS ||--o{ PASSWORD_RESET_TOKENS : resets
    USER_ACCOUNTS ||--o{ ACTIVITY_LOGS : performs

    ACADEMIC_UNITS ||--o{ SPECIALIZATIONS : contains
    SPECIALIZATIONS ||--o{ ACADEMIC_GROUPS : groups
    ACADEMIC_GROUPS ||--o{ LAB_GROUPS : contains
    ACADEMIC_UNITS ||--o| ADMINS : managed_by

    SUBJECTS ||--o{ SUBJECT_GROUP_OFFERINGS : offered_as
    ACADEMIC_GROUPS ||--o{ SUBJECT_GROUP_OFFERINGS : receives

    TEACHERS ||--o{ TEACHER_SUBJECT_ASSIGNMENTS : teaches
    SUBJECT_GROUP_OFFERINGS ||--o{ TEACHER_SUBJECT_ASSIGNMENTS : assigns
    LAB_GROUPS ||--o{ TEACHER_SUBJECT_ASSIGNMENTS : split_by

    STUDENTS ||--o{ STUDENT_SUBJECT_ENROLLMENTS : enrolls
    SUBJECT_GROUP_OFFERINGS ||--o{ STUDENT_SUBJECT_ENROLLMENTS : belongs_to
    LAB_GROUPS ||--o{ STUDENT_SUBJECT_ENROLLMENTS : placed_in

    SUBJECT_GROUP_OFFERINGS ||--o{ LAB_ASSIGNMENTS : contains
    LAB_ASSIGNMENTS ||--o{ LAB_ASSIGNMENT_LAB_GROUPS : visible_to
    LAB_GROUPS ||--o{ LAB_ASSIGNMENT_LAB_GROUPS : receives

    STUDENT_SUBJECT_ENROLLMENTS ||--o{ STUDENT_LAB_RESULTS : earns
    LAB_ASSIGNMENTS ||--o{ STUDENT_LAB_RESULTS : graded_in

    STUDENT_SUBJECT_ENROLLMENTS ||--o{ STUDENT_MIDTERM_RESULTS : tested_in
```

## Reading the model

- `subjects` is a shared catalog, while `subject_group_offerings` is the semester-specific teaching instance for one academic group.
- Every subgroup of the offering's academic group is implicitly part of the offering, so there is no `subject_offering_lab_groups` table anymore.
- `lab_assignment_lab_groups` still exists because labs are created once per offering and then shared only to the subgroups that should see that specific lab.
- `student_lab_results` stores per-lab grading, while `student_midterm_results` stores the separate 4-point midterm exam score.
