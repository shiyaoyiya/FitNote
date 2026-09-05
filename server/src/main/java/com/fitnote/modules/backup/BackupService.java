package com.fitnote.modules.backup;

import com.fitnote.common.PageVO;
import com.fitnote.entity.BackupRecord;
import com.fitnote.modules.backup.dto.BackupQueryDTO;
import com.fitnote.modules.backup.vo.BackupListVO;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;

public interface BackupService {
    PageVO<BackupListVO> page(BackupQueryDTO query);

    void delete(Long id);

    BackupListVO detail(Long id);

    /** 保存用户上传的备份记录（返回 VO） */
    BackupListVO saveMine(BackupRecord record);

    /**
     * 按备份 ID 把物理文件打包成下载响应（含 UTF-8 文件名头、JSON Content-Type）。
     * 管理端 / 用户端共用，不做权限校验，由各自 Controller 决定谁能调用。
     * 文件不存在 → 抛出 BusinessException(NOT_FOUND)。
     */
    ResponseEntity<Resource> downloadBackupAsResponse(Long id);

    /**
     * 校验某条备份记录是否属于 userId：
     *   - 不存在 → NOT_FOUND
     *   - 不属于该用户 → FORBIDDEN
     *   校验通过则返回完整记录
     */
    BackupRecord ensureOwned(Long id, Long userId);
}
