-- ------- 1 sys_user -------
CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar_url VARCHAR(255),
  phone VARCHAR(20) UNIQUE,
  gender TINYINT DEFAULT 0,
  birthday DATE,
  status TINYINT DEFAULT 1 COMMENT '1正常 0封禁',
  total_train_days INT DEFAULT 0,
  total_volume_kg DECIMAL(12,2) DEFAULT 0,
  last_login_time DATETIME,
  last_active_time DATETIME,
  register_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_su_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 2 sys_admin -------
CREATE TABLE IF NOT EXISTS sys_admin (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  role_code VARCHAR(32) NOT NULL,
  status TINYINT DEFAULT 1,
  last_login_time DATETIME,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 3 sys_menu -------
CREATE TABLE IF NOT EXISTS sys_menu (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT NOT NULL DEFAULT 0,
  name VARCHAR(64) NOT NULL,
  path VARCHAR(128),
  component VARCHAR(255),
  title VARCHAR(64) NOT NULL,
  icon VARCHAR(64),
  sort_order INT DEFAULT 0,
  visible TINYINT(1) DEFAULT 1,
  perms VARCHAR(128),
  type TINYINT NOT NULL COMMENT '1目录 2菜单 3按钮',
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 4 sys_role_menu -------
CREATE TABLE IF NOT EXISTS sys_role_menu (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  role_code VARCHAR(32) NOT NULL,
  menu_id BIGINT NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rm (role_code, menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 5 backup_record (不限数量，无 max 限制逻辑) -------
CREATE TABLE IF NOT EXISTS backup_record (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL, INDEX idx_br_user(user_id),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_size BIGINT NOT NULL,
  backup_type TINYINT DEFAULT 1 COMMENT '1全量 2增量',
  version VARCHAR(16) DEFAULT '1.0',
  total_days INT DEFAULT 0,
  total_templates INT DEFAULT 0,
  total_actions INT DEFAULT 0,
  remark VARCHAR(255),
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 6 shared_template -------
CREATE TABLE IF NOT EXISTS shared_template (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL, INDEX idx_st_user(user_id),
  original_template_id BIGINT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_color VARCHAR(16),
  action_count INT DEFAULT 0,
  total_sets INT DEFAULT 0,
  template_data JSON NOT NULL,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审 1通过 2驳回',
  reject_reason VARCHAR(512),
  audit_admin_id BIGINT,
  audit_time DATETIME,
  is_official TINYINT(1) DEFAULT 0,
  sort_weight INT DEFAULT 0,
  view_count INT DEFAULT 0,
  collect_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  deleted TINYINT(1) NOT NULL DEFAULT 0, INDEX idx_st_status(status),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 7 template_tag -------
CREATE TABLE IF NOT EXISTS template_tag (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  color VARCHAR(16),
  sort_order INT DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 8 template_tag_rel -------
CREATE TABLE IF NOT EXISTS template_tag_rel (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  template_id BIGINT NOT NULL, INDEX idx_ttr_t(template_id),
  tag_id BIGINT NOT NULL, INDEX idx_ttr_tag(tag_id),
  UNIQUE KEY uk_ttr (template_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 9 user_template_collect -------
CREATE TABLE IF NOT EXISTS user_template_collect (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL, INDEX idx_utc_u(user_id),
  template_id BIGINT NOT NULL, INDEX idx_utc_t(template_id),
  UNIQUE KEY uk_utc (user_id, template_id),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 10 announcement -------
CREATE TABLE IF NOT EXISTS announcement (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type TINYINT DEFAULT 1 COMMENT '1系统 2活动 3版本更新',
  priority TINYINT DEFAULT 0 COMMENT '1置顶 0普通',
  status TINYINT DEFAULT 0 COMMENT '0草稿 1发布 2撤回',
  publish_admin_id BIGINT,
  publish_time DATETIME,
  target_group TINYINT DEFAULT 0,
  view_count INT DEFAULT 0,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 11 feedback_issue -------
CREATE TABLE IF NOT EXISTS feedback_issue (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL, INDEX idx_fb_user(user_id),
  category TINYINT NOT NULL COMMENT '1建议 2Bug 3数据 4其他',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  screenshot_urls TEXT,
  status TINYINT DEFAULT 0 COMMENT '0待处理 1处理中 2已解决 3已拒绝',
  handler_admin_id BIGINT,
  handle_reply TEXT,
  handle_time DATETIME,
  deleted TINYINT(1) NOT NULL DEFAULT 0, INDEX idx_fb_status(status),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------- 12 preset_pack -------
CREATE TABLE IF NOT EXISTS preset_pack (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_color VARCHAR(16),
  difficulty TINYINT COMMENT '1简单 2中 3难',
  template_data JSON NOT NULL,
  enabled TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  create_admin_id BIGINT,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
