package com.fitnote.modules.template.dto;

import lombok.Data;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

@Data
public class ShareTemplateDTO {
    @NotBlank(message = "名称必填")
    @Size(max = 50, message = "名称不超过50字")
    private String name;
    @NotBlank(message = "描述必填")
    @Size(max = 2000, message = "描述不超过2000字")
    private String description;
    @NotBlank(message = "封面色必填")
    private String coverColor;
    @NotNull(message = "动作数必填")
    @Min(value = 1, message = "动作数至少为1")
    private Integer actionCount;
    @NotNull(message = "总组数必填")
    @Min(value = 1, message = "总组数至少为1")
    private Integer totalSets;
    @NotBlank(message = "模板数据必填")
    private String templateData;
    private List<Long> tagIds;
}
