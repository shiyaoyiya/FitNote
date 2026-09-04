package com.fitnote.modules.template;

import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.common.ResultCode;
import com.fitnote.modules.template.dto.SquarePageQuery;
import com.fitnote.modules.template.service.SharedTemplateService;
import com.fitnote.modules.template.vo.SquareTemplateVO;
import com.fitnote.modules.template.vo.TagVO;
import com.fitnote.modules.template.vo.TemplateDetailVO;
import com.fitnote.security.DualUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/template")
@RequiredArgsConstructor
public class TemplateSquareController {

    private final SharedTemplateService sharedTemplateService;

    @GetMapping("/square/page")
    public Result<PageVO<SquareTemplateVO>> page(@ModelAttribute SquarePageQuery query) {
        return Result.ok(sharedTemplateService.page(query));
    }

    @GetMapping("/square/{id}")
    public Result<TemplateDetailVO> detail(@PathVariable Long id) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long currentUserId = null;
        boolean isAdmin = false;
        if (principal instanceof DualUserPrincipal) {
            DualUserPrincipal p = (DualUserPrincipal) principal;
            currentUserId = p.getId();
            isAdmin = "ADMIN".equals(p.getType());
        }
        return Result.ok(sharedTemplateService.detail(id, currentUserId, isAdmin));
    }

    @GetMapping("/tag/list")
    public Result<List<TagVO>> tagList() {
        return Result.ok(sharedTemplateService.tagList());
    }

    @GetMapping("/square/{id}/download")
    public Result<String> download(@PathVariable Long id) {
        // 公开 GET 受 permitAll，需手动校验登录态
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof DualUserPrincipal)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录后再下载");
        }
        return Result.ok(sharedTemplateService.download(id));
    }
}
