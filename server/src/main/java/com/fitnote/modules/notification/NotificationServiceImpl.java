package com.fitnote.modules.notification;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fitnote.common.PageVO;
import com.fitnote.entity.Notification;
import com.fitnote.mapper.NotificationMapper;
import com.fitnote.modules.notification.vo.NotificationVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 站内通知服务实现：通知落库，用户端通过 API 拉取自己的通知列表。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationMapper notificationMapper;

    @Override
    public void notifyTemplateRejected(Long userId, Long templateId, String templateName, String rejectReason) {
        createNotification(userId, 1, "模板审核未通过",
                "您的模板「" + (templateName == null ? "" : templateName) + "」未通过审核。原因：" + nvl(rejectReason),
                templateId, templateName);
    }

    @Override
    public void notifyTemplateOffline(Long userId, Long templateId, String templateName, String rejectReason) {
        createNotification(userId, 2, "模板已下架",
                "您的模板「" + (templateName == null ? "" : templateName) + "」已被管理员下架。原因：" + nvl(rejectReason),
                templateId, templateName);
    }

    @Override
    public PageVO<NotificationVO> myNotifications(Long userId, Integer page, Integer size, Integer isRead) {
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 10 : size;
        LambdaQueryWrapper<Notification> w = new LambdaQueryWrapper<>();
        w.eq(Notification::getUserId, userId);
        if (isRead != null) {
            w.eq(Notification::getIsRead, isRead);
        }
        w.orderByDesc(Notification::getCreateTime);
        Page<Notification> pr = notificationMapper.selectPage(new Page<>(p, s), w);
        List<Notification> records = pr.getRecords();
        if (records.isEmpty()) {
            return new PageVO<>(pr.getTotal(), Collections.emptyList());
        }
        List<NotificationVO> vos = records.stream().map(this::toVO).collect(Collectors.toList());
        return new PageVO<>(pr.getTotal(), vos);
    }

    @Override
    public void markRead(Long userId, Long id) {
        Notification n = notificationMapper.selectById(id);
        if (n == null || !userId.equals(n.getUserId())) return;
        if (n.getIsRead() != null && n.getIsRead() == 1) return;
        Notification up = new Notification();
        up.setId(id);
        up.setIsRead(1);
        notificationMapper.updateById(up);
    }

    @Override
    public void markAllRead(Long userId) {
        Notification entity = new Notification();
        entity.setIsRead(1);
        notificationMapper.update(entity,
                new LambdaUpdateWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .eq(Notification::getIsRead, 0));
    }

    @Override
    public long unreadCount(Long userId) {
        LambdaQueryWrapper<Notification> w = new LambdaQueryWrapper<>();
        w.eq(Notification::getUserId, userId).eq(Notification::getIsRead, 0);
        return notificationMapper.selectCount(w);
    }

    /* ----------- 内部辅助 ----------- */

    private void createNotification(Long userId, int type, String title, String content,
                                    Long relatedId, String relatedLabel) {
        if (userId == null) return;
        try {
            Notification n = new Notification();
            n.setUserId(userId);
            n.setType(type);
            n.setTitle(title);
            n.setContent(content);
            n.setRelatedId(relatedId);
            n.setRelatedLabel(relatedLabel);
            n.setIsRead(0);
            notificationMapper.insert(n);
        } catch (Exception e) {
            // 通知落库失败不影响主流程（审核/下架）
            log.warn("createNotification failed userId={} type={} relatedId={}: {}",
                    userId, type, relatedId, e.getMessage());
        }
    }

    private NotificationVO toVO(Notification n) {
        NotificationVO vo = new NotificationVO();
        vo.setId(n.getId());
        vo.setType(n.getType());
        vo.setTypeText(typeText(n.getType()));
        vo.setTitle(n.getTitle());
        vo.setContent(n.getContent());
        vo.setRelatedId(n.getRelatedId());
        vo.setRelatedLabel(n.getRelatedLabel());
        vo.setIsRead(n.getIsRead());
        vo.setCreateTime(n.getCreateTime());
        return vo;
    }

    private String typeText(Integer t) {
        if (t == null) return "系统消息";
        switch (t) {
            case 1: return "模板审核驳回";
            case 2: return "模板强制下架";
            case 3: return "反馈处理结果";
            case 4: return "系统公告";
            default: return "系统消息";
        }
    }

    private String nvl(String s) {
        return s == null ? "" : s;
    }
}
