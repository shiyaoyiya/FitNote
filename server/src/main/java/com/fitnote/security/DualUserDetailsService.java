package com.fitnote.security;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.entity.SysAdmin;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.SysAdminMapper;
import com.fitnote.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DualUserDetailsService implements UserDetailsService {

    private final SysUserMapper userMapper;
    private final SysAdminMapper adminMapper;

    @Override
    public UserDetails loadUserByUsername(String key) throws UsernameNotFoundException {
        int colon = key.indexOf(':');
        if (colon <= 0) throw new UsernameNotFoundException("非法格式");
        String type = key.substring(0, colon);
        Long id = Long.valueOf(key.substring(colon + 1));
        if ("USER".equals(type)) {
            SysUser u = userMapper.selectById(id);
            if (u == null || u.getStatus() != 1) throw new UsernameNotFoundException("用户不存在或被封禁");
            return User.withUsername(key)
                    .password(u.getPassword())
                    .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
                    .build();
        } else {
            SysAdmin a = adminMapper.selectById(id);
            if (a == null || a.getStatus() != 1) throw new UsernameNotFoundException("管理员不存在或被停用");
            List<GrantedAuthority> auths = new ArrayList<>();
            // 严格按 roleCode 授权：ADMIN→ROLE_ADMIN，AUDITOR→ROLE_AUDITOR（不再无条件授予 ROLE_ADMIN，避免越权）
            auths.add(new SimpleGrantedAuthority("ROLE_" + a.getRoleCode()));
            return User.withUsername(key)
                    .password(a.getPassword())
                    .authorities(auths)
                    .build();
        }
    }

    public SysUser loadUserByUsernameOnly(String username) {
        return userMapper.selectOne(new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, username));
    }

    public SysAdmin loadAdminByUsernameOnly(String username) {
        return adminMapper.selectOne(new LambdaQueryWrapper<SysAdmin>().eq(SysAdmin::getUsername, username));
    }
}
