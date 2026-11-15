CREATE TABLE IF NOT EXISTS lab_attachments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_assignment_id INT UNSIGNED NOT NULL,
  uploaded_by_user_account_id INT UNSIGNED NOT NULL,
  storage_name CHAR(36) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY lab_attachments_storage_name_ux (storage_name),
  KEY lab_attachments_lab_idx (lab_assignment_id),
  CONSTRAINT lab_attachments_lab_fk
    FOREIGN KEY (lab_assignment_id) REFERENCES lab_assignments(id)
    ON DELETE CASCADE,
  CONSTRAINT lab_attachments_uploader_fk
    FOREIGN KEY (uploaded_by_user_account_id) REFERENCES user_accounts(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;
