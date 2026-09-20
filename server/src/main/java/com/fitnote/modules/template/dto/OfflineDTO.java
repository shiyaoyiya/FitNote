package com.fitnote.modules.template.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 模板广场下架（强制下架）请求参数。
 * 与审核 DTO 区分：审核作用于待审核（status=0）模板，下架作用于已上架（status=1）模板。
 */
@Data
public class OfflineDTO {
    /** 下架原因，必填且不少于 10 字（写入 shared_template.reject_reason） */
    @NotBlank(message = "下架原因必填")
    @Size(min = 10, max = 500, message = "下架原因不少于10字且不超过500字")
    private String rejectReason;
}
