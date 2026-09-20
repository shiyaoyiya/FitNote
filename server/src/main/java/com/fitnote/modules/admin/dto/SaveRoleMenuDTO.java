package com.fitnote.modules.admin.dto;

import lombok.Data;

import jakarta.validation.constraints.NotNull;
import java.util.List;

@Data
public class SaveRoleMenuDTO {
    @NotNull(message = "管理员ID必填")
    private Long adminId;
    private List<Long> menuIds;
}
