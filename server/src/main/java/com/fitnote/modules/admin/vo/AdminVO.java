package com.fitnote.modules.admin.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminVO {
    private Long id;
    private String username;
    private String nickname;
    private String roleCode;
    private String roleText;
    private Integer status;
    private LocalDateTime lastLoginTime;
    private LocalDateTime createTime;
}
