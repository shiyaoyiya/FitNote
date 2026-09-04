package com.fitnote.modules.template.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
public class MyTemplateVO extends SquareTemplateVO {
    private Integer status;
    private String rejectReason;
    private LocalDateTime auditTime;
}
