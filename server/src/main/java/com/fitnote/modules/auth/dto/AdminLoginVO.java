package com.fitnote.modules.auth.dto;
import lombok.AllArgsConstructor; import lombok.Data;
import java.util.List; import java.util.Map;
@Data @AllArgsConstructor
public class AdminLoginVO {
    private String token;
    private Long expiresIn;
    private Map<String, Object> admin; // {id, username, nickname, role}
    private List<Map<String, Object>> menus; // 扁平菜单列表（前端递归组装树）
}
