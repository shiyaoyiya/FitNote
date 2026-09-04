package com.fitnote.modules.feedback;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.feedback.dto.SubmitFeedbackDTO;
import com.fitnote.modules.feedback.vo.FeedbackVO;
import com.fitnote.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/** 小程序端 USER 接口（需要登录） */
@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping("/submit")
    public Result<Long> submit(@Valid @RequestBody SubmitFeedbackDTO dto) {
        return Result.ok(feedbackService.submit(dto, SecurityUtils.getUserIdOrThrow()));
    }

    @GetMapping("/mine")
    public Result<PageVO<FeedbackVO>> mine(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return Result.ok(feedbackService.myFeedback(SecurityUtils.getUserIdOrThrow(), page, size));
    }
}
