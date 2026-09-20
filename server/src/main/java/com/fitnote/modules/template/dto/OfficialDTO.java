package com.fitnote.modules.template.dto;

import lombok.Data;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Data
public class OfficialDTO {
    @NotNull(message = "官方标识必填")
    @Min(value = 0, message = "官方标识值非法")
    @Max(value = 1, message = "官方标识值非法")
    private Integer isOfficial;

    @NotNull(message = "排序权重必填")
    private Integer sortWeight;
}
