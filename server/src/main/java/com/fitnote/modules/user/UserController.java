package com.fitnote.modules.user;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.user.dto.UserQueryDTO;
import com.fitnote.modules.user.vo.UserDetailVO;
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
