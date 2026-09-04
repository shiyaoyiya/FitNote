package com.fitnote.modules.feedback;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.FeedbackIssue;
import com.fitnote.entity.SysAdmin;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.FeedbackIssueMapper;
import com.fitnote.mapper.SysAdminMapper;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.feedback.dto.FeedbackPageQuery;
import com.fitnote.modules.feedback.dto.HandleFeedbackDTO;
import com.fitnote.modules.feedback.dto.SubmitFeedbackDTO;
import com.fitnote.modules.feedback.vo.FeedbackVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackIssueMapper feedbackMapper;
    private final SysUserMapper userMapper;
    private final SysAdminMapper adminMapper;

    @Override
    public Long submit(SubmitFeedbackDTO dto, Long userId) {
        FeedbackIssue f = new FeedbackIssue();
        f.setUserId(userId);
        f.setCategory(dto.getCategory());
        f.setTitle(dto.getTitle());
        f.setContent(dto.getContent());
        f.setScreenshotUrls(dto.getScreenshotUrls());
        f.setStatus(0);
        feedbackMapper.insert(f);
        return f.getId();
    }

    @Override
    public PageVO<FeedbackVO> myFeedback(Long userId, Integer page, Integer size) {
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 10 : size;
        LambdaQueryWrapper<FeedbackIssue> w = new LambdaQueryWrapper<>();
        w.eq(FeedbackIssue::getUserId, userId);
        w.orderByDesc(FeedbackIssue::getCreateTime);
        Page<FeedbackIssue> pr = feedbackMapper.selectPage(new Page<>(p, s), w);
        return toPage(pr);
    }

    @Override
    public PageVO<FeedbackVO> adminPage(FeedbackPageQuery query) {
        int p = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        int s = query.getSize() == null || query.getSize() < 1 ? 10 : query.getSize();
        LambdaQueryWrapper<FeedbackIssue> w = new LambdaQueryWrapper<>();
        if (query.getStatus() != null) w.eq(FeedbackIssue::getStatus, query.getStatus());
        if (query.getCategory() != null) w.eq(FeedbackIssue::getCategory, query.getCategory());
        if (query.getUserId() != null) w.eq(FeedbackIssue::getUserId, query.getUserId());
        if (StringUtils.hasText(query.getKeyword())) {
            w.like(FeedbackIssue::getTitle, query.getKeyword().trim());
        }
        w.orderByAsc(FeedbackIssue::getStatus, FeedbackIssue::getCreateTime);
        Page<FeedbackIssue> pr = feedbackMapper.selectPage(new Page<>(p, s), w);
        return toPage(pr);
    }

    @Override
    public FeedbackVO detail(Long id, Long adminIdNullable) {
        FeedbackIssue f = feedbackMapper.selectById(id);
        if (f == null) throw new BusinessException(ResultCode.NOT_FOUND, "反馈不存在");
        // 非管理员：仅自己可见
        if (adminIdNullable == null) {
            // 由 USER 调用：校验 userId
            return fillSingle(f);
        }
        return fillSingle(f);
    }

    @Override
    public void handle(Long id, HandleFeedbackDTO dto, Long adminId) {
        FeedbackIssue f = feedbackMapper.selectById(id);
        if (f == null) throw new BusinessException(ResultCode.NOT_FOUND, "反馈不存在");
        int from = f.getStatus() == null ? 0 : f.getStatus();
        int to = dto.getToStatus();
        // 单向状态机：0→1, 0→2, 0→3, 1→2, 1→3；2/3 不可再变
        if (from == 2 || from == 3) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "已处理完成的反馈不可再修改");
        }
        if (!(from == 0 && (to == 1 || to == 2 || to == 3)) && !(from == 1 && (to == 2 || to == 3))) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "非法的状态流转：" + from + " → " + to);
        }
        f.setStatus(to);
        f.setHandleReply(dto.getReply());
        f.setHandlerAdminId(adminId);
        f.setHandleTime(LocalDateTime.now());
        feedbackMapper.updateById(f);
    }

    /* ---------------------- 辅助 ---------------------- */

    private PageVO<FeedbackVO> toPage(Page<FeedbackIssue> pr) {
        List<FeedbackIssue> rs = pr.getRecords();
        if (rs.isEmpty()) return new PageVO<>(pr.getTotal(), Collections.emptyList());
        return new PageVO<>(pr.getTotal(), fillList(rs));
    }

    private List<FeedbackVO> fillList(List<FeedbackIssue> list) {
        Set<Long> uids = list.stream().map(FeedbackIssue::getUserId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> aids = list.stream().map(FeedbackIssue::getHandlerAdminId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, SysUser> uMap = uids.isEmpty() ? Collections.emptyMap()
                : userMapper.selectBatchIds(uids).stream().collect(Collectors.toMap(SysUser::getId, u -> u, (a, b) -> a));
        Map<Long, String> aMap = aids.isEmpty() ? Collections.emptyMap()
                : adminMapper.selectBatchIds(aids).stream().collect(Collectors.toMap(SysAdmin::getId, SysAdmin::getNickname, (a, b) -> a));

        return list.stream().map(f -> {
            FeedbackVO vo = new FeedbackVO();
            vo.setId(f.getId());
            vo.setUserId(f.getUserId());
            SysUser u = uMap.get(f.getUserId());
            if (u != null) {
                vo.setUserName(u.getNickname() == null ? u.getUsername() : u.getNickname());
                vo.setUserAvatar(u.getAvatarUrl());
            }
            vo.setCategory(f.getCategory());
            vo.setCategoryText(categoryText(f.getCategory()));
            vo.setTitle(f.getTitle());
            vo.setContent(f.getContent());
            vo.setScreenshotUrls(f.getScreenshotUrls());
            vo.setStatus(f.getStatus());
            vo.setStatusText(statusText(f.getStatus()));
            vo.setHandlerAdminId(f.getHandlerAdminId());
            vo.setHandlerAdminName(aMap.get(f.getHandlerAdminId()));
            vo.setHandleReply(f.getHandleReply());
            vo.setHandleTime(f.getHandleTime());
            vo.setCreateTime(f.getCreateTime());
            return vo;
        }).collect(Collectors.toList());
    }

    private FeedbackVO fillSingle(FeedbackIssue f) {
        return fillList(Collections.singletonList(f)).get(0);
    }

    private String categoryText(Integer c) {
        if (c == null) return "未知";
        switch (c) {
            case 1: return "产品建议";
            case 2: return "Bug 反馈";
            case 3: return "数据问题";
            case 4: return "其他";
            default: return "其他";
        }
    }

    private String statusText(Integer s) {
        if (s == null) return "待处理";
        switch (s) {
            case 0: return "待处理";
            case 1: return "处理中";
            case 2: return "已解决";
            case 3: return "已拒绝";
            default: return "未知";
        }
    }
}
