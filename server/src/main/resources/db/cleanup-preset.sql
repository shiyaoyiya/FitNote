-- ============ 清理预设模板包相关数据 ============
-- 移除 sys_menu 中的预设模板包菜单项 (id=7,71,711)
DELETE FROM sys_role_menu WHERE menu_id IN (7, 71, 711);
DELETE FROM sys_admin_menu WHERE menu_id IN (7, 71, 711);
DELETE FROM sys_menu WHERE id IN (7, 71, 711);

-- 移除 preset_pack 表数据（如需保留表结构可跳过下面一行）
DELETE FROM preset_pack;

-- 如需彻底删除表，取消下面一行的注释
-- DROP TABLE IF EXISTS preset_pack;
