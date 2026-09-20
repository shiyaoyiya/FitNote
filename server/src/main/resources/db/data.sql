-- ============ 默认管理员（ADMIN / AUDITOR） ============
DELETE FROM sys_admin;
INSERT INTO sys_admin (id, username, password, nickname, role_code, status) VALUES
(1, 'admin',   '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '超级管理员', 'ADMIN', 1),
(2, 'auditor', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '审核员',       'AUDITOR', 1);

-- ============ sys_menu 3 级 26 条 ============
DELETE FROM sys_admin_menu; DELETE FROM sys_role_menu; DELETE FROM sys_menu;
INSERT INTO sys_menu (id,parent_id,name,path,component,title,icon,sort_order,visible,perms,type) VALUES
(1,0,'Dashboard','/dashboard','views/dashboard/Dashboard.vue','数据看板','DataAnalysis',1,1,'dashboard:view',2),

(2,0,'UserMgr','/user',NULL,'用户管理','User',2,1,NULL,1),
(21,2,'UserList','/user/list','views/user/UserList.vue','用户列表','UserFilled',1,1,'user:list',2),
(211,21,'UserStatus','',NULL,'封禁/解封',NULL,1,0,'user:status',3),
(212,21,'UserDetail','',NULL,'查看详情',NULL,2,0,'user:detail',3),

(3,0,'BackupMgr','/backup',NULL,'备份管理','Files',3,1,NULL,1),
(31,3,'BackupList','/backup/list','views/backup/BackupList.vue','备份列表','Document',1,1,'backup:list',2),
(311,31,'BackupDelete','',NULL,'删除备份',NULL,1,0,'backup:delete',3),

(4,0,'TemplateSquare','/template',NULL,'模板广场','Collection',4,1,NULL,1),
(41,4,'Audit','/template/audit','views/template/TemplateAudit.vue','审核管理','CircleCheck',1,1,'template:audit',2),
(411,41,'AuditDo','',NULL,'审核操作',NULL,1,0,'template:audit',3),
(42,4,'SquareMgr','/template/square','views/template/TemplateSquare.vue','广场管理','Promotion',2,1,'template:square',2),
(421,42,'Official','',NULL,'官方推荐',NULL,1,0,'template:official',3),
(422,42,'SquareDelete','',NULL,'删除模板',NULL,2,0,'template:square',3),

(5,0,'Announce','/announce',NULL,'公告管理','Bell',5,1,NULL,1),
(51,5,'AnnounceList','/announce/list','views/announce/AnnounceList.vue','公告列表','BellFilled',1,1,'announce:list',2),
(511,51,'Publish','',NULL,'发布/撤回',NULL,1,0,'announce:publish',3),

(6,0,'Feedback','/feedback',NULL,'反馈管理','ChatDotRound',6,1,NULL,1),
(61,6,'FeedbackList','/feedback/list','views/feedback/FeedbackList.vue','反馈列表','ChatLineSquare',1,1,'feedback:list',2),
(611,61,'Handle','',NULL,'处理反馈',NULL,1,0,'feedback:handle',3),

(8,0,'Admin','/admin',NULL,'管理员权限','Setting',7,1,NULL,1),
(81,8,'AdminList','/admin/list','views/admin/AdminUserList.vue','管理员列表','Avatar',1,1,'admin:list',2),
(811,81,'AdminEdit','',NULL,'新增/改密/停用',NULL,1,0,'admin:edit',3),
(82,8,'RoleMenu','/admin/role-menu','views/admin/RoleMenu.vue','账号菜单配置','Key',2,1,'admin:rolemenu',2);

-- ============ 账号-菜单绑定（超级管理员拥有全部权限，无需配置） ============
INSERT INTO sys_admin_menu (admin_id, menu_id) VALUES
(2,41),(2,411),(2,6),(2,61),(2,611);

-- ============ 11 个模板标签 ============
DELETE FROM template_tag_rel;
DELETE FROM template_tag;
INSERT INTO template_tag (id, name, color, sort_order) VALUES
(1,'胸','#d44848',1),(2,'背','#002fa7',2),(3,'臀','#f2b9b2',3),(4,'腿','#4DB6AC',4),
(5,'肩','#eeb8c3',5),(6,'手臂','#8076a3',6),(7,'推','#fa8c16',7),(8,'拉','#13c2c2',8),
(9,'蹲','#722ed1',9),(10,'上肢','#52c41a',10),(11,'下肢','#FF6B9A',11);
