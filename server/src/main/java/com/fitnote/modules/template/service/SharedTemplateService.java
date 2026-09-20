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

    /**
     * 强制下架已上架模板（status=1 → status=2）。
     * 与审核接口区别：审核作用于 status=0 待审核模板，下架作用于 status=1 已上架模板。
     *
     * @param id           模板 ID
     * @param rejectReason 下架原因（不少于 10 字）
     * @param adminId      操作管理员 ID
     */
    void offline(Long id, String rejectReason, Long adminId);
}
