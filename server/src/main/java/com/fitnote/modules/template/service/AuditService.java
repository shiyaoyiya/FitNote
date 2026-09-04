package com.fitnote.modules.template.service;

import com.fitnote.common.PageVO;
import com.fitnote.modules.template.dto.AuditDTO;
import com.fitnote.modules.template.vo.AuditTemplateVO;

public interface AuditService {
    PageVO<AuditTemplateVO> auditPage(Integer page, Integer size, Integer status);

    AuditTemplateVO auditDetail(Long id);

    void audit(Long id, AuditDTO dto, Long adminId);
}
