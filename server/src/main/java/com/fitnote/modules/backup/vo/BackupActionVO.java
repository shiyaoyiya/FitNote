package com.fitnote.modules.backup.vo;

import lombok.Data;

import java.util.List;

/**
 * 备份中动作 VO
 */
@Data
public class BackupActionVO {
    private String id;
    private String name;
    private List<String> categories;
    private String categoryName;
}
