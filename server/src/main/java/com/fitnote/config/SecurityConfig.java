package com.fitnote.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnote.common.Result;
import com.fitnote.common.ResultCode;
import com.fitnote.security.CustomPermissionEvaluator;
import com.fitnote.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CustomPermissionEvaluator permissionEvaluator;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public MethodSecurityExpressionHandler methodSecurityExpressionHandler() {
        DefaultMethodSecurityExpressionHandler h = new DefaultMethodSecurityExpressionHandler();
        h.setPermissionEvaluator(permissionEvaluator);
        return h;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf().disable().cors().and()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS);

        http.authorizeRequests()
            .antMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .antMatchers("/api/auth/**").permitAll()
            .antMatchers(HttpMethod.GET,
                "/api/template/square/**",
                "/api/template/tag/list",
                "/api/announce/list",
                "/api/announce/*",
                "/api/preset/list",
                "/api/preset/*",
                "/avatars/**").permitAll()
            // ADMIN + AUDITOR 共用：模板审核 / 反馈管理（必须放在 /api/admin/** 之前）
            .antMatchers("/api/admin/template/audit/**", "/api/admin/feedback/**").hasAnyRole("ADMIN", "AUDITOR")
            // ADMIN 专属：dashboard / 管理用户 / 全局备份 / 预设 / 公告 / 模板广场管理 / 管理员体系
            .antMatchers(
                "/api/dashboard/**",
                "/api/admin/user/**",
                "/api/admin/backup/**",
                "/api/admin/preset/**",
                "/api/admin/announce/**",
                "/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated();

        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        http.exceptionHandling()
            .authenticationEntryPoint((req, res, e) -> {
                res.setStatus(401);
                res.setContentType("application/json;charset=UTF-8");
                String msg = req.getAttribute("jwt_expired") != null ? "TOKEN_EXPIRED" : "UNAUTHORIZED";
                res.getWriter().write(objectMapper.writeValueAsString(Result.fail(ResultCode.UNAUTHORIZED, msg)));
            })
            .accessDeniedHandler((req, res, e) -> {
                res.setStatus(403);
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write(objectMapper.writeValueAsString(Result.fail(ResultCode.FORBIDDEN)));
            });

        return http.build();
    }
}
