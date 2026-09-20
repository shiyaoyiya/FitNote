package com.fitnote.modules.backup.vo;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 备份中模板的预览信息
 */
@Data
public class BackupTemplateVO {
    private String id;
    private String name;
    private String color;
    /** 模板包含的动作名称列表（按顺序） */
    private List<String> actions;
    /** 动作对应的组数映射 */
    private Map<String, Integer> actionSets;
    /** 动作数量 */
    private Integer actionCount;
}
