package com.fitnote.modules.auth.dto;
import lombok.AllArgsConstructor; import lombok.Data;
import java.util.Map;
@Data @AllArgsConstructor
public class UserLoginVO {
    private String token;
    private Long expiresIn;
    private Map<String, Object> user; // {id, username, nickname, avatarUrl, totalTrainDays, totalVolumeKg}
}
