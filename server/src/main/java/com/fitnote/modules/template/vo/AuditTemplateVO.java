package com.fitnote.modules.template.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class AuditTemplateVO {
    private Long id;
    private String name;
    private String description;
    private String coverColor;
    private Integer actionCount;
    private Integer totalSets;
    private Integer status;
    private String rejectReason;
    private String userName;
    private LocalDateTime createTime;
    private LocalDateTime auditTime;
    private List<TagVO> tags;
    private String templateData;
}
