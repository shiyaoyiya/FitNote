-- ============ 默认管理员（ADMIN / AUDITOR） ============
DELETE FROM sys_admin;
INSERT INTO sys_admin (id, username, password, nickname, role_code, status) VALUES
(1, 'admin',   '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '超级管理员', 'ADMIN', 1),
(2, 'auditor', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '审核员',       'AUDITOR', 1);

-- ============ sys_menu 3 级 26 条 ============
DELETE FROM sys_role_menu; DELETE FROM sys_menu;
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

(7,0,'Preset','/preset',NULL,'预设模板包','Box',7,1,NULL,1),
(71,7,'PresetList','/preset/list','views/preset/PresetList.vue','预设列表','Goods',1,1,'preset:list',2),
(711,71,'PresetEdit','',NULL,'新增/编辑/删除',NULL,1,0,'preset:edit',3),

(8,0,'Admin','/admin',NULL,'管理员权限','Setting',8,1,NULL,1),
(81,8,'AdminList','/admin/list','views/admin/AdminUserList.vue','管理员列表','Avatar',1,1,'admin:list',2),
(811,81,'AdminEdit','',NULL,'新增/改密/停用',NULL,1,0,'admin:edit',3),
(82,8,'RoleMenu','/admin/role-menu','views/admin/RoleMenu.vue','角色菜单配置','Key',2,1,'admin:rolemenu',2);

-- ============ 角色-菜单绑定 ============
INSERT INTO sys_role_menu (role_code, menu_id) VALUES
('ADMIN',1),
('ADMIN',2),('ADMIN',21),('ADMIN',211),('ADMIN',212),
('ADMIN',3),('ADMIN',31),('ADMIN',311),
('ADMIN',4),('ADMIN',41),('ADMIN',411),('ADMIN',42),('ADMIN',421),('ADMIN',422),
('ADMIN',5),('ADMIN',51),('ADMIN',511),
('ADMIN',6),('ADMIN',61),('ADMIN',611),
('ADMIN',7),('ADMIN',71),('ADMIN',711),
('ADMIN',8),('ADMIN',81),('ADMIN',811),('ADMIN',82),
('AUDITOR',41),('AUDITOR',411),('AUDITOR',6),('AUDITOR',61),('AUDITOR',611);

-- ============ 11 个模板标签 ============
DELETE FROM template_tag_rel;
DELETE FROM template_tag;
INSERT INTO template_tag (id, name, color, sort_order) VALUES
(1,'胸','#d44848',1),(2,'背','#002fa7',2),(3,'臀','#f2b9b2',3),(4,'腿','#4DB6AC',4),
(5,'肩','#eeb8c3',5),(6,'手臂','#8076a3',6),(7,'推','#fa8c16',7),(8,'拉','#13c2c2',8),
(9,'蹲','#722ed1',9),(10,'上肢','#52c41a',10),(11,'下肢','#FF6B9A',11);

-- ============ 3 套预设模板包 ============
DELETE FROM preset_pack;
INSERT INTO preset_pack (id, name, description, cover_color, difficulty, template_data, enabled, sort_order, create_admin_id) VALUES
(1, '经典推拉腿 3 日循环', '最适合新手/中级训练者的 3 天分化。推日=胸肩三头、拉日=背二头、腿日=股四头腘绳小腿臀部。', '#4DB6AC', 1,
 '[{"name":"推日(胸肩三头)","actions":["史密斯卧推","上斜哑铃卧推","哑铃肩推","侧平举","绳索下压","窄距俯卧撑"],"actionSets":{"史密斯卧推":4,"上斜哑铃卧推":3,"哑铃肩推":4,"侧平举":3,"绳索下压":3,"窄距俯卧撑":3},"color":"#d44848"},
   {"name":"拉日(背二头)","actions":["对握窄距下拉","V把绳索划船","引体向上(辅助)","单臂哑铃划船","杠铃弯举","锤式弯举"],"actionSets":{"对握窄距下拉":4,"V把绳索划船":3,"引体向上(辅助)":3,"单臂哑铃划船":3,"杠铃弯举":3,"锤式弯举":3},"color":"#002fa7"},
   {"name":"腿日","actions":["高脚杯深蹲","罗马尼亚硬拉","保加利亚分腿蹲","坐姿腿屈伸","俯卧腿弯举","站姿提踵"],"actionSets":{"高脚杯深蹲":4,"罗马尼亚硬拉":4,"保加利亚分腿蹲":3,"坐姿腿屈伸":3,"俯卧腿弯举":3,"站姿提踵":4},"color":"#4DB6AC"}]', 1, 1, 1),
(2, '新手入门 5 分化', '训练频率 5 天/周的初级方案：胸/背/肩/臂/腿分开，每天只有 1 个大肌群，恢复压力小。', '#f2b9b2', 1,
 '[{"name":"胸部日","actions":["平板哑铃卧推","上斜哑铃卧推","龙门架夹胸"],"actionSets":{"平板哑铃卧推":4,"上斜哑铃卧推":3,"龙门架夹胸":3},"color":"#d44848"},
   {"name":"背部日","actions":["高位下拉","坐姿划船","直臂下压"],"actionSets":{"高位下拉":4,"坐姿划船":3,"直臂下压":3},"color":"#002fa7"},
   {"name":"肩部日","actions":["哑铃肩推","侧平举","俯身飞鸟"],"actionSets":{"哑铃肩推":4,"侧平举":4,"俯身飞鸟":3},"color":"#eeb8c3"},
   {"name":"手臂日","actions":["杠铃弯举","窄距卧推","锤式弯举","绳索下压"],"actionSets":{"杠铃弯举":3,"窄距卧推":3,"锤式弯举":3,"绳索下压":3},"color":"#8076a3"},
   {"name":"腿部日","actions":["腿举","罗马尼亚硬拉","腿屈伸","腿弯举","站姿提踵"],"actionSets":{"腿举":4,"罗马尼亚硬拉":3,"腿屈伸":3,"腿弯举":3,"站姿提踵":4},"color":"#4DB6AC"}]', 1, 2, 1),
(3, '女性塑形 4 天循环', '女性友好方案，侧重臀腿+核心，上肢保持紧致。', '#ff85c0', 2,
 '[{"name":"上肢+核心","actions":["哑铃卧推","坐姿划船","哑铃肩推","平板支撑","卷腹"],"actionSets":{"哑铃卧推":3,"坐姿划船":3,"哑铃肩推":3,"平板支撑":3,"卷腹":4},"color":"#ff85c0"},
   {"name":"臀腿A(臀侧重)","actions":["杠铃臀推","保加利亚蹲","髋外展","臀桥","站姿提踵"],"actionSets":{"杠铃臀推":4,"保加利亚蹲":3,"髋外展":4,"臀桥":3,"站姿提踵":3},"color":"#f2b9b2"},
   {"name":"有氧+核心","actions":["椭圆机(30min)","开合跳","平板支撑"],"actionSets":{"椭圆机(30min)":1,"开合跳":4,"平板支撑":3},"color":"#13c2c2"},
   {"name":"臀腿B(腿侧重)","actions":["高脚杯深蹲","罗马尼亚硬拉","箭步蹲","腿屈伸","站姿提踵"],"actionSets":{"高脚杯深蹲":4,"罗马尼亚硬拉":4,"箭步蹲":3,"腿屈伸":3,"站姿提踵":4},"color":"#eeb8c3"}]', 1, 3, 1);
