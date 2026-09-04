package com.fitnote.modules.dashboard;

import com.fitnote.modules.dashboard.vo.DashboardStatsVO;
import com.fitnote.modules.dashboard.vo.TrendVO;

import java.util.List;

public interface DashboardService {
    DashboardStatsVO stats();

    List<TrendVO> newUsers7Days();

    List<TrendVO> activeUsers7Days();
}
