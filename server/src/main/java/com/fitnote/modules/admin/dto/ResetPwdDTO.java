package com.fitnote.modules.admin.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class ResetPwdDTO {
    @NotBlank(message = "新密码必填")
    @Size(min = 6, max = 32, message = "密码长度 6~32")
    private String newPassword;
}
