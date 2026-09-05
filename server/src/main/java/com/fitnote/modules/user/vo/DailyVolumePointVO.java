package com.fitnote.modules.user.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 近 30 天训练累计容量快照（用于折线图） */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DailyVolumePointVO {
    /** yyyy-MM-dd */
    private String date;
    /** 截至当日的累计训练容量 kg（无备份时沿用上一日，首日为 0） */
    private BigDecimal volumeKg;
}
