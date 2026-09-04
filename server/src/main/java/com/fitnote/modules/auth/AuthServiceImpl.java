package com.fitnote.modules.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.common.BusinessException;
import com.fitnote.common.JwtUtils;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.SysAdmin;
import com.fitnote.entity.SysMenu;
import com.fitnote.entity.SysRoleMenu;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.SysAdminMapper;
import com.fitnote.mapper.SysMenuMapper;
import com.fitnote.mapper.SysRoleMenuMapper;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.auth.dto.*;
import com.fitnote.security.DualUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper userMapper;
    private final SysAdminMapper adminMapper;
    private final SysMenuMapper menuMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;

    @Value("${fitnote.jwt.expire-hours}")
    private int expireHours;

    @Override
    @Transactional
    public UserLoginVO register(RegisterDTO dto) {
        // 用户名唯一
        Long cnt = userMapper.selectCount(new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, dto.getUsername()));
        if (cnt != null && cnt > 0) throw new BusinessException(ResultCode.CONFLICT, "用户名已存在");
        if (dto.getPhone() != null && !dto.getPhone().isEmpty()) {
            Long pcnt = userMapper.selectCount(new LambdaQueryWrapper<SysUser>().eq(SysUser::getPhone, dto.getPhone()));
            if (pcnt != null && pcnt > 0) throw new BusinessException(ResultCode.CONFLICT, "手机号已绑定");
        }
        SysUser u = new SysUser();
        u.setUsername(dto.getUsername());
        u.setPassword(encoder.encode(dto.getPassword()));
        u.setNickname(dto.getNickname() == null || dto.getNickname().isEmpty() ? dto.getUsername() : dto.getNickname());
        u.setPhone(dto.getPhone());
        u.setStatus(1);
        u.setGender(0);
        u.setTotalTrainDays(0);
        u.setTotalVolumeKg(BigDecimal.ZERO);
        u.setRegisterTime(LocalDateTime.now());
        u.setLastLoginTime(LocalDateTime.now());
        u.setLastActiveTime(LocalDateTime.now());
        userMapper.insert(u);

        String token = jwtUtils.issue(u.getId(), "USER", null, u.getUsername());
        Map<String, Object> user = buildUserMap(u);
        return new UserLoginVO(token, expireHours * 3600L, user);
    }

    @Override
    public UserLoginVO userLogin(UserLoginDTO dto) {
        SysUser u = userMapper.selectOne(new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, dto.getUsername()));
        if (u == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误");
        if (u.getStatus() != 1) throw new BusinessException(ResultCode.FORBIDDEN, "账号已被封禁");
        if (!encoder.matches(dto.getPassword(), u.getPassword())) throw new BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误");
        u.setLastLoginTime(LocalDateTime.now());
        u.setLastActiveTime(LocalDateTime.now());
        userMapper.updateById(u);
        String token = jwtUtils.issue(u.getId(), "USER", null, u.getUsername());
        return new UserLoginVO(token, expireHours * 3600L, buildUserMap(u));
    }

    @Override
    public AdminLoginVO adminLogin(AdminLoginDTO dto) {
        SysAdmin a = adminMapper.selectOne(new LambdaQueryWrapper<SysAdmin>().eq(SysAdmin::getUsername, dto.getUsername()));
        if (a == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "账号或密码错误");
        if (a.getStatus() != 1) throw new BusinessException(ResultCode.FORBIDDEN, "账号已被停用");
        if (!encoder.matches(dto.getPassword(), a.getPassword())) throw new BusinessException(ResultCode.UNAUTHORIZED, "账号或密码错误");
        a.setLastLoginTime(LocalDateTime.now());
        adminMapper.updateById(a);

        String token = jwtUtils.issue(a.getId(), "ADMIN", a.getRoleCode(), a.getUsername());
        Map<String, Object> admin = new HashMap<>();
        admin.put("id", a.getId());
        admin.put("username", a.getUsername());
        admin.put("nickname", a.getNickname());
        admin.put("role", a.getRoleCode());

        List<Map<String, Object>> menus = loadMenusForRole(a.getRoleCode());

        return new AdminLoginVO(token, expireHours * 3600L, admin, menus);
    }

    @Override
    public TokenRefreshVO refresh(HttpServletRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        // Filter 过期 Token 没有写入 SecurityContext，所以需要手动读 header
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) throw new BusinessException(ResultCode.UNAUTHORIZED);
        String token = header.substring(7);
        if (!jwtUtils.isRefreshable(token)) throw new BusinessException(ResultCode.UNAUTHORIZED, "REFRESH_GRACE_EXCEEDED");
        io.jsonwebtoken.Claims c = jwtUtils.parseEvenExpired(token);
        Long id = Long.valueOf(c.getSubject());
        String type = c.get("type", String.class);
        String role = c.get("role", String.class);
        String username = c.get("username", String.class);
        // 再校验账号是否仍正常
        if ("USER".equals(type)) {
            SysUser u = userMapper.selectById(id);
            if (u == null || u.getStatus() != 1) throw new BusinessException(ResultCode.FORBIDDEN);
            u.setLastActiveTime(LocalDateTime.now());
            userMapper.updateById(u);
        } else {
            SysAdmin a = adminMapper.selectById(id);
            if (a == null || a.getStatus() != 1) throw new BusinessException(ResultCode.FORBIDDEN);
            a.setLastLoginTime(LocalDateTime.now());
            adminMapper.updateById(a);
        }
        String newTk = jwtUtils.issue(id, type, role, username);
        return new TokenRefreshVO(newTk, expireHours * 3600L);
    }

    // ========= 工具方法 =========
    private Map<String, Object> buildUserMap(SysUser u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("nickname", u.getNickname());
        m.put("avatarUrl", u.getAvatarUrl());
        m.put("totalTrainDays", u.getTotalTrainDays());
        m.put("totalVolumeKg", u.getTotalVolumeKg());
        return m;
    }

    // 按 roleCode 查 sys_role_menu → 批量 sys_menu → 扁平列表
    private List<Map<String, Object>> loadMenusForRole(String roleCode) {
        List<Long> menuIds = roleMenuMapper.selectList(
                new LambdaQueryWrapper<SysRoleMenu>().eq(SysRoleMenu::getRoleCode, roleCode)
        ).stream().map(SysRoleMenu::getMenuId).collect(Collectors.toList());
        if (menuIds.isEmpty()) return Collections.emptyList();
        List<SysMenu> list = menuMapper.selectBatchIds(menuIds);
        // 按 sort_order, id 排序
        list.sort(Comparator.comparing(SysMenu::getSortOrder).thenComparing(SysMenu::getId));
        return list.stream().map(m -> {
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
    }
}
