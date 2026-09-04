package com.fitnote.modules.preset.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class PresetSaveDTO {
    private Long id;
    @NotBlank(message = "名称必填")
    @Size(max = 100, message = "名称不超过100字")
    private String name;
    private String description;
    private String coverColor;
    /** 1简单 2中 3难 */
    private Integer difficulty;
    @NotBlank(message = "模板清单必填")
    private String templateData;
    private Integer enabled;
    private Integer sortOrder;
}
