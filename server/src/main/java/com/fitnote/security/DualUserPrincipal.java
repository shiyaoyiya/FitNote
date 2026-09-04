package com.fitnote.security;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DualUserPrincipal {
    private Long id;
    private String type;     // "USER" | "ADMIN"
    private String role;     // ADMIN 时 "ADMIN"/"AUDITOR"；USER 时 ""
    private String username;
}
