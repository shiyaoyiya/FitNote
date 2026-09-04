package com.fitnote.security;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.entity.SysMenu;
import com.fitnote.entity.SysRoleMenu;
import com.fitnote.mapper.SysMenuMapper;
import com.fitnote.mapper.SysRoleMenuMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CustomPermissionEvaluator implements org.springframework.security.access.PermissionEvaluator {

    private final SysRoleMenuMapper roleMenuMapper;
    private final SysMenuMapper menuMapper;

    private final ThreadLocal<Set<String>> permsCache = ThreadLocal.withInitial(HashSet::new);
    private final ThreadLocal<String> roleCache = new ThreadLocal<>();

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (!(authentication.getPrincipal() instanceof DualUserPrincipal)) return false;
        DualUserPrincipal p = (DualUserPrincipal) authentication.getPrincipal();
        if (!"ADMIN".equals(p.getType())) return false;
        String role = p.getRole();
        Set<String> perms;
        if (role.equals(roleCache.get())) {
            perms = permsCache.get();
        } else {
            List<Long> menuIds = roleMenuMapper.selectList(
                    new LambdaQueryWrapper<SysRoleMenu>().eq(SysRoleMenu::getRoleCode, role)
            ).stream().map(SysRoleMenu::getMenuId).collect(Collectors.toList());
            perms = menuIds.isEmpty() ? Collections.emptySet() :
                    menuMapper.selectBatchIds(menuIds).stream()
                            .map(SysMenu::getPerms)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());
            permsCache.set(perms);
            roleCache.set(role);
        }
        return perms.contains(String.valueOf(permission));
    }

    @Override
    public boolean hasPermission(Authentication authentication, Serializable targetId, String targetType, Object permission) {
        return false;
    }
}
