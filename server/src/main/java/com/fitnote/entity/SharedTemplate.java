package com.fitnote.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("shared_template")
public class SharedTemplate {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long originalTemplateId;
    private String name;
    private String description;
    private String coverColor;
    private Integer actionCount;
    private Integer totalSets;
    private String templateData;
    private Integer status;
    private String rejectReason;
    private Long auditAdminId;
    private LocalDateTime auditTime;
    private Integer isOfficial;
    private Integer sortWeight;
    private Integer viewCount;
    private Integer collectCount;
    private Integer downloadCount;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
