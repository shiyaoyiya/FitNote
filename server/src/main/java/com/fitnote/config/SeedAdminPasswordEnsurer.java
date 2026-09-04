package com.fitnote.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.entity.SysAdmin;
import com.fitnote.mapper.SysAdminMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 启动时兜底：确保 data.sql 写入的默认 admin / auditor 密码一定是明文 admin123 / auditor123
 * （避免不同 BCrypt 工具链生成的 hash 互相不匹配，导致门禁时始终报「账号或密码错误」）
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SeedAdminPasswordEnsurer implements ApplicationRunner {

    private final SysAdminMapper adminMapper;
    private final PasswordEncoder encoder;

    private static final Object[][] SEEDS = new Object[][]{
            {"admin",   "admin123"},
            {"auditor", "auditor123"}
    };

    @Override
    public void run(ApplicationArguments args) {
        for (Object[] seed : SEEDS) {
            String username = (String) seed[0];
            String rawPw    = (String) seed[1];
            SysAdmin a = adminMapper.selectOne(new LambdaQueryWrapper<SysAdmin>().eq(SysAdmin::getUsername, username));
            if (a == null) {
                log.warn("[SeedPw] admin '{}' not found in DB, skip ensure password.", username);
                continue;
            }
            if (!encoder.matches(rawPw, a.getPassword())) {
                String newHash = encoder.encode(rawPw);
                a.setPassword(newHash);
                adminMapper.updateById(a);
                log.info("[SeedPw] Re-hashed password for admin='{}' with runtime PasswordEncoder.", username);
            } else {
                log.info("[SeedPw] admin='{}' password hash already matches, no-op.", username);
            }
        }
    }
}
