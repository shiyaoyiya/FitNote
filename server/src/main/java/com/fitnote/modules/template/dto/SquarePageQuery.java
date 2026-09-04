package com.fitnote.modules.template.dto;

import lombok.Data;

@Data
public class SquarePageQuery {
    private Integer page = 1;
    private Integer size = 10;
    private String keyword;
    private Long tagId;
    private String sort; // hot / latest
}
