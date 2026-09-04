package com.fitnote.modules.template.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class TemplateDetailVO extends SquareTemplateVO {
    private String templateData;
    private String rejectReason;
}
