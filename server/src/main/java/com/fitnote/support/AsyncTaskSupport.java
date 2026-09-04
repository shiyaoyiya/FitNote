package com.fitnote.support;

import com.fitnote.modules.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * 独立 Bean，用来异步触发训练统计全量刷新。
 * 不直接写在 DashboardServiceImpl 里是为了避免同一个类内部的 self-invocation 导致 @Async 不生效。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncTaskSupport {

    private final UserService userService;

    @Async
    public void refreshAllTrainStatsFromLatestBackup() {
        try {
            userService.refreshAllTrainStatsFromLatestBackup();
        } catch (Exception e) {
            log.warn("async refreshAllTrainStatsFromLatestBackup failed: {}", e.getMessage());
        }
    }
}
