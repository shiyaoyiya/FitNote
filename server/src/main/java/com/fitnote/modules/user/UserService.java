package com.fitnote.modules.user;

import com.fitnote.common.PageVO;
import com.fitnote.modules.user.dto.UserQueryDTO;
import com.fitnote.modules.user.vo.ShareTemplateMiniVO;
import com.fitnote.modules.user.vo.UserDetailVO;
import com.fitnote.modules.user.vo.UserTrainingStatsVO;

import java.math.BigDecimal;

public interface UserService {
    PageVO<UserDetailVO> page(UserQueryDTO query);

    void ban(Long userId);

    void unban(Long userId);

    UserDetailVO detail(Long userId);

    long countTodayNew();

    /** 用户画像页 —— 训练统计图需要的所有数据（30天趋势+部位分布+4大核心指标+备份数） */
    UserTrainingStatsVO getUserTrainingStats(Long userId);

    /** 用户画像页 —— 分页查询该用户的分享模板（不区分审核状态） */
    PageVO<ShareTemplateMiniVO> pageUserShareTemplates(Long userId, Integer page, Integer size);

    /**
     * 用 GREATEST 原子更新用户的累计训练天数 / 累计容量。
     * 保证并发安全，单调不降低。
     *
     * @return 受影响行数（用户不存在/无权限返回 0）
     */
    int updateStatsGreatest(Long userId, Integer days, BigDecimal volumeKg);

    /**
     * 读取该用户最新备份，回填 SysUser 的 totalTrainDays / totalVolumeKg。
     * 兼容老备份（没有 totalVolumeKg 列）：会从备份 JSON 文件重新解析补算。
     *
     * @return true 做了更新；false 没有备份或无需更新
     */
    boolean refreshTrainStatsFromLatestBackup(Long userId);

    /**
     * 对所有用户执行一次 refreshTrainStatsFromLatestBackup。
     * 一般用于启动兜底。
     */
    void refreshAllTrainStatsFromLatestBackup();
}
