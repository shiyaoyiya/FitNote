package com.fitnote.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("backup_record")
public class BackupRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String fileName;
    private String filePath;
    private Long fileSize;
    private Integer backupType;
    private String version;
    private Integer totalDays;
    private Integer totalTemplates;
    private Integer totalActions;
    /**
     * 训练总容量 kg，由 weight*reps 累加得出；
     * 解析失败 / 无 daydata 时为 null（显示时视为 0）。
     */
    private BigDecimal totalVolumeKg;
    private String remark;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
