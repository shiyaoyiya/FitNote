package com.fitnote.modules.dashboard;

import com.fitnote.common.Result;
import com.fitnote.modules.dashboard.vo.DashboardStatsVO;
import com.fitnote.modules.dashboard.vo.TrendVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public Result<DashboardStatsVO> stats() {
        return Result.ok(dashboardService.stats());
    }

    @GetMapping("/trend/new-users")
    public Result<List<TrendVO>> newUsers() {
        return Result.ok(dashboardService.newUsers7Days());
    }

    @GetMapping("/trend/active-users")
    public Result<List<TrendVO>> activeUsers() {
        return Result.ok(dashboardService.activeUsers7Days());
    }
}
