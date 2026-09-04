package com.fitnote.modules.announce.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AnnounceVO {
    private Long id;
    private String title;
    private String content;
    private Integer type;         // 1系统 2活动 3版本
    private String typeText;
    private Integer priority;     // 1置顶 0普通
    private Integer status;       // 0草稿 1发布 2撤回
    private String statusText;
    private Long publishAdminId;
    private String publishAdminName;
    private LocalDateTime publishTime;
    private Integer viewCount;
    private LocalDateTime createTime;
}
