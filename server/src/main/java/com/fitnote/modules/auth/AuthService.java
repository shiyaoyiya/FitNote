package com.fitnote.modules.auth;

import com.fitnote.modules.auth.dto.*;

import jakarta.servlet.http.HttpServletRequest;

public interface AuthService {
    UserLoginVO register(RegisterDTO dto);
    UserLoginVO userLogin(UserLoginDTO dto);
    AdminLoginVO adminLogin(AdminLoginDTO dto);
    TokenRefreshVO refresh(HttpServletRequest req);
    UserLoginVO wechatLogin(WechatLoginDTO dto);
    void bindWechatAccount(WechatBindAccountDTO dto);
}
