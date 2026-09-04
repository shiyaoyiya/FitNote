package com.fitnote.modules.user.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class UserDetailVO {
    private Long id;
    private String username;
    private String nickname;
    private String avatarUrl;
    private String phone;
    private Integer gender;
    private LocalDate birthday;
    private Integer status;
    private Integer totalTrainDays;
    private BigDecimal totalVolumeKg;
    private LocalDateTime lastLoginTime;
    private LocalDateTime lastActiveTime;
    private LocalDateTime registerTime;
}
