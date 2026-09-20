package com.fitnote.modules.auth.dto;
import lombok.Data;
import jakarta.validation.constraints.NotBlank;
@Data
public class AdminLoginDTO {
    @NotBlank private String username;
    @NotBlank private String password;
}
