package com.fitnote.modules.backup.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class BackupListVO {
    private Long id;
    private Long userId;
    private String userName;
    private String fileName;
    private Long fileSize;
    private Integer backupType;
    private String version;
    private Integer totalDays;
    private Integer totalTemplates;
    private Integer totalActions;
    /** 训练总容量 kg（由备份 JSON entries 解析） */
    private BigDecimal totalVolumeKg;
    private String remark;
    private LocalDateTime createTime;
}
