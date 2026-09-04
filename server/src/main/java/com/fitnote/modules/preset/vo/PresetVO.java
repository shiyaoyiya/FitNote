package com.fitnote.modules.preset.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PresetVO {
    private Long id;
    private String name;
    private String description;
    private String coverColor;
    private Integer difficulty;
    private String difficultyText;
    private String templateData;
    private Integer enabled;
    private Integer sortOrder;
    private Long createAdminId;
    private String createAdminName;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
