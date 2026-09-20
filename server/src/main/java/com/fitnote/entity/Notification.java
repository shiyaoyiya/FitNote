package com.fitnote.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户站内通知（个人维度）。
 * 用于承载模板审核驳回 / 强制下架 / 反馈处理结果等系统消息。
 */
@Data
@TableName("user_notification")
public class Notification {
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 接收通知的用户 ID（sys_user.id） */
    private Long userId;
    /**
     * 通知类型：
     * 1=模板审核驳回（template_rejected）
     * 2=模板强制下架（template_offline）
     * 3=反馈处理结果（feedback_handled）
     * 4=系统公告（system）
     */
    private Integer type;
    /** 通知标题 */
    private String title;
    /** 通知正文（可包含原因等） */
    private String content;
    /** 关联业务对象 ID（如 shared_template.id / feedback_issue.id）；可空 */
    private Long relatedId;
    /** 关联业务对象的次要标识（如模板名 / 反馈标题）；可空 */
    private String relatedLabel;
    /** 是否已读：0 未读，1 已读 */
    private Integer isRead;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
