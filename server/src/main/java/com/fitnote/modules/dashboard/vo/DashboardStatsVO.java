package com.fitnote.modules.dashboard.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DashboardStatsVO {
    private long totalUsers;
    private long todayNew;
    private long todayActive;
    private BigDecimal totalVolumeKg;
}
