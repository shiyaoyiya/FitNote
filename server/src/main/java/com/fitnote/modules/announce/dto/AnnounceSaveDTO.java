package com.fitnote.modules.announce.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class AnnounceSaveDTO {
    private Long id;
    @NotBlank(message = "标题必填")
    @Size(max = 200, message = "标题不超过200字")
    private String title;
    @NotBlank(message = "内容必填")
    private String content;
    /** 1系统 2活动 3版本 */
    private Integer type;
    /** 1置顶 0普通 */
    private Integer priority;
    /** 0草稿 1立即发布（保存时选择）*/
    private Integer action;
}
