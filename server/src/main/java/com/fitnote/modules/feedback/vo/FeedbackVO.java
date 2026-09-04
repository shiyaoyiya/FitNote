package com.fitnote.modules.feedback.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FeedbackVO {
    private Long id;
    private Long userId;
    private String userName;
    private String userAvatar;
    private Integer category;
    private String categoryText;
    private String title;
    private String content;
    private String screenshotUrls;
    private Integer status;
    private String statusText;
    private Long handlerAdminId;
    private String handlerAdminName;
    private String handleReply;
    private LocalDateTime handleTime;
    private LocalDateTime createTime;
}
