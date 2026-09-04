package com.fitnote.modules.user.dto;

import lombok.Data;

@Data
public class UserQueryDTO {
    private Integer page = 1;
    private Integer size = 10;
    private String keyword;
    private Integer status;
}
