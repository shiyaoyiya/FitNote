package com.fitnote.modules.template.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.entity.SharedTemplate;
import com.fitnote.entity.SysUser;
import com.fitnote.entity.TemplateTag;
import com.fitnote.entity.TemplateTagRel;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.mapper.TemplateTagMapper;
import com.fitnote.mapper.TemplateTagRelMapper;
import com.fitnote.modules.template.vo.SquareTemplateVO;
import com.fitnote.modules.template.vo.TagVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 模板模块共享查询辅助：批量加载标签、分享人用户名，避免各 Service 重复样板代码。
 */
@Component
@RequiredArgsConstructor
public class TemplateLoadHelper {

    private final TemplateTagMapper templateTagMapper;
    private final TemplateTagRelMapper templateTagRelMapper;
    private final SysUserMapper userMapper;

    public List<TagVO> listAllTags() {
        return templateTagMapper.selectList(
                new LambdaQueryWrapper<TemplateTag>().orderByAsc(TemplateTag::getSortOrder))
                .stream().map(this::toTagVO).collect(Collectors.toList());
    }

    public Map<Long, List<TagVO>> loadTags(List<Long> templateIds) {
        if (templateIds == null || templateIds.isEmpty()) return Collections.emptyMap();
        List<TemplateTagRel> rels = templateTagRelMapper.selectList(
                new LambdaQueryWrapper<TemplateTagRel>().in(TemplateTagRel::getTemplateId, templateIds));
        if (rels.isEmpty()) return Collections.emptyMap();
        Set<Long> tagIds = rels.stream().map(TemplateTagRel::getTagId).collect(Collectors.toSet());
        Map<Long, TagVO> tagVoMap = templateTagMapper.selectBatchIds(tagIds).stream()
                .map(this::toTagVO)
                .collect(Collectors.toMap(TagVO::getId, v -> v, (a, b) -> a));
        Map<Long, List<TagVO>> result = new HashMap<>();
        for (TemplateTagRel rel : rels) {
            TagVO tv = tagVoMap.get(rel.getTagId());
            if (tv != null) result.computeIfAbsent(rel.getTemplateId(), k -> new ArrayList<>()).add(tv);
        }
        return result;
    }

    public Map<Long, String> loadUserNames(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return Collections.emptyMap();
        return userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(SysUser::getId,
                        u -> (u.getNickname() != null && !u.getNickname().isEmpty()) ? u.getNickname() : u.getUsername(),
                        (a, b) -> a));
    }

    public String resolveUserName(Long userId) {
        if (userId == null) return null;
        SysUser u = userMapper.selectById(userId);
        if (u == null) return null;
        return (u.getNickname() != null && !u.getNickname().isEmpty()) ? u.getNickname() : u.getUsername();
    }

    public void fillSquareBase(SquareTemplateVO vo, SharedTemplate t, List<TagVO> tags, String userName) {
        vo.setId(t.getId());
        vo.setName(t.getName());
        vo.setDescription(t.getDescription());
        vo.setCoverColor(t.getCoverColor());
        vo.setActionCount(t.getActionCount());
        vo.setTotalSets(t.getTotalSets());
        vo.setIsOfficial(t.getIsOfficial());
        vo.setSortWeight(t.getSortWeight());
        vo.setViewCount(t.getViewCount());
        vo.setCollectCount(t.getCollectCount());
        vo.setDownloadCount(t.getDownloadCount());
        vo.setCreateTime(t.getCreateTime());
        vo.setTags(tags);
        vo.setUserName(userName);
    }

    private TagVO toTagVO(TemplateTag t) {
        TagVO v = new TagVO();
        v.setId(t.getId());
        v.setName(t.getName());
        v.setColor(t.getColor());
        return v;
    }
}
