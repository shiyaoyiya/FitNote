package com.fitnote.modules.dashboard;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.dashboard.vo.DashboardStatsVO;
import com.fitnote.modules.dashboard.vo.TrendVO;
import com.fitnote.modules.user.UserService;
import com.fitnote.support.AsyncTaskSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final SysUserMapper userMapper;
    private final UserService userService;
    private final AsyncTaskSupport asyncTaskSupport;

    /** 兜底刷新只触发一次（进程生命周期内） */
    private final AtomicBoolean fallbackTriggered = new AtomicBoolean(false);

    @Override
    public DashboardStatsVO stats() {
        Long totalUsers = userMapper.selectCount(null);

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        Long todayNew = userMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .ge(SysUser::getRegisterTime, startOfToday));
        Long todayActive = userMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .ge(SysUser::getLastActiveTime, startOfToday));

        List<SysUser> all = userMapper.selectList(null);
        BigDecimal totalVolume = all == null ? BigDecimal.ZERO : all.stream()
                .map(u -> u.getTotalVolumeKg() == null ? BigDecimal.ZERO : u.getTotalVolumeKg())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 兜底：进程生命周期内第一次访问 Dashboard 时，异步触发一次全用户权威重算。
        // 无论当前 totalVolume 是否为 0 都执行，保证：
        //   1. 上线新逻辑（如方案 B 按注册日期过滤）后首次访问即可生效；
        //   2. 历史 DB 中 totalVolume=0 的冷用户也能被重新计算出来。
        // 刷新是低频幂等操作，AsyncTaskSupport 独立 Bean 走 @Async 不影响响应。
        if (fallbackTriggered.compareAndSet(false, true) && all != null && !all.isEmpty()) {
            log.info("Dashboard 1st-request fallback: triggering async refreshAllTrainStatsFromLatestBackup for {} users", all.size());
            asyncTaskSupport.refreshAllTrainStatsFromLatestBackup();
        }

        return new DashboardStatsVO(
                totalUsers == null ? 0 : totalUsers,
                todayNew == null ? 0 : todayNew,
                todayActive == null ? 0 : todayActive,
                totalVolume
        );
    }

    @Override
    public List<TrendVO> newUsers7Days() {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(6);
        LocalDateTime startDateTime = start.atStartOfDay();

        List<SysUser> list = userMapper.selectList(new LambdaQueryWrapper<SysUser>()
                .ge(SysUser::getRegisterTime, startDateTime));

        Map<LocalDate, Long> grouped = list.stream()
                .filter(u -> u.getRegisterTime() != null)
                .collect(Collectors.groupingBy(
                        u -> u.getRegisterTime().toLocalDate(),
                        Collectors.counting()
                ));

        return buildTrend(start, today, grouped);
    }

    @Override
    public List<TrendVO> activeUsers7Days() {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(6);
        LocalDateTime startDateTime = start.atStartOfDay();

        List<SysUser> list = userMapper.selectList(new LambdaQueryWrapper<SysUser>()
                .ge(SysUser::getLastActiveTime, startDateTime));

        Map<LocalDate, Long> grouped = list.stream()
                .filter(u -> u.getLastActiveTime() != null)
                .collect(Collectors.groupingBy(
                        u -> u.getLastActiveTime().toLocalDate(),
                        Collectors.counting()
                ));

        return buildTrend(start, today, grouped);
    }

    private List<TrendVO> buildTrend(LocalDate start, LocalDate end, Map<LocalDate, Long> grouped) {
        // TreeMap 保证按日期升序
        TreeMap<LocalDate, Long> filled = new TreeMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            filled.put(d, grouped.getOrDefault(d, 0L));
        }
        List<TrendVO> result = new ArrayList<>(filled.size());
        filled.forEach((d, c) -> {
            String mm = String.format("%02d", d.getMonthValue());
            String dd = String.format("%02d", d.getDayOfMonth());
            result.add(new TrendVO(mm + "-" + dd, c));
        });
        return result;
    }
}
