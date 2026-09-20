-- 微信登录支持：sys_user 表新增 openid 和 login_type 字段
-- 执行前请备份数据库

-- 1. 添加 openid 字段
ALTER TABLE sys_user ADD COLUMN openid VARCHAR(64) COMMENT '微信openid' AFTER status;

-- 2. 添加 login_type 字段
ALTER TABLE sys_user ADD COLUMN login_type TINYINT DEFAULT 1 COMMENT '1账号密码 2微信登录' AFTER openid;

-- 3. 添加 openid 唯一索引（允许 NULL 值的唯一索引）
CREATE UNIQUE INDEX uk_su_openid ON sys_user(openid);
