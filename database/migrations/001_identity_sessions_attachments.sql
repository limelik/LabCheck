CREATE TABLE IF NOT EXISTS registrations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  requested_role ENUM('STUDENT','TEACHER') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  detected_group_code VARCHAR(50) NULL,
  email_verified_at DATETIME NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  review_reason VARCHAR(1000) NULL,
  account_id INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT registrations_account_fk FOREIGN KEY(account_id) REFERENCES user_accounts(id) ON DELETE SET NULL,
  CONSTRAINT registrations_reviewer_fk FOREIGN KEY(reviewed_by) REFERENCES user_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS email_otp_challenges (
  id CHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  purpose ENUM('REGISTER','RESET') NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  UNIQUE KEY otp_email_purpose_ux(email,purpose)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_account_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  KEY sessions_account_idx(user_account_id),
  CONSTRAINT auth_sessions_account_fk FOREIGN KEY(user_account_id) REFERENCES user_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS account_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id INT UNSIGNED NOT NULL,
  target_id INT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  details VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT account_audit_actor_fk FOREIGN KEY(actor_id) REFERENCES user_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT account_audit_target_fk FOREIGN KEY(target_id) REFERENCES user_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS lab_attachments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lab_assignment_id INT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_key CHAR(64) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT lab_attachments_lab_fk FOREIGN KEY(lab_assignment_id) REFERENCES lab_assignments(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS attachment_file_cleanup (
  storage_key CHAR(64) PRIMARY KEY,
  queued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
