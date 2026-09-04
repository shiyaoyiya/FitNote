package com.fitnote.modules.feedback.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class HandleFeedbackDTO {
    @NotNull(message = "目标状态必填")
    private Integer toStatus;      // 1处理中 2已解决 3已拒绝
    @NotBlank(message = "处理回复必填")
    @Size(min = 5, message = "回复不少于5字")
    private String reply;
}
