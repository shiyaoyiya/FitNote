package com.fitnote.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.entity.TemplateTag;
import com.fitnote.entity.TemplateTagRel;
import com.fitnote.mapper.TemplateTagMapper;
import com.fitnote.mapper.TemplateTagRelMapper;
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
 * 启动时强制重置「模板广场标签」为正确的 11 个。
 *
 * <h3>为什么需要这个？</h3>
 * 生产上存在一种常见情况：data.sql 文件（源码/编译/打包 任一阶段）是旧的，
 * 或 spring.sql.init 跑的是旧 jar 内 data.sql；导致每次重启后 template_tag 又被
 * 刷回「推日/拉日/新手入门…」等旧 10 个标签，前端展示与数据库真实业务需求不匹配。
 *
 * <h3>执行时机</h3>
 * 使用 ApplicationRunner + Ordered.HIGHEST_PRECEDENCE + 2，
 * 保证在 spring.sql.init 跑完后再覆盖写入（比管理员密码 SeedAdminPasswordEnsurer 先或后都不影响，
 * 因为它只重置 admin 密码，与 template_tag 无关）。
 *
 * <h3>写入内容（业务新标签）</h3>
 * 胸 / 背 / 臀 / 腿 / 肩 / 手臂 / 推 / 拉 / 蹲 / 上肢 / 下肢（共 11 个）。
 *
 * <h3>注意</h3>
 * 因为 DELETE + INSERT 会改 id，会同时清空 template_tag_rel（避免外键/历史关联指向不存在的 tag）。
 * 如果后续业务要求保留已有关联，需要改为 UPSERT 思路。
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class SeedTemplateTagEnsurer implements ApplicationRunner {

    private final TemplateTagMapper tagMapper;
    private final TemplateTagRelMapper relMapper;
    private final JdbcTemplate jdbc;

    // 新的 11 个业务标签（id,name,color,sort_order）
    // id 固定显式插入，保证 MySQL AUTO_INCREMENT 按 1..11 起步，不会乱跳
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
            // 1. 先清关联，再清标签
            relMapper.delete(new LambdaQueryWrapper<TemplateTagRel>());
            tagMapper.delete(new LambdaQueryWrapper<TemplateTag>());
            // 重置自增：下次 INSERT 从 1 开始
            jdbc.execute("ALTER TABLE template_tag AUTO_INCREMENT = 1");

            // 2. 显式写 11 条（指定 id）
            for (Object[] row : TAGS) {
                TemplateTag t = new TemplateTag();
                t.setId(((Number) row[0]).longValue());
                t.setName((String) row[1]);
                t.setColor((String) row[2]);
                t.setSortOrder(((Number) row[3]).intValue());
                tagMapper.insert(t);
            }
            log.info("[SeedTag] ✅ 已重置 template_tag 为 11 个业务标签（胸/背/臀/腿/肩/手臂/推/拉/蹲/上肢/下肢）");
        } catch (Exception e) {
            log.error("[SeedTag] 重置 template_tag 失败，请检查表结构或数据库连接：{}", e.getMessage(), e);
        }
    }
}
