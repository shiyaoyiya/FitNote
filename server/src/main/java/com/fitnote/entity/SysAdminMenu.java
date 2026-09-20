package com.fitnote.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_admin_menu")
public class SysAdminMenu {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long adminId;
    private Long menuId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
