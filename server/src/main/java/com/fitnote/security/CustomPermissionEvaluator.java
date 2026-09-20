package com.fitnote.security;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.entity.SysAdminMenu;
import com.fitnote.entity.SysMenu;
import com.fitnote.mapper.SysAdminMenuMapper;
import com.fitnote.mapper.SysMenuMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CustomPermissionEvaluator implements org.springframework.security.access.PermissionEvaluator {

    private final SysAdminMenuMapper adminMenuMapper;
    private final SysMenuMapper menuMapper;

    private final ThreadLocal<Set<String>> permsCache = ThreadLocal.withInitial(HashSet::new);
    private final ThreadLocal<Long> adminIdCache = new ThreadLocal<>();

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (!(authentication.getPrincipal() instanceof DualUserPrincipal)) return false;
        DualUserPrincipal p = (DualUserPrincipal) authentication.getPrincipal();
        if (!"ADMIN".equals(p.getType())) return false;

        // 超级管理员拥有全部权限
        if ("ADMIN".equals(p.getRole())) return true;

        Long adminId = p.getId();
        Set<String> perms;
        if (adminId.equals(adminIdCache.get())) {
            perms = permsCache.get();
        } else {
            List<Long> menuIds = adminMenuMapper.selectList(
                    new LambdaQueryWrapper<SysAdminMenu>().eq(SysAdminMenu::getAdminId, adminId)
            ).stream().map(SysAdminMenu::getMenuId).collect(Collectors.toList());
            perms = menuIds.isEmpty() ? Collections.emptySet() :
                    menuMapper.selectBatchIds(menuIds).stream()
                            .map(SysMenu::getPerms)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());
            permsCache.set(perms);
            adminIdCache.set(adminId);
        }
        return perms.contains(String.valueOf(permission));
    }

    @Override
    public boolean hasPermission(Authentication authentication, Serializable targetId, String targetType, Object permission) {
        return false;
    }
}
