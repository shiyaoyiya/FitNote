package com.fitnote.modules.backup.dto;

import lombok.Data;

@Data
public class BackupQueryDTO {
    private Integer page = 1;
    private Integer size = 10;
    private Long userId;
    private String keyword;
}
