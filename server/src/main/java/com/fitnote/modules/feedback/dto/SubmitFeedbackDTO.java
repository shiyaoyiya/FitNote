package com.fitnote.modules.feedback.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class SubmitFeedbackDTO {
    @NotNull(message = "分类必填")
    private Integer category;    // 1建议 2Bug 3数据 4其他
    @NotBlank(message = "标题必填")
    @Size(max = 200, message = "标题不超过200字")
    private String title;
    @NotBlank(message = "描述必填")
    @Size(min = 10, message = "描述不少于10字")
    private String content;
    private String screenshotUrls; // 逗号分隔
}
