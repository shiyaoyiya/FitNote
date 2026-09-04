package com.fitnote.modules.admin.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.util.List;

@Data
public class SaveRoleMenuDTO {
    @NotBlank(message = "角色编码必填")
    private String roleCode;
    private List<Long> menuIds;
}
