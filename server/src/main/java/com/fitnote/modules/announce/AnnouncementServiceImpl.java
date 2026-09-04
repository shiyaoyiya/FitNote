package com.fitnote.modules.announce;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.Announcement;
import com.fitnote.entity.SysAdmin;
import com.fitnote.mapper.AnnouncementMapper;
import com.fitnote.mapper.SysAdminMapper;
import com.fitnote.modules.announce.dto.AnnouncePageQuery;
import com.fitnote.modules.announce.dto.AnnounceSaveDTO;
import com.fitnote.modules.announce.vo.AnnounceVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnnouncementServiceImpl implements AnnouncementService {

    private final AnnouncementMapper announcementMapper;
    private final SysAdminMapper sysAdminMapper;

    @Override
    public Long saveOrUpdate(AnnounceSaveDTO dto, Long adminId) {
        Integer targetStatus = (dto.getAction() != null && dto.getAction() == 1) ? 1 : 0;
        if (dto.getId() == null) {
            Announcement a = new Announcement();
            a.setTitle(dto.getTitle());
            a.setContent(dto.getContent());
            a.setType(dto.getType() == null ? 1 : dto.getType());
            a.setPriority(dto.getPriority() == null ? 0 : dto.getPriority());
            a.setStatus(targetStatus);
            a.setTargetGroup(0);
            a.setViewCount(0);
            if (targetStatus == 1) {
                a.setPublishAdminId(adminId);
                a.setPublishTime(LocalDateTime.now());
            }
            announcementMapper.insert(a);
            return a.getId();
        } else {
            Announcement a = announcementMapper.selectById(dto.getId());
            if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
            if (a.getStatus() != null && a.getStatus() == 1 && targetStatus == 0) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "已发布公告如需修改请先撤回");
            }
            a.setTitle(dto.getTitle());
            a.setContent(dto.getContent());
            if (dto.getType() != null) a.setType(dto.getType());
            if (dto.getPriority() != null) a.setPriority(dto.getPriority());
            // 草稿 → 发布
            if (a.getStatus() == 0 && targetStatus == 1) {
                a.setPublishAdminId(adminId);
                a.setPublishTime(LocalDateTime.now());
            }
            a.setStatus(targetStatus);
            announcementMapper.updateById(a);
            return a.getId();
        }
    }

    @Override
    public void publish(Long id, Long adminId) {
        Announcement a = announcementMapper.selectById(id);
        if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        if (a.getStatus() != null && a.getStatus() == 1) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "已发布状态无需重复发布");
        }
        announcementMapper.update(null, new LambdaUpdateWrapper<Announcement>()
                .eq(Announcement::getId, id)
                .set(Announcement::getStatus, 1)
                .set(Announcement::getPublishAdminId, adminId)
                .set(Announcement::getPublishTime, LocalDateTime.now()));
    }

    @Override
    public void withdraw(Long id, Long adminId) {
        Announcement a = announcementMapper.selectById(id);
        if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        if (a.getStatus() == null || a.getStatus() != 1) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "仅已发布公告可撤回");
        }
        announcementMapper.update(null, new LambdaUpdateWrapper<Announcement>()
                .eq(Announcement::getId, id)
                .set(Announcement::getStatus, 2));
    }

    @Override
    public void delete(Long id) {
        Announcement a = announcementMapper.selectById(id);
        if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        announcementMapper.deleteById(id);
    }

    /* ---------------------- 列表查询（管理端 / 公开端共用）---------------------- */

    public PageVO<AnnounceVO> queryAdminPage(AnnouncePageQuery query) {
        LambdaQueryWrapper<Announcement> w = new LambdaQueryWrapper<>();
        if (query.getStatus() != null) w.eq(Announcement::getStatus, query.getStatus());
        if (query.getType() != null) w.eq(Announcement::getType, query.getType());
        if (StringUtils.hasText(query.getKeyword())) {
            w.like(Announcement::getTitle, query.getKeyword().trim());
        }
        w.orderByDesc(Announcement::getPriority, Announcement::getPublishTime, Announcement::getCreateTime);
        return doPage(query.getPage(), query.getSize(), w);
    }

    public PageVO<AnnounceVO> queryPublicPage(Integer page, Integer size, Integer type) {
        LambdaQueryWrapper<Announcement> w = new LambdaQueryWrapper<>();
        w.eq(Announcement::getStatus, 1);
        if (type != null) w.eq(Announcement::getType, type);
        w.orderByDesc(Announcement::getPriority, Announcement::getPublishTime);
        return doPage(page, size, w);
    }

    public AnnounceVO getPublicDetail(Long id) {
        Announcement a = announcementMapper.selectById(id);
        if (a == null || a.getStatus() == null || a.getStatus() != 1) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在或已下架");
        }
        announcementMapper.update(null, new LambdaUpdateWrapper<Announcement>()
                .eq(Announcement::getId, id)
                .setSql("view_count = view_count + 1"));
        a.setViewCount((a.getViewCount() == null ? 0 : a.getViewCount()) + 1);
        return toVO(a);
    }

    public AnnounceVO getAdminDetail(Long id) {
        Announcement a = announcementMapper.selectById(id);
        if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        return toVO(a);
    }

    /* ---------------------- 辅助方法 ---------------------- */

    private PageVO<AnnounceVO> doPage(Integer page, Integer size, LambdaQueryWrapper<Announcement> w) {
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 10 : size;
        Page<Announcement> pr = announcementMapper.selectPage(new Page<>(p, s), w);
        List<Announcement> rs = pr.getRecords();
        if (rs.isEmpty()) return new PageVO<>(pr.getTotal(), Collections.emptyList());
        return new PageVO<>(pr.getTotal(), toVOs(rs));
    }

    private List<AnnounceVO> toVOs(List<Announcement> list) {
        Set<Long> ids = list.stream().map(Announcement::getPublishAdminId)
                .filter(x -> x != null).collect(Collectors.toSet());
        Map<Long, String> adminNameMap;
        if (ids.isEmpty()) {
            adminNameMap = Collections.emptyMap();
        } else {
            List<SysAdmin> admins = sysAdminMapper.selectBatchIds(ids);
            adminNameMap = admins.stream().collect(Collectors.toMap(SysAdmin::getId, SysAdmin::getNickname, (x, y) -> x));
        }
        return list.stream().map(a -> fillVO(a, adminNameMap)).collect(Collectors.toList());
    }

    private AnnounceVO toVO(Announcement a) {
        String name = null;
        if (a.getPublishAdminId() != null) {
            SysAdmin ad = sysAdminMapper.selectById(a.getPublishAdminId());
            if (ad != null) name = ad.getNickname();
        }
        return fillVO(a, name);
    }

    private AnnounceVO fillVO(Announcement a, Map<Long, String> nameMap) {
        String name = a.getPublishAdminId() == null ? null : nameMap.get(a.getPublishAdminId());
        return fillVO(a, name);
    }

    private AnnounceVO fillVO(Announcement a, String adminName) {
        AnnounceVO vo = new AnnounceVO();
        vo.setId(a.getId());
        vo.setTitle(a.getTitle());
        vo.setContent(a.getContent());
        vo.setType(a.getType());
        vo.setTypeText(typeText(a.getType()));
        vo.setPriority(a.getPriority());
        vo.setStatus(a.getStatus());
        vo.setStatusText(statusText(a.getStatus()));
        vo.setPublishAdminId(a.getPublishAdminId());
        vo.setPublishAdminName(adminName);
        vo.setPublishTime(a.getPublishTime());
        vo.setViewCount(a.getViewCount() == null ? 0 : a.getViewCount());
        vo.setCreateTime(a.getCreateTime());
        return vo;
    }

    private String typeText(Integer t) {
        if (t == null) return "未知";
        switch (t) {
            case 1: return "系统公告";
            case 2: return "活动通知";
            case 3: return "版本更新";
            default: return "其他";
        }
    }

    private String statusText(Integer s) {
        if (s == null) return "草稿";
        switch (s) {
            case 0: return "草稿";
            case 1: return "已发布";
            case 2: return "已撤回";
            default: return "未知";
        }
    }
}
