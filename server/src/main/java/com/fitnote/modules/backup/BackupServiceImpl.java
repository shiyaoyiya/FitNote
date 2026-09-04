package com.fitnote.modules.backup;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.BackupRecord;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.BackupRecordMapper;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.backup.dto.BackupQueryDTO;
import com.fitnote.modules.backup.vo.BackupListVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BackupServiceImpl implements BackupService {

    private final BackupRecordMapper backupRecordMapper;
    private final SysUserMapper userMapper;

    @Override
    public PageVO<BackupListVO> page(BackupQueryDTO query) {
        int page = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        int size = query.getSize() == null || query.getSize() < 1 ? 10 : query.getSize();

        LambdaQueryWrapper<BackupRecord> wrapper = new LambdaQueryWrapper<>();
        if (query.getUserId() != null) {
            wrapper.eq(BackupRecord::getUserId, query.getUserId());
        }
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(BackupRecord::getFileName, query.getKeyword());
        }
        wrapper.orderByDesc(BackupRecord::getCreateTime);

        Page<BackupRecord> p = new Page<>(page, size);
        Page<BackupRecord> result = backupRecordMapper.selectPage(p, wrapper);
        List<BackupRecord> records = result.getRecords();
        if (records.isEmpty()) {
            return new PageVO<>(result.getTotal(), Collections.emptyList());
        }

        Set<Long> userIds = records.stream()
                .map(BackupRecord::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> userNames = userIds.isEmpty()
                ? Collections.emptyMap()
                : userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(SysUser::getId,
                        u -> u.getNickname() != null && !u.getNickname().isEmpty()
                                ? u.getNickname() : u.getUsername(),
                        (a, b) -> a));

        List<BackupListVO> vos = records.stream()
                .map(r -> toVO(r, userNames))
                .collect(Collectors.toList());
        return new PageVO<>(result.getTotal(), vos);
    }

    @Override
    public void delete(Long id) {
        // @TableLogic 已开启逻辑删除，deleteById 会自动改为 update deleted=1
        BackupRecord existing = backupRecordMapper.selectById(id);
        if (existing == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");
        backupRecordMapper.deleteById(id);
    }

    @Override
    public BackupListVO detail(Long id) {
        BackupRecord r = backupRecordMapper.selectById(id);
        if (r == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");
        Map<Long, String> userNames = Collections.emptyMap();
        if (r.getUserId() != null) {
            SysUser u = userMapper.selectById(r.getUserId());
            if (u != null) {
                String name = u.getNickname() != null && !u.getNickname().isEmpty()
                        ? u.getNickname() : u.getUsername();
                userNames = Collections.singletonMap(u.getId(), name);
            }
        }
        return toVO(r, userNames);
    }

    @Override
    public BackupListVO saveMine(BackupRecord record) {
        backupRecordMapper.insert(record);
        // 查回后返回（含自动填充 createTime）
        BackupRecord r = backupRecordMapper.selectById(record.getId());
        Map<Long, String> userNames = Collections.emptyMap();
        if (r.getUserId() != null) {
            SysUser u = userMapper.selectById(r.getUserId());
            if (u != null) {
                String name = u.getNickname() != null && !u.getNickname().isEmpty()
                        ? u.getNickname() : u.getUsername();
                userNames = Collections.singletonMap(u.getId(), name);
            }
        }
        return toVO(r, userNames);
    }

    @Override
    public BackupRecord ensureOwned(Long id, Long userId) {
        BackupRecord r = backupRecordMapper.selectById(id);
        if (r == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");
        if (userId == null || !userId.equals(r.getUserId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权操作该备份");
        }
        return r;
    }

    private BackupListVO toVO(BackupRecord r, Map<Long, String> userNames) {
        BackupListVO vo = new BackupListVO();
        vo.setId(r.getId());
        vo.setUserId(r.getUserId());
        vo.setUserName(r.getUserId() == null ? null : userNames.get(r.getUserId()));
        vo.setFileName(r.getFileName());
        vo.setFileSize(r.getFileSize());
        vo.setBackupType(r.getBackupType());
        vo.setVersion(r.getVersion());
        vo.setTotalDays(r.getTotalDays());
        vo.setTotalTemplates(r.getTotalTemplates());
        vo.setTotalActions(r.getTotalActions());
        vo.setTotalVolumeKg(r.getTotalVolumeKg());
        vo.setRemark(r.getRemark());
        vo.setCreateTime(r.getCreateTime());
        return vo;
    }
}
