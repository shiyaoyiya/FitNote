package com.fitnote.modules.template.service;

import com.fitnote.common.PageVO;
import com.fitnote.modules.template.dto.OfficialDTO;
import com.fitnote.modules.template.dto.SquarePageQuery;
import com.fitnote.modules.template.vo.SquareTemplateVO;
import com.fitnote.modules.template.vo.TagVO;
import com.fitnote.modules.template.vo.TemplateDetailVO;

import java.util.List;

public interface SharedTemplateService {
    PageVO<SquareTemplateVO> page(SquarePageQuery query);

    TemplateDetailVO detail(Long id, Long currentUserId, boolean isAdmin);

    String download(Long id);

    List<TagVO> tagList();

    void setOfficial(Long id, OfficialDTO dto);

    void deleteSquare(Long id);
}
