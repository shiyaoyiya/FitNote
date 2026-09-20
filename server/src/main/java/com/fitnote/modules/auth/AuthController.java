package com.fitnote.modules.auth;

import com.fitnote.common.Result;
import com.fitnote.modules.auth.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/user/register")
    public Result<UserLoginVO> userRegister(@Valid @RequestBody RegisterDTO dto) {
        return Result.ok(authService.register(dto));
    }

    @PostMapping("/user/login")
    public Result<UserLoginVO> userLogin(@Valid @RequestBody UserLoginDTO dto) {
        return Result.ok(authService.userLogin(dto));
    }

    @PostMapping("/admin/login")
    public Result<AdminLoginVO> adminLogin(@Valid @RequestBody AdminLoginDTO dto) {
        return Result.ok(authService.adminLogin(dto));
    }

    @PostMapping("/refresh")
    public Result<TokenRefreshVO> refresh(HttpServletRequest request) {
        return Result.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public Result<?> logout() {
        // 无状态 JWT 模式：前端清除本地 Token 即可
        return Result.ok();
    }

    @PostMapping("/wechat/login")
    public Result<UserLoginVO> wechatLogin(@Valid @RequestBody WechatLoginDTO dto) {
        return Result.ok(authService.wechatLogin(dto));
    }

    @PostMapping("/wechat/bind-account")
    public Result<Void> bindAccount(@Valid @RequestBody WechatBindAccountDTO dto) {
        authService.bindWechatAccount(dto);
        return Result.ok();
    }
}
