package com.fitnote.modules.template.dto;

import lombok.Data;

import javax.validation.constraints.AssertTrue;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

@Data
public class AuditDTO {
    @NotNull(message = "审核状态必填")
    @Min(value = 1, message = "审核状态值非法")
    @Max(value = 2, message = "审核状态值非法")
    private Integer status;

    private String rejectReason;

    @AssertTrue(message = "驳回原因必填且不少于10字")
    public boolean isRejectReasonValid() {
        if (status == null) return true; // 交给 @NotNull 处理
        if (status == 2) {
            return rejectReason != null && rejectReason.trim().length() >= 10;
        }
        return true;
    }
}
