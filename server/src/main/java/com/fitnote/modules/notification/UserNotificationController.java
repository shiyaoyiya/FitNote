package com.fitnote.modules.notification;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.notification.vo.NotificationVO;
import com.fitnote.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 用户站内通知接口（路径：/api/notification）。
 * 权限：USER 类型 JWT；仅能查看 / 操作自己的通知。
 */
@RestController
@RequestMapping("/api/notification")
@RequiredArgsConstructor
public class UserNotificationController {

    private final NotificationService notificationService;

    /** 当前用户的通知列表（分页；isRead=0 未读 / 1 已读 / null 全部） */
    @GetMapping("/list")
    public Result<PageVO<NotificationVO>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) Integer isRead
    ) {
        Long userId = SecurityUtils.getUserIdOrThrow();
        return Result.ok(notificationService.myNotifications(userId, page, size, isRead));
    }

    /** 单条标记已读 */
    @PutMapping("/{id}/read")
    public Result<?> markRead(@PathVariable Long id) {
        Long userId = SecurityUtils.getUserIdOrThrow();
        notificationService.markRead(userId, id);
        return Result.ok();
    }

    /** 全部标记已读 */
    @PutMapping("/read-all")
    public Result<?> markAllRead() {
        Long userId = SecurityUtils.getUserIdOrThrow();
        notificationService.markAllRead(userId);
        return Result.ok();
    }

    /** 当前用户未读数量 + 总未读数（供个人中心弹窗红点使用） */
    @GetMapping("/unread-count")
    public Result<Map<String, Long>> unreadCount() {
        Long userId = SecurityUtils.getUserIdOrThrow();
        Map<String, Long> m = new HashMap<>();
        m.put("unread", notificationService.unreadCount(userId));
        return Result.ok(m);
    }
}
