package com.fitnote.common;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtils {

    @Value("${fitnote.jwt.secret}")
    private String secret;

    @Value("${fitnote.jwt.expire-hours}")
    private int expireHours;

    @Value("${fitnote.jwt.refresh-grace-days}")
    private int graceDays;

    private Key key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String issue(Long id, String type, String role, String username) {
        return Jwts.builder()
                .setSubject(String.valueOf(id))
                .claim("type", type)
                .claim("role", role == null ? "" : role)
                .claim("username", username == null ? "" : username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expireHours * 3600_000L))
                .signWith(key(), SignatureAlgorithm.HS512)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody();
    }

    public boolean isRefreshable(String token) {
        try {
            parse(token);
            return true;
        } catch (ExpiredJwtException e) {
            long issuedAt = e.getClaims().getIssuedAt().getTime();
            return System.currentTimeMillis() - issuedAt < graceDays * 86400_000L;
        } catch (JwtException e) {
            return false;
        }
    }

    public Claims parseEvenExpired(String token) {
        try {
            return parse(token);
        } catch (ExpiredJwtException e) {
            return e.getClaims();
        }
    }
}
