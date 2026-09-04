package com.fitnote.modules.template.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class SquareTemplateVO {
    private Long id;
    private String name;
    private String description;
    private String coverColor;
    private Integer actionCount;
    private Integer totalSets;
    private Integer isOfficial;
    private Integer sortWeight;
    private Integer viewCount;
    private Integer collectCount;
    private Integer downloadCount;
    private LocalDateTime createTime;
    private String userName;
    private List<TagVO> tags;
}
