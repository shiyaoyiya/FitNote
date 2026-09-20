package com.fitnote.modules.backup.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 备份中单日训练数据 VO
 */
@Data
public class BackupDayVO {
    /** 日期，如 2026-09-06 */
    private String date;
    /** 当日动作数 */
    private Integer actionCount;
    /** 当日总容量 kg */
    private BigDecimal totalVolumeKg;
    /** 当日使用的模板名 */
    private List<String> templateNames;
    /** 动作名称列表（保持顺序） */
    private List<String> actionNames;
    /** 动作详情映射：动作名 → 各组记录 */
    private Map<String, List<BackupDayActionEntryVO>> actionEntries;
}
