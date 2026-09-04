package com.fitnote.modules.template.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.SharedTemplate;
import com.fitnote.entity.TemplateTagRel;
import com.fitnote.entity.UserTemplateCollect;
import com.fitnote.mapper.SharedTemplateMapper;
import com.fitnote.mapper.TemplateTagRelMapper;
import com.fitnote.mapper.UserTemplateCollectMapper;
import com.fitnote.modules.template.dto.ShareTemplateDTO;
import com.fitnote.modules.template.dto.SquarePageQuery;
import com.fitnote.modules.template.vo.MyTemplateVO;
import com.fitnote.modules.template.vo.TagVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserTemplateServiceImpl implements UserTemplateService {

    private final SharedTemplateMapper sharedTemplateMapper;
    private final TemplateTagRelMapper templateTagRelMapper;
    private final UserTemplateCollectMapper userTemplateCollectMapper;
    private final TemplateLoadHelper loadHelper;
    private final TemplateCountService countService;

    @Override
    public Long share(ShareTemplateDTO dto, Long userId) {
        SharedTemplate t = new SharedTemplate();
        t.setUserId(userId);
        t.setName(dto.getName());
        t.setDescription(dto.getDescription());
        t.setCoverColor(dto.getCoverColor());
        t.setActionCount(dto.getActionCount());
        t.setTotalSets(dto.getTotalSets());
        t.setTemplateData(dto.getTemplateData());
        t.setStatus(0);
        t.setIsOfficial(0);
        t.setSortWeight(0);
        t.setViewCount(0);
        t.setCollectCount(0);
        t.setDownloadCount(0);
        sharedTemplateMapper.insert(t);
        if (dto.getTagIds() != null && !dto.getTagIds().isEmpty()) {
            for (Long tagId : dto.getTagIds()) {
                TemplateTagRel rel = new TemplateTagRel();
                rel.setTemplateId(t.getId());
                rel.setTagId(tagId);
                templateTagRelMapper.insert(rel);
            }
        }
        return t.getId();
    }

    @Override
    public void resubmit(Long id, Long userId) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null) throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在");
        if (!userId.equals(t.getUserId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权操作他人模板");
        }
        if (t.getStatus() == null || t.getStatus() != 2) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "仅驳回状态可重新提交");
        }
        // 显式置空审计字段（updateById 默认忽略 null）
        sharedTemplateMapper.update(null, new LambdaUpdateWrapper<SharedTemplate>()
                .eq(SharedTemplate::getId, id)
                .set(SharedTemplate::getStatus, 0)
                .set(SharedTemplate::getAuditAdminId, null)
                .set(SharedTemplate::getAuditTime, null)
                .set(SharedTemplate::getRejectReason, null));
    }

    @Override
    public void collect(Long id, Long userId) {
        SharedTemplate t = sharedTemplateMapper.selectById(id);
        if (t == null || t.getStatus() == null || t.getStatus() != 1) {
            throw new BusinessException(ResultCode.NOT_FOUND, "模板不存在或未上架");
        }
        Long cnt = userTemplateCollectMapper.selectCount(new LambdaQueryWrapper<UserTemplateCollect>()
                .eq(UserTemplateCollect::getUserId, userId)
                .eq(UserTemplateCollect::getTemplateId, id));
        if (cnt != null && cnt > 0) {
            throw new BusinessException(ResultCode.CONFLICT, "已收藏该模板");
        }
        UserTemplateCollect c = new UserTemplateCollect();
        c.setUserId(userId);
        c.setTemplateId(id);
        userTemplateCollectMapper.insert(c);
        countService.incrCollect(id);
    }

    @Override
    public void uncollect(Long id, Long userId) {
        int deleted = userTemplateCollectMapper.delete(new LambdaQueryWrapper<UserTemplateCollect>()
                .eq(UserTemplateCollect::getUserId, userId)
                .eq(UserTemplateCollect::getTemplateId, id));
        if (deleted > 0) {
            countService.decrCollect(id);
        }
    }

    @Override
    public PageVO<MyTemplateVO> mine(Long userId, SquarePageQuery query) {
        int page = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        int size = query.getSize() == null || query.getSize() < 1 ? 10 : query.getSize();

        LambdaQueryWrapper<SharedTemplate> wrapper = new LambdaQueryWrapper<>();
        wrapper.select(SharedTemplate.class, t -> !"template_data".equals(t.getColumn()));
        wrapper.eq(SharedTemplate::getUserId, userId);
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(SharedTemplate::getName, query.getKeyword().trim());
        }
        wrapper.orderByDesc(SharedTemplate::getCreateTime);

        Page<SharedTemplate> p = new Page<>(page, size);
        Page<SharedTemplate> result = sharedTemplateMapper.selectPage(p, wrapper);
        List<SharedTemplate> records = result.getRecords();
        if (records.isEmpty()) {
            return new PageVO<>(result.getTotal(), Collections.emptyList());
        }

        List<Long> ids = records.stream().map(SharedTemplate::getId).collect(Collectors.toList());
        Map<Long, List<TagVO>> tagMap = loadHelper.loadTags(ids);
        String userName = loadHelper.resolveUserName(userId);

        List<MyTemplateVO> vos = records.stream()
                .map(t -> {
                    MyTemplateVO vo = new MyTemplateVO();
                    loadHelper.fillSquareBase(vo, t,
                            tagMap.getOrDefault(t.getId(), Collections.emptyList()), userName);
                    vo.setStatus(t.getStatus());
                    vo.setRejectReason(t.getRejectReason());
                    vo.setAuditTime(t.getAuditTime());
                    return vo;
                })
                .collect(Collectors.toList());
        return new PageVO<>(result.getTotal(), vos);
    }
}
