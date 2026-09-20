package com.fitnote.modules.auth.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class WechatLoginDTO {
    @NotBlank(message = "code 不能为空")
    private String code;
    private String nickname;
    private String avatarUrl;
}
