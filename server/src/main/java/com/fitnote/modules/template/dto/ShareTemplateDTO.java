package com.fitnote.modules.template.dto;

import lombok.Data;

import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.util.List;

@Data
public class ShareTemplateDTO {
    @NotBlank(message = "名称必填")
    @Size(max = 50, message = "名称不超过50字")
    private String name;
    @NotBlank(message = "描述必填")
    @Size(min = 20, max = 500, message = "描述不少于20字、不超过500字")
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
