package com.fitnote.modules.auth.dto;
import lombok.AllArgsConstructor; import lombok.Data;
@Data @AllArgsConstructor
public class TokenRefreshVO { private String token; private Long expiresIn; }
