package com.fitnote.modules.announce.dto;

import lombok.Data;

@Data
public class AnnouncePageQuery {
    private Integer page = 1;
    private Integer size = 10;
    private Integer status;       // 0草稿 1发布 2撤回
    private Integer type;         // 1系统 2活动 3版本
    private String keyword;       // 标题关键词
}
