package com.fitnote.modules.template.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.SharedTemplate;
import com.fitnote.entity.UserTemplateCollect;
import com.fitnote.mapper.SharedTemplateMapper;
import com.fitnote.mapper.UserTemplateCollectMapper;
import com.fitnote.modules.notification.NotificationService;
import com.fitnote.modules.template.dto.OfficialDTO;
import com.fitnote.modules.template.dto.SquarePageQuery;
import com.fitnote.modules.template.vo.SquareTemplateVO;
import com.fitnote.modules.template.vo.TagVO;
import com.fitnote.modules.template.vo.TemplateDetailVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SharedTemplateServiceImpl implements SharedTemplateService {

    private final SharedTemplateMapper sharedTemplateMapper;
    private final UserTemplateCollectMapper userTemplateCollectMapper;
    private final TemplateLoadHelper loadHelper;
    private final TemplateCountService countService;
    private final NotificationService notificationService;

    @Override
    public PageVO<SquareTemplateVO> page(SquarePageQuery query) {
        int page = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        int size = query.getSize() == null || query.getSize() < 1 ? 10 : query.getSize();

        LambdaQueryWrapper<SharedTemplate> wrapper = new LambdaQueryWrapper<>();
        // 列表不查 template_data 大字段
        wrapper.select(SharedTemplate.class, t -> !"template_data".equals(t.getColumn()));
        wrapper.eq(SharedTemplate::getStatus, 1);
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(SharedTemplate::getName, query.getKeyword().trim());
        }
        if (query.getTagId() != null) {
            // tagId 为 Long，无注入风险
            wrapper.inSql(SharedTemplate::getId,
                    "SELECT template_id FROM template_tag_rel WHERE tag_id = " + query.getTagId());
        }
        if ("hot".equalsIgnoreCase(query.getSort())) {
            wrapper.orderByDesc(SharedTemplate::getDownloadCount);
        } else {
            wrapper.orderByDesc(SharedTemplate::getCreateTime);
        }

        Page<SharedTemplate> p = new Page<>(page, size);
        Page<SharedTemplate> result = sharedTemplateMapper.selectPage(p, wrapper);
        List<SharedTemplate> records = result.getRecords();
        if (records.isEmpty()) {
            return new PageVO<>(result.getTotal(), Collections.emptyList());
        }

        List<Long> ids = records.stream().map(SharedTemplate::getId).collect(Collectors.toList());
        Map<Long, List<TagVO>> tagMap = loadHelper.loadTags(ids);
        Map<Long, String> userNames = loadHelper.loadUserNames(records.stream()
                .map(SharedTemplate::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet()));

        List<SquareTemplateVO> vos = records.stream()
                .map(t -> {
                    SquareTemplateVO vo = new SquareTemplateVO();
                    loadHelper.fillSquareBase(vo, t,
                            tagMap.getOrDefault(t.getId(), Collections.emptyList()),
                            t.getUserId() == null ? null : userNames.get(t.getUserId()));
                    return vo;
                })
                .collect(Collectors.toList());
        return new PageVO<>(result.getTotal(), vos);
    }

    @Override
    public TemplateDetailVO detail(Long id, Long currentUserId, boolean isAdmin) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null || t.getStatus() == null || t.getStatus() != 1) {
            throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在或未上架");
        }
        countService.incrView(id);
        Map<Long, List<TagVO>> tagMap = loadHelper.loadTags(Collections.singletonList(id));
        TemplateDetailVO vo = new TemplateDetailVO();
        loadHelper.fillSquareBase(vo, t,
                tagMap.getOrDefault(id, Collections.emptyList()),
                loadHelper.resolveUserName(t.getUserId()));
        vo.setTemplateData(t.getTemplateData());
        // rejectReason 仅本人或 ADMIN 可见（status=1 时通常为空，仅做兜底）
        boolean showReject = (currentUserId != null && currentUserId.equals(t.getUserId())) || isAdmin;
        vo.setRejectReason(showReject ? t.getRejectReason() : null);
        // 检查当前用户是否已收藏
        if (currentUserId != null) {
            Long cnt = userTemplateCollectMapper.selectCount(new LambdaQueryWrapper<UserTemplateCollect>()
                    .eq(UserTemplateCollect::getUserId, currentUserId)
                    .eq(UserTemplateCollect::getTemplateId, id));
            vo.setCollected(cnt != null && cnt > 0);
        } else {
            vo.setCollected(false);
        }
        return vo;
    }

    @Override
    public String download(Long id) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null || t.getStatus() == null || t.getStatus() != 1) {
            throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在或未上架");
        }
        countService.incrDownload(id);
        return t.getTemplateData();
    }

    @Override
    public List<TagVO> tagList() {
        return loadHelper.listAllTags();
    }

    @Override
    public void setOfficial(Long id, OfficialDTO dto) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null) throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在");
        SharedTemplate up = new SharedTemplate();
        up.setId(id);
        up.setIsOfficial(dto.getIsOfficial());
        up.setSortWeight(dto.getSortWeight());
        sharedTemplateMapper.updateById(up);
    }

    @Override
    public void deleteSquare(Long id) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null) throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在");
        // @TableLogic 已配置，deleteById 自动改为 update deleted=1
        sharedTemplateMapper.deleteById(id);
    }

    @Override
    public void offline(Long id, String rejectReason, Long adminId) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null) throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在");
        // 仅已上架（status=1）模板可下架；待审核（0）/ 已驳回（2）不允许此接口操作
        if (t.getStatus() == null || t.getStatus() != 1) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "仅已上架模板可下架");
        }
        SharedTemplate up = new SharedTemplate();
        up.setId(id);
        up.setStatus(2);
        up.setRejectReason(rejectReason);
        up.setAuditAdminId(adminId);
        up.setAuditTime(LocalDateTime.now());
        sharedTemplateMapper.updateById(up);

        // 推送站内通知给模板分享人
        try {
            notificationService.notifyTemplateOffline(t.getUserId(), t.getId(), t.getName(), rejectReason);
        } catch (Exception e) {
            // 通知失败不影响下架主流程
        }
    }
}
