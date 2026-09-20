package com.fitnote.modules.notification;

import com.fitnote.common.PageVO;
import com.fitnote.modules.notification.vo.NotificationVO;

/**
 * 用户站内通知服务：负责创建通知记录、查询当前用户的通知列表、标记已读。
 *
 * <p>当前实现仅落库（不发邮件），用户端可通过 GET /api/notification/list 拉取自己的通知。</p>
 */
public interface NotificationService {

    /**
     * 模板审核驳回时给分享人发送通知。
     *
     * @param userId       分享人（sys_user.id）；为空则跳过
     * @param templateId   shared_template.id
     * @param templateName 模板名（用于通知标题）
     * @param rejectReason 驳回原因（写入通知正文）
     */
    void notifyTemplateRejected(Long userId, Long templateId, String templateName, String rejectReason);

    /**
     * 模板强制下架时给分享人发送通知。
     *
     * @param userId       分享人（sys_user.id）；为空则跳过
     * @param templateId   shared_template.id
     * @param templateName 模板名（用于通知标题）
     * @param rejectReason 下架原因（写入通知正文）
     */
    void notifyTemplateOffline(Long userId, Long templateId, String templateName, String rejectReason);

    /**
     * 查询当前登录用户的通知列表（按 createTime DESC）。
     */
    PageVO<NotificationVO> myNotifications(Long userId, Integer page, Integer size, Integer isRead);

    /**
     * 标记单条通知为已读。
     */
    void markRead(Long userId, Long id);

    /**
     * 全部标记已读。
     */
    void markAllRead(Long userId);

    /**
     * 当前用户未读数量。
     */
    long unreadCount(Long userId);
}
