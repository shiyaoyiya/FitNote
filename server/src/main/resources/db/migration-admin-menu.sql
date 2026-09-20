-- ============ 迁移脚本：从 sys_role_menu 迁移到 sys_admin_menu ============
-- 1. 创建 sys_admin_menu 表
CREATE TABLE IF NOT EXISTS sys_admin_menu (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT NOT NULL,
  menu_id BIGINT NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_am (admin_id, menu_id),
  INDEX idx_am_admin(admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 将 sys_role_menu 中 AUDITOR 角色的菜单绑定迁移到各审核员账号
INSERT IGNORE INTO sys_admin_menu (admin_id, menu_id)
SELECT a.id, rm.menu_id
FROM sys_role_menu rm
JOIN sys_admin a ON a.role_code = rm.role_code AND a.role_code != 'ADMIN'
WHERE a.deleted = 0;

-- 3. 超级管理员(ADMIN)无需配置，代码层面对 ADMIN 角色直接返回全部菜单
