package com.fitnote.modules.user;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.user.dto.UserQueryDTO;
import com.fitnote.modules.user.vo.ShareTemplateMiniVO;
import com.fitnote.modules.user.vo.UserDetailVO;
import com.fitnote.modules.user.vo.UserTrainingStatsVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/list")
    public Result<PageVO<UserDetailVO>> list(@ModelAttribute UserQueryDTO query) {
        return Result.ok(userService.page(query));
    }

    @GetMapping("/{id}")
    public Result<UserDetailVO> detail(@PathVariable Long id) {
        return Result.ok(userService.detail(id));
    }

    /** 用户画像页：训练统计图（近30天累计容量+部位分布+4大指标+备份数） */
    @GetMapping("/{id}/training-stats")
    public Result<UserTrainingStatsVO> trainingStats(@PathVariable Long id) {
        return Result.ok(userService.getUserTrainingStats(id));
    }

    /** 用户画像页：该用户分享的模板列表（分页） */
    @GetMapping("/{id}/share-templates")
    public Result<PageVO<ShareTemplateMiniVO>> shareTemplates(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "5") Integer size) {
        return Result.ok(userService.pageUserShareTemplates(id, page, size));
    }

    @PutMapping("/{id}/ban")
    public Result<?> ban(@PathVariable Long id) {
        userService.ban(id);
        return Result.ok();
    }

    @PutMapping("/{id}/unban")
    public Result<?> unban(@PathVariable Long id) {
        userService.unban(id);
        return Result.ok();
    }

    @GetMapping("/today-new")
    public Result<Long> todayNew() {
        return Result.ok(userService.countTodayNew());
    }
}
