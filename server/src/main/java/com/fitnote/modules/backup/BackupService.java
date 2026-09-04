package com.fitnote.modules.backup;

import com.fitnote.common.PageVO;
import com.fitnote.modules.backup.dto.BackupQueryDTO;
import com.fitnote.modules.backup.vo.BackupListVO;

public interface BackupService {
    PageVO<BackupListVO> page(BackupQueryDTO query);

    void delete(Long id);

    BackupListVO detail(Long id);

    /** 保存用户上传的备份记录（返回 VO） */
    BackupListVO saveMine(com.fitnote.entity.BackupRecord record);

    /**
     * 校验某条备份记录是否属于 userId：
     *   - 不存在 → NOT_FOUND
     *   - 不属于该用户 → FORBIDDEN
     *   校验通过则返回完整记录
     */
    com.fitnote.entity.BackupRecord ensureOwned(Long id, Long userId);
}
