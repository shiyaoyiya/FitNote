package com.fitnote.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnote.common.JwtUtils;
import com.fitnote.common.Result;
import com.fitnote.common.ResultCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final DualUserDetailsService userDetailsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims c = jwtUtils.parse(token);
                Long id = Long.valueOf(c.getSubject());
                String type = c.get("type", String.class);
                String role = c.get("role", String.class);
                String username = c.get("username", String.class);
                UserDetails ud = userDetailsService.loadUserByUsername(type + ":" + id);
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                new DualUserPrincipal(id, type, role, username),
                                null,
                                ud.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (ExpiredJwtException e) {
                req.setAttribute("jwt_expired", true);
            } catch (JwtException e) {
                req.setAttribute("jwt_invalid", true);
            }
        }
        chain.doFilter(req, res);
    }
}
