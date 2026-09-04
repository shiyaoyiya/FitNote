package com.fitnote.modules.admin.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class AdminSaveDTO {
    private Long id;
    @NotBlank(message = "用户名必填")
    @Size(max = 32, message = "用户名不超过32字符")
    private String username;
    /** 新增时必填，编辑时忽略 */
    private String password;
    @NotBlank(message = "昵称必填")
    private String nickname;
    @NotBlank(message = "角色必填")
    private String roleCode;   // ADMIN / AUDITOR
    private Integer status;    // 1启用 0停用
}
