package com.fitnote.modules.auth.dto;

import lombok.Data;
import javax.validation.constraints.AssertTrue;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class RegisterDTO {
    @NotBlank(message = "用户名必填")
    @Size(min = 3, max = 30, message = "用户名 3-30 字符")
    private String username;
    @NotBlank(message = "密码必填")
    @Size(min = 6, max = 30, message = "密码 6-30 字符")
    private String password;
    @NotBlank(message = "确认密码必填")
    private String confirmPassword;
    private String nickname;
    private String phone;
    @AssertTrue(message = "两次密码不一致")
    public boolean isMatch() {
        return password != null && password.equals(confirmPassword);
    }
}
