package com.fitnote.modules.template.service;

import com.fitnote.common.PageVO;
import com.fitnote.modules.template.dto.ShareTemplateDTO;
import com.fitnote.modules.template.dto.SquarePageQuery;
import com.fitnote.modules.template.vo.MyTemplateVO;

public interface UserTemplateService {
    Long share(ShareTemplateDTO dto, Long userId);

    void resubmit(Long id, Long userId);

    void collect(Long id, Long userId);

    void uncollect(Long id, Long userId);

    PageVO<MyTemplateVO> mine(Long userId, SquarePageQuery query);
}
