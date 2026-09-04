package com.fitnote.modules.user;

import com.fitnote.common.PageVO;
import com.fitnote.modules.user.dto.UserQueryDTO;
import com.fitnote.modules.user.vo.UserDetailVO;

import java.math.BigDecimal;

public interface UserService {
    PageVO<UserDetailVO> page(UserQueryDTO query);

    void ban(Long userId);

    void unban(Long userId);

    UserDetailVO detail(Long userId);

    long countTodayNew();

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
