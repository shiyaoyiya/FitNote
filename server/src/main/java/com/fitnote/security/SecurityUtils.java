package com.fitnote.security;

import com.fitnote.common.BusinessException;
import com.fitnote.common.ResultCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {
    private SecurityUtils() {}

    public static DualUserPrincipal getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof DualUserPrincipal)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return (DualUserPrincipal) auth.getPrincipal();
    }

    /** 仅在当前确有上下文且允许匿名时使用，缺失返回 null */
    public static DualUserPrincipal getCurrentUserNullable() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof DualUserPrincipal)) {
            return null;
        }
        return (DualUserPrincipal) auth.getPrincipal();
    }

    public static Long getAdminIdOrThrow() {
        DualUserPrincipal p = getCurrentUser();
        if (!"ADMIN".equals(p.getType())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅管理员可操作");
        }
        return p.getId();
    }

    public static Long getUserIdOrThrow() {
        DualUserPrincipal p = getCurrentUser();
        if (!"USER".equals(p.getType())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅注册用户可操作");
        }
        return p.getId();
    }
}
