package com.fitnote.modules.backup.vo;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 备份中动作单组记录 VO
 */
@Data
public class BackupDayActionEntryVO {
    /** 输入内容，如 "12*58" 或 "10×30" */
    private String input;
    /** 容量 */
    private BigDecimal total;
    /** 重量（从 input 解析） */
    private BigDecimal weight;
    /** 次数（从 input 解析） */
    private Integer reps;
}
