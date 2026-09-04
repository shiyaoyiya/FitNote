package com.fitnote.modules.user.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 用户个人资料视图对象
 * 字段与前端 cloudUser 结构对齐，便于刷新本地登录态
 */
@Data
public class UserProfileVO {
    private Long id;
    private String username;
    private String nickname;
    private String avatarUrl;
    private String phone;
    private Integer gender;
    private LocalDate birthday;
    private Integer totalTrainDays;
    private BigDecimal totalVolumeKg;
    private LocalDateTime registerTime;
}
