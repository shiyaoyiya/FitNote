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
@TableName("feedback_issue")
public class FeedbackIssue {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Integer category;
    private String title;
    private String content;
    private String screenshotUrls;
    private Integer status;
    private Long handlerAdminId;
    private String handleReply;
    private LocalDateTime handleTime;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
