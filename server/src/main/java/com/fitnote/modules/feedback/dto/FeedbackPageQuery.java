package com.fitnote.modules.feedback.dto;

import lombok.Data;

@Data
public class FeedbackPageQuery {
    private Integer page = 1;
    private Integer size = 10;
    private Integer status;      // 0待 1处理中 2已解决 3已拒绝
    private Integer category;    // 1建议 2Bug 3数据 4其他
    private String keyword;      // 标题关键词
    private Long userId;         // 管理端可按用户筛选
}
