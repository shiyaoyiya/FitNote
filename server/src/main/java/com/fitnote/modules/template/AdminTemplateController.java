package com.fitnote.modules.template;

import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.common.ResultCode;
import com.fitnote.modules.template.dto.AuditDTO;
import com.fitnote.modules.template.dto.OfficialDTO;
import com.fitnote.modules.template.service.AuditService;
import com.fitnote.modules.template.service.SharedTemplateService;
import com.fitnote.modules.template.vo.AuditTemplateVO;
import com.fitnote.security.DualUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/admin/template")
@RequiredArgsConstructor
public class AdminTemplateController {

    private final AuditService auditService;
    private final SharedTemplateService sharedTemplateService;

    @GetMapping("/audit/page")
    public Result<PageVO<AuditTemplateVO>> auditPage(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer status) {
        return Result.ok(auditService.auditPage(page, size, status));
    }

    @GetMapping("/audit/{id}")
    public Result<AuditTemplateVO> auditDetail(@PathVariable Long id) {
        return Result.ok(auditService.auditDetail(id));
    }

    @PutMapping("/audit/{id}")
    public Result<?> audit(@PathVariable Long id, @Valid @RequestBody AuditDTO dto) {
        auditService.audit(id, dto, currentUser().getId());
        return Result.ok();
    }

    @PutMapping("/square/{id}/official")
    public Result<?> setOfficial(@PathVariable Long id, @Valid @RequestBody OfficialDTO dto) {
        sharedTemplateService.setOfficial(id, dto);
        return Result.ok();
    }

    @DeleteMapping("/square/{id}")
    public Result<?> deleteSquare(@PathVariable Long id) {
        sharedTemplateService.deleteSquare(id);
        return Result.ok();
    }

    private DualUserPrincipal currentUser() {
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(p instanceof DualUserPrincipal)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return (DualUserPrincipal) p;
    }
}
