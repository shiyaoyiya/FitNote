package com.fitnote.modules.notification.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户站内通知视图对象。
 */
@Data
public class NotificationVO {
    private Long id;
    private Integer type;
    /** 类型文本（模板审核驳回 / 模板强制下架 / 反馈处理结果 / 系统公告） */
    private String typeText;
    private String title;
    private String content;
    private Long relatedId;
    private String relatedLabel;
    private Integer isRead;
    private LocalDateTime createTime;
}
