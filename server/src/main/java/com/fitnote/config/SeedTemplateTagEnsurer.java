package com.fitnote.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * 启动时确保「模板广场标签」字典表存在正确的 11 个业务标签。
 *
 * <h3>修复说明（UPSERT 思路）</h3>
 * 原实现采用 DELETE + INSERT，每次重启都会清空 template_tag_rel 关联表，
 * 导致用户分享模板时绑定的标签全部丢失（重启后模板广场带标签的模板标签被清空）。
 * 现改为 ON DUPLICATE KEY UPDATE，只确保 11 个标签存在且属性正确，
 * <b>不再删除 template_tag_rel 关联表</b>，保留用户业务数据。
 *
 * <h3>写入内容（业务标签）</h3>
 * 胸 / 背 / 臀 / 腿 / 肩 / 手臂 / 推 / 拉 / 蹲 / 上肢 / 下肢（共 11 个）。
 *
 * <h3>执行时机</h3>
 * 使用 ApplicationRunner + Ordered.HIGHEST_PRECEDENCE + 2，
 * 保证在 spring.sql.init 跑完后执行（与管理员密码 SeedAdminPasswordEnsurer 互不干扰）。
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class SeedTemplateTagEnsurer implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    // 11 个业务标签（id,name,color,sort_order）
    // id 固定显式插入，保证 template_tag_rel 中的 tag_id 引用稳定
    private static final List<Object[]> TAGS = Arrays.asList(new Object[][]{
            {1, "胸",   "#d44848", 1},
            {2, "背",   "#002fa7", 2},
            {3, "臀",   "#f2b9b2", 3},
            {4, "腿",   "#4DB6AC", 4},
            {5, "肩",   "#eeb8c3", 5},
            {6, "手臂", "#8076a3", 6},
            {7, "推",   "#fa8c16", 7},
            {8, "拉",   "#13c2c2", 8},
            {9, "蹲",   "#722ed1", 9},
            {10,"上肢", "#52c41a",10},
            {11,"下肢", "#FF6B9A",11},
    });

    @Override
    public void run(ApplicationArguments args) {
        try {
            // UPSERT：确保 11 个标签存在且属性正确，不删除 template_tag_rel 关联
            // 依据 template_tag.name 的 UNIQUE 约束：冲突时更新 name/color/sort_order，不冲突时正常 INSERT
            // 这样重启不会清空用户业务关联，且 id 保持稳定，rel 表的 tag_id 引用不会失效
            for (Object[] row : TAGS) {
                long id = ((Number) row[0]).longValue();
                String name = (String) row[1];
                String color = (String) row[2];
                int sortOrder = ((Number) row[3]).intValue();
                jdbc.update(
                        "INSERT INTO template_tag (id, name, color, sort_order) VALUES (?, ?, ?, ?) " +
                        "ON DUPLICATE KEY UPDATE name = VALUES(name), color = VALUES(color), sort_order = VALUES(sort_order)",
                        id, name, color, sortOrder
                );
            }
            log.info("[SeedTag] ✅ 已确保 template_tag 存在 11 个业务标签（胸/背/臀/腿/肩/手臂/推/拉/蹲/上肢/下肢），保留 template_tag_rel 关联");
        } catch (Exception e) {
            log.error("[SeedTag] 初始化 template_tag 失败，请检查表结构或数据库连接：{}", e.getMessage(), e);
        }
    }
}
