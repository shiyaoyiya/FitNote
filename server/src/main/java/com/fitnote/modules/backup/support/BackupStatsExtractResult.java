package com.fitnote.modules.backup.support;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 备份 JSON 解析后的统计提取结果。
 * 由 {@link BackupStatsExtractor} 生成。
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BackupStatsExtractResult {
    /** fitness_daydata 的 key 数量（有数据的天数，无 entry 的天不统计天数时仍记为 1 天） */
    private int totalDays = 0;
    /** 所有 entry 累加的训练总容量（kg），精度 BigDecimal(14,2)；默认 ZERO 避免 NPE */
    private BigDecimal totalVolumeKg = BigDecimal.ZERO;
    /** fitness_templates 数量 */
    private int totalTemplates = 0;
    /** fitness_actions 数量 */
    private int totalActions = 0;
}
