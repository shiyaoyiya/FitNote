package com.fitnote.modules.template.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.SharedTemplate;
import com.fitnote.mapper.SharedTemplateMapper;
import com.fitnote.modules.template.dto.AuditDTO;
import com.fitnote.modules.template.vo.AuditTemplateVO;
import com.fitnote.modules.template.vo.TagVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private final SharedTemplateMapper sharedTemplateMapper;
    private final TemplateLoadHelper loadHelper;

    @Override
    public PageVO<AuditTemplateVO> auditPage(Integer page, Integer size, Integer status) {
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 10 : size;

        LambdaQueryWrapper<SharedTemplate> wrapper = new LambdaQueryWrapper<>();
        // 列表不查 template_data
        wrapper.select(SharedTemplate.class, t -> !"template_data".equals(t.getColumn()));
        if (status != null) {
            wrapper.eq(SharedTemplate::getStatus, status);
        }
        wrapper.orderByDesc(SharedTemplate::getCreateTime);

        Page<SharedTemplate> result = sharedTemplateMapper.selectPage(new Page<>(p, s), wrapper);
        List<SharedTemplate> records = result.getRecords();
        if (records.isEmpty()) {
            return new PageVO<>(result.getTotal(), Collections.emptyList());
        }

        List<Long> ids = records.stream().map(SharedTemplate::getId).collect(Collectors.toList());
        Map<Long, List<TagVO>> tagMap = loadHelper.loadTags(ids);
        Set<Long> userIds = records.stream()
                .map(SharedTemplate::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> userNames = loadHelper.loadUserNames(userIds);

        List<AuditTemplateVO> vos = records.stream()
                .map(t -> toVO(t,
                        tagMap.getOrDefault(t.getId(), Collections.emptyList()),
                        t.getUserId() == null ? null : userNames.get(t.getUserId())))
                .collect(Collectors.toList());
        return new PageVO<>(result.getTotal(), vos);
    }

    @Override
    public AuditTemplateVO auditDetail(Long id) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null) throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在");
        Map<Long, List<TagVO>> tagMap = loadHelper.loadTags(Collections.singletonList(id));
        return toVO(t,
                tagMap.getOrDefault(id, Collections.emptyList()),
                loadHelper.resolveUserName(t.getUserId()));
    }

    @Override
    public void audit(Long id, AuditDTO dto, Long adminId) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null) throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在");
        if (t.getStatus() == null || t.getStatus() != 0) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "仅待审核状态可审核");
        }
        SharedTemplate up = new SharedTemplate();
        up.setId(id);
        up.setStatus(dto.getStatus());
        up.setAuditAdminId(adminId);
        up.setAuditTime(LocalDateTime.now());
        if (dto.getStatus() == 2) {
            up.setRejectReason(dto.getRejectReason());
        }
        sharedTemplateMapper.updateById(up);
    }

    private AuditTemplateVO toVO(SharedTemplate t, List<TagVO> tags, String userName) {
        AuditTemplateVO vo = new AuditTemplateVO();
        vo.setId(t.getId());
        vo.setName(t.getName());
        vo.setDescription(t.getDescription());
        vo.setCoverColor(t.getCoverColor());
        vo.setActionCount(t.getActionCount());
        vo.setTotalSets(t.getTotalSets());
        vo.setStatus(t.getStatus());
        vo.setRejectReason(t.getRejectReason());
        vo.setUserName(userName);
        vo.setCreateTime(t.getCreateTime());
        vo.setAuditTime(t.getAuditTime());
        vo.setTags(tags);
        // 列表查询排除了 template_data 列，此处为 null；详情查询（selectById）会带出真实值
        vo.setTemplateData(t.getTemplateData());
        return vo;
    }
}
