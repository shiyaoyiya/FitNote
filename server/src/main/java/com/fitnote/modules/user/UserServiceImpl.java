package com.fitnote.modules.user;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.BackupRecord;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.BackupRecordMapper;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.backup.support.BackupStatsExtractResult;
import com.fitnote.modules.backup.support.BackupStatsExtractor;
import com.fitnote.modules.user.dto.UserQueryDTO;
import com.fitnote.modules.user.vo.UserDetailVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final SysUserMapper userMapper;
    private final BackupRecordMapper backupRecordMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public PageVO<UserDetailVO> page(UserQueryDTO query) {
        int page = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        int size = query.getSize() == null || query.getSize() < 1 ? 10 : query.getSize();

        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            String kw = query.getKeyword();
            wrapper.and(w -> w.like(SysUser::getUsername, kw)
                    .or().like(SysUser::getNickname, kw));
        }
        if (query.getStatus() != null) {
            wrapper.eq(SysUser::getStatus, query.getStatus());
        }
        wrapper.orderByDesc(SysUser::getCreateTime);

        Page<SysUser> p = new Page<>(page, size);
        Page<SysUser> result = userMapper.selectPage(p, wrapper);

        List<UserDetailVO> records = result.getRecords().stream()
                .map(this::toVO)
                .collect(Collectors.toList());
        return new PageVO<>(result.getTotal(), records);
    }

    @Override
    public void ban(Long userId) {
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        u.setStatus(0);
        userMapper.updateById(u);
    }

    @Override
    public void unban(Long userId) {
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        u.setStatus(1);
        userMapper.updateById(u);
    }

    @Override
    public UserDetailVO detail(Long userId) {
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        return toVO(u);
    }

    @Override
    public long countTodayNew() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        Long cnt = userMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .ge(SysUser::getRegisterTime, startOfDay));
        return cnt == null ? 0 : cnt;
    }

    private UserDetailVO toVO(SysUser u) {
        UserDetailVO vo = new UserDetailVO();
        vo.setId(u.getId());
        vo.setUsername(u.getUsername());
        vo.setNickname(u.getNickname());
        vo.setAvatarUrl(u.getAvatarUrl());
        vo.setPhone(u.getPhone());
        vo.setGender(u.getGender());
        vo.setBirthday(u.getBirthday());
        vo.setStatus(u.getStatus());
        vo.setTotalTrainDays(u.getTotalTrainDays());
        vo.setTotalVolumeKg(u.getTotalVolumeKg());
        vo.setLastLoginTime(u.getLastLoginTime());
        vo.setLastActiveTime(u.getLastActiveTime());
        vo.setRegisterTime(u.getRegisterTime());
        return vo;
    }

    // --- 训练统计 ---

    @Override
    public int updateStatsGreatest(Long userId, Integer days, BigDecimal volumeKg) {
        if (userId == null) return 0;
        int d = days == null || days < 0 ? 0 : days;
        BigDecimal v = volumeKg == null ? BigDecimal.ZERO : volumeKg.setScale(2, java.math.RoundingMode.HALF_UP);
        return userMapper.updateTrainStatsGreatest(userId, d, v);
    }

    @Override
    public boolean refreshTrainStatsFromLatestBackup(Long userId) {
        if (userId == null) return false;
        BackupRecord latest = backupRecordMapper.selectOne(
                new LambdaQueryWrapper<BackupRecord>()
                        .eq(BackupRecord::getUserId, userId)
                        .orderByDesc(BackupRecord::getCreateTime)
                        .last("LIMIT 1"));
        if (latest == null) return false;

        // 方案 B 兼容：不再信任 BackupRecord 缓存的 totalDays/volumeKg，
        // 因为缓存可能是「按注册日期过滤」功能上线前写入的（含注册前历史数据）。
        // 始终从物理文件重新解析（携带 registerTime），保证正确性；低频异步调用，I/O 可接受。
        BackupStatsExtractResult stats = recalcBackupStatsByFile(latest);

        if (stats == null) return false;

        // 注意：这条分支是「基于最新备份文件的权威重算」，算出来的值就是对用户而言真实的累计训练数据
        // （registerTime 过滤之后 / 文件重新解析之后）。必须直接 SET 覆盖，不能走 GREATEST。
        // GREATEST 会让「值变小（比如方案 B 排除了注册前历史导致天数减少）」的正确更新被静默丢弃。
        SysUser patch = new SysUser();
        patch.setId(userId);
        patch.setTotalTrainDays(stats.getTotalDays());
        patch.setTotalVolumeKg(stats.getTotalVolumeKg());
        int affected = userMapper.updateById(patch);
        return affected > 0;
    }

    @Override
    public void refreshAllTrainStatsFromLatestBackup() {
        List<SysUser> users = userMapper.selectList(null);
        if (users == null || users.isEmpty()) return;
        int ok = 0;
        for (SysUser u : users) {
            try {
                if (Boolean.TRUE.equals(refreshTrainStatsFromLatestBackup(u.getId()))) ok++;
            } catch (Exception e) {
                log.warn("refresh user {} stats failed: {}", u.getId(), e.getMessage());
            }
        }
        log.info("refreshAllTrainStatsFromLatestBackup done, updated {}/{} users", ok, users.size());
    }

    /**
     * 读取备份物理文件，重新解析统计并写回 BackupRecord.totalDays/volumeKg。
     * 文件不存在 / 解析失败时不抛错，返回 null。
     */
    private BackupStatsExtractResult recalcBackupStatsByFile(BackupRecord rec) {
        if (rec == null || !StringUtils.hasText(rec.getFilePath())) return null;
        try {
            Path p = Paths.get(rec.getFilePath());
            if (!Files.exists(p)) {
                log.debug("backup file not found, skip: {}", rec.getFilePath());
                return null;
            }
            String content = new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            JsonNode root = objectMapper.readTree(content);
            BackupStatsExtractResult r = BackupStatsExtractor.extract(root);
            // 写回备份记录（后续不用再读物理文件）。totalDays 为基本 int（>=0），>0 或 volumeKg 非空即写
            if (r.getTotalDays() > 0 || r.getTotalVolumeKg() != null) {
                BackupRecord patch = new BackupRecord();
                patch.setId(rec.getId());
                patch.setTotalDays(r.getTotalDays());
                patch.setTotalVolumeKg(r.getTotalVolumeKg());
                backupRecordMapper.updateById(patch);
            }
            return r;
        } catch (IOException | RuntimeException e) {
            log.warn("recalc backup {} stats failed: {}", rec.getId(), e.getMessage());
            return null;
        }
    }
}
