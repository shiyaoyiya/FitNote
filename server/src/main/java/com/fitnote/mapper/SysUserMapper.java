package com.fitnote.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fitnote.entity.SysUser;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.math.BigDecimal;

public interface SysUserMapper extends BaseMapper<SysUser> {

    /**
     * 原子性地 GREATEST 更新用户训练统计。
     * 避免 select-then-update 的并发丢更新问题。
     * total_train_days 为 null 时按 0 比较；total_volume_kg 同理。
     */
    @Update("UPDATE sys_user SET " +
            "  total_train_days = GREATEST(COALESCE(total_train_days, 0), #{days}), " +
            "  total_volume_kg = GREATEST(COALESCE(total_volume_kg, 0), #{volumeKg}), " +
            "  last_active_time = NOW(), " +
            "  update_time = NOW() " +
            "WHERE id = #{userId}")
    int updateTrainStatsGreatest(@Param("userId") Long userId,
                                 @Param("days") Integer days,
                                 @Param("volumeKg") BigDecimal volumeKg);
}
