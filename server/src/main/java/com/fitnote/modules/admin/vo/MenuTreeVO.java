package com.fitnote.modules.admin.vo;

import lombok.Data;

import java.util.List;

@Data
public class MenuTreeVO {
    private Long id;
    private Long parentId;
    private String name;
    private String title;
    private String path;
    private String component;
    private String icon;
    private Integer sortOrder;
    private Integer visible;
    private String perms;
    private Integer type;       // 1目录 2菜单 3按钮
    private List<MenuTreeVO> children;
}
