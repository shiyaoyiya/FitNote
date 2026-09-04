package com.fitnote.modules.feedback;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.feedback.dto.FeedbackPageQuery;
import com.fitnote.modules.feedback.dto.HandleFeedbackDTO;
import com.fitnote.modules.feedback.vo.FeedbackVO;
import com.fitnote.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/** 管理端接口（ADMIN / AUDITOR 共用） */
@RestController
@RequestMapping("/api/admin/feedback")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final FeedbackService feedbackService;

    @GetMapping("/page")
    @PreAuthorize("hasPermission('', 'feedback:list')")
    public Result<PageVO<FeedbackVO>> page(@ModelAttribute FeedbackPageQuery query) {
        return Result.ok(feedbackService.adminPage(query));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasPermission('', 'feedback:list')")
    public Result<FeedbackVO> detail(@PathVariable Long id) {
        return Result.ok(feedbackService.detail(id, SecurityUtils.getAdminIdOrThrow()));
    }

    @PutMapping("/{id}/handle")
    @PreAuthorize("hasPermission('', 'feedback:handle')")
    public Result<?> handle(@PathVariable Long id, @Valid @RequestBody HandleFeedbackDTO dto) {
        feedbackService.handle(id, dto, SecurityUtils.getAdminIdOrThrow());
        return Result.ok();
    }
}
