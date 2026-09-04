package com.fitnote.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("template_tag_rel")
public class TemplateTagRel {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long templateId;
    private Long tagId;
}
