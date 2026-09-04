package com.fitnote.modules.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.common.BusinessException;
import com.fitnote.common.Result;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.SysAdmin;
import com.fitnote.entity.SysMenu;
import com.fitnote.entity.SysRoleMenu;
import com.fitnote.mapper.SysAdminMapper;
import com.fitnote.mapper.SysMenuMapper;
import com.fitnote.mapper.SysRoleMenuMapper;
import com.fitnote.security.DualUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 管理端通用接口：拉取当前登录管理员信息 / 按角色加载菜单树。
 * admin-web 登录后、页面刷新（从 localStorage 恢复 Token）时都需要调用这两个接口。
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminIndexController {

    private final SysAdminMapper adminMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final SysMenuMapper menuMapper;

    @GetMapping("/me")
    public Result<Map<String, Object>> me() {
        DualUserPrincipal p = currentPrincipal();
        SysAdmin a = adminMapper.selectById(p.getId());
        if (a == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "账号不存在");
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId());
        m.put("username", a.getUsername());
        m.put("nickname", a.getNickname());
        m.put("role", a.getRoleCode());
        return Result.ok(m);
    }

    @GetMapping("/menu")
    public Result<List<Map<String, Object>>> menu() {
        DualUserPrincipal p = currentPrincipal();
        SysAdmin a = adminMapper.selectById(p.getId());
        if (a == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "账号不存在");
        List<Long> menuIds = roleMenuMapper.selectList(
                new LambdaQueryWrapper<SysRoleMenu>().eq(SysRoleMenu::getRoleCode, a.getRoleCode())
        ).stream().map(SysRoleMenu::getMenuId).collect(Collectors.toList());
        if (menuIds.isEmpty()) return Result.ok(Collections.emptyList());
        List<SysMenu> list = menuMapper.selectBatchIds(menuIds);
        list.sort(Comparator.comparing(SysMenu::getSortOrder).thenComparing(SysMenu::getId));
        List<Map<String, Object>> rows = list.stream().map(m -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", m.getId());
            row.put("parent_id", m.getParentId());
            row.put("name", m.getName());
            row.put("path", m.getPath());
            row.put("component", m.getComponent());
            row.put("title", m.getTitle());
            row.put("icon", m.getIcon());
            row.put("sort_order", m.getSortOrder());
            row.put("visible", m.getVisible());
            row.put("perms", m.getPerms());
            row.put("type", m.getType());
            return row;
        }).collect(Collectors.toList());
        return Result.ok(rows);
    }

    private DualUserPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof DualUserPrincipal)) {
            throw new com.fitnote.common.BusinessException(com.fitnote.common.ResultCode.UNAUTHORIZED);
        }
        DualUserPrincipal p = (DualUserPrincipal) auth.getPrincipal();
        if (!"ADMIN".equals(p.getType())) {
            throw new com.fitnote.common.BusinessException(com.fitnote.common.ResultCode.FORBIDDEN, "非管理员 Token 禁止访问");
        }
        return p;
    }
}
