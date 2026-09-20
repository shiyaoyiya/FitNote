package com.fitnote.modules.backup.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 备份详情预览 VO
 */
@Data
public class BackupPreviewVO {
    /** 版本 */
    private String version;
    /** 备份时间戳 */
    private Long backupTime;
    /** 备份类型：full/incremental */
    private String backupType;

    // --- 统计数据 ---
    /** 训练天数 */
    private Integer totalDays;
    /** 模板数量 */
    private Integer totalTemplates;
    /** 动作数量 */
    private Integer totalActions;
    /** 训练总容量 kg */
    private BigDecimal totalVolumeKg;
    /** 纪念日数量 */
    private Integer totalAnniversaries;

    // --- 详情数据 ---
    /** 模板列表 */
    private List<BackupTemplateVO> templates;
    /** 训练日期列表 */
    private List<BackupDayVO> dayDataList;
    /** 动作列表 */
    private List<BackupActionVO> actions;
    /** 纪念日列表 */
    private List<BackupAnniversaryVO> anniversaries;
}
