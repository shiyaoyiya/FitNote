package com.fitnote.modules.user.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 训练部位容量分布（饼图渲染用） */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BodyPartDistVO {
    /** 部位名：胸 / 背 / 腿 / 肩 / 臂 / 核心 / 其他 */
    private String name;
    /** 该部位累计训练容量 kg */
    private BigDecimal valueKg;
}
