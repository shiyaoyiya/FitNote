package com.fitnote.modules.template;

import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.common.ResultCode;
import com.fitnote.modules.template.dto.ShareTemplateDTO;
import com.fitnote.modules.template.dto.SquarePageQuery;
import com.fitnote.modules.template.service.UserTemplateService;
import com.fitnote.modules.template.vo.MyTemplateVO;
import com.fitnote.security.DualUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/template")
@RequiredArgsConstructor
public class UserTemplateController {

    private final UserTemplateService userTemplateService;

    @PostMapping("/share")
    public Result<Long> share(@Valid @RequestBody ShareTemplateDTO dto) {
        return Result.ok(userTemplateService.share(dto, currentUser().getId()));
    }

    @PutMapping("/share/{id}/resubmit")
    public Result<?> resubmit(@PathVariable Long id) {
        userTemplateService.resubmit(id, currentUser().getId());
        return Result.ok();
    }

    @PostMapping("/collect/{id}")
    public Result<?> collect(@PathVariable Long id) {
        userTemplateService.collect(id, currentUser().getId());
        return Result.ok();
    }

    @DeleteMapping("/collect/{id}")
    public Result<?> uncollect(@PathVariable Long id) {
        userTemplateService.uncollect(id, currentUser().getId());
        return Result.ok();
    }

    @GetMapping("/mine/page")
    public Result<PageVO<MyTemplateVO>> mine(@ModelAttribute SquarePageQuery query) {
        return Result.ok(userTemplateService.mine(currentUser().getId(), query));
    }

    private DualUserPrincipal currentUser() {
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(p instanceof DualUserPrincipal)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return (DualUserPrincipal) p;
    }
}
