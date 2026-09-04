package com.fitnote.modules.preset;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.PresetPack;
import com.fitnote.entity.SysAdmin;
import com.fitnote.mapper.PresetPackMapper;
import com.fitnote.mapper.SysAdminMapper;
import com.fitnote.modules.preset.dto.PresetSaveDTO;
import com.fitnote.modules.preset.vo.PresetVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PresetPackService {

    private final PresetPackMapper presetMapper;
    private final SysAdminMapper adminMapper;

    public Long saveOrUpdate(PresetSaveDTO dto, Long adminId) {
        if (dto.getId() == null) {
            PresetPack p = new PresetPack();
            p.setName(dto.getName());
            p.setDescription(dto.getDescription());
            p.setCoverColor(dto.getCoverColor());
            p.setDifficulty(dto.getDifficulty() == null ? 2 : dto.getDifficulty());
            p.setTemplateData(dto.getTemplateData());
            p.setEnabled(dto.getEnabled() == null ? 1 : dto.getEnabled());
            p.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
            p.setCreateAdminId(adminId);
            presetMapper.insert(p);
            return p.getId();
        } else {
            PresetPack p = presetMapper.selectById(dto.getId());
            if (p == null) throw new BusinessException(ResultCode.NOT_FOUND, "预设模板包不存在");
            p.setName(dto.getName());
            p.setDescription(dto.getDescription());
            p.setCoverColor(dto.getCoverColor());
            if (dto.getDifficulty() != null) p.setDifficulty(dto.getDifficulty());
            p.setTemplateData(dto.getTemplateData());
            if (dto.getEnabled() != null) p.setEnabled(dto.getEnabled());
            if (dto.getSortOrder() != null) p.setSortOrder(dto.getSortOrder());
            presetMapper.updateById(p);
            return p.getId();
        }
    }

    public void setEnabled(Long id, Integer enabled) {
        PresetPack p = presetMapper.selectById(id);
        if (p == null) throw new BusinessException(ResultCode.NOT_FOUND, "预设模板包不存在");
        p.setEnabled(enabled == 1 ? 1 : 0);
        presetMapper.updateById(p);
    }

    public void delete(Long id) {
        PresetPack p = presetMapper.selectById(id);
        if (p == null) throw new BusinessException(ResultCode.NOT_FOUND, "预设模板包不存在");
        presetMapper.deleteById(id);
    }

    /* --------------------- 管理端列表/详情 --------------------- */

    public PageVO<PresetVO> adminPage(Integer page, Integer size, Integer enabled, Integer difficulty, String keyword) {
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 10 : size;
        LambdaQueryWrapper<PresetPack> w = new LambdaQueryWrapper<>();
        if (enabled != null) w.eq(PresetPack::getEnabled, enabled);
        if (difficulty != null) w.eq(PresetPack::getDifficulty, difficulty);
        if (keyword != null && !keyword.trim().isEmpty()) {
            w.like(PresetPack::getName, keyword.trim());
        }
        w.orderByAsc(PresetPack::getSortOrder, PresetPack::getId);
        return doPage(p, s, w);
    }

    public PresetVO adminDetail(Long id) {
        PresetPack p = presetMapper.selectById(id);
        if (p == null) throw new BusinessException(ResultCode.NOT_FOUND, "预设模板包不存在");
        return fillSingle(p);
    }

    /* --------------------- 小程序公开端 --------------------- */

    public List<PresetVO> publicList() {
        LambdaQueryWrapper<PresetPack> w = new LambdaQueryWrapper<>();
        w.eq(PresetPack::getEnabled, 1);
        w.orderByAsc(PresetPack::getSortOrder, PresetPack::getId);
        List<PresetPack> list = presetMapper.selectList(w);
        if (list.isEmpty()) return Collections.emptyList();
        return fillList(list);
    }

    public PresetVO publicDetail(Long id) {
        PresetPack p = presetMapper.selectById(id);
        if (p == null || p.getEnabled() == null || p.getEnabled() != 1) {
            throw new BusinessException(ResultCode.NOT_FOUND, "预设模板包不存在或已下架");
        }
        return fillSingle(p);
    }

    /* --------------------- 辅助 --------------------- */

    private PageVO<PresetVO> doPage(Integer p, Integer s, LambdaQueryWrapper<PresetPack> w) {
        Page<PresetPack> pr = presetMapper.selectPage(new Page<>(p, s), w);
        List<PresetPack> rs = pr.getRecords();
        if (rs.isEmpty()) return new PageVO<>(pr.getTotal(), Collections.emptyList());
        return new PageVO<>(pr.getTotal(), fillList(rs));
    }

    private List<PresetVO> fillList(List<PresetPack> list) {
        Set<Long> aids = list.stream().map(PresetPack::getCreateAdminId)
                .filter(x -> x != null).collect(Collectors.toSet());
        Map<Long, String> nameMap = aids.isEmpty() ? Collections.emptyMap()
                : adminMapper.selectBatchIds(aids).stream().collect(Collectors.toMap(SysAdmin::getId, SysAdmin::getNickname, (a, b) -> a));
        return list.stream().map(p -> fillVO(p, nameMap)).collect(Collectors.toList());
    }

    private PresetVO fillSingle(PresetPack p) {
        String name = null;
        if (p.getCreateAdminId() != null) {
            SysAdmin a = adminMapper.selectById(p.getCreateAdminId());
            if (a != null) name = a.getNickname();
        }
        return fillVO(p, Collections.singletonMap(p.getCreateAdminId(), name));
    }

    private PresetVO fillVO(PresetPack p, Map<Long, String> nameMap) {
        PresetVO vo = new PresetVO();
        vo.setId(p.getId());
        vo.setName(p.getName());
        vo.setDescription(p.getDescription());
        vo.setCoverColor(p.getCoverColor());
        vo.setDifficulty(p.getDifficulty());
        vo.setDifficultyText(diffText(p.getDifficulty()));
        vo.setTemplateData(p.getTemplateData());
        vo.setEnabled(p.getEnabled());
        vo.setSortOrder(p.getSortOrder() == null ? 0 : p.getSortOrder());
        vo.setCreateAdminId(p.getCreateAdminId());
        vo.setCreateAdminName(p.getCreateAdminId() == null ? null : nameMap.get(p.getCreateAdminId()));
        vo.setCreateTime(p.getCreateTime());
        vo.setUpdateTime(p.getUpdateTime());
        return vo;
    }

    private String diffText(Integer d) {
        if (d == null) return "中";
        switch (d) {
            case 1: return "简单";
            case 2: return "中等";
            case 3: return "困难";
            default: return "未知";
        }
    }
}
