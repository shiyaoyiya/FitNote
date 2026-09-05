package com.fitnote.modules.user.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** 用户画像页 —— 训练分析统计图需要的汇总数据 */
@Data
public class UserTrainingStatsVO {
    /** 近 30 天每天的累计容量快照（长度固定 30，按日期升序）；无备份时为全 0 基线 */
    private List<DailyVolumePointVO> dailyTrend;

    /** 部位容量分布（最新备份解析得到）；用于饼图，无数据时含 1 条「暂无数据 0kg」 */
    private List<BodyPartDistVO> bodyPartDist;

    /** 4 大核心指标：总训练天数（来自 SysUser 权威值） */
    private Integer totalTrainDays;
    /** 4 大核心指标：总容量 kg（来自 SysUser 权威值） */
    private BigDecimal totalVolumeKg;
    /** 4 大核心指标：模板总数（取最新备份记录）；无备份为 0 */
    private Integer totalTemplates;
    /** 4 大核心指标：动作总数（取最新备份记录）；无备份为 0 */
    private Integer totalActions;

    /** 该用户上传的备份总数（作为可信度参考）；无备份为 0 */
    private Integer backupCount;
}
