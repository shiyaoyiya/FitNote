package com.fitnote.modules.user.vo;

import lombok.Data;

import java.time.LocalDateTime;

/** 用户画像页 —— 分享模板列表的精简卡片字段 */
@Data
public class ShareTemplateMiniVO {
    private Long id;
    private String name;
    private String description;
    private String coverColor;
    private Integer actionCount;
    private Integer totalSets;
    /** 0待审核 / 1已发布 / 2已拒绝 / 3已下架（与 SharedTemplate.status 一致） */
    private Integer status;
    private String rejectReason;
    private Integer viewCount;
    private Integer collectCount;
    private Integer downloadCount;
    private LocalDateTime createTime;
}
