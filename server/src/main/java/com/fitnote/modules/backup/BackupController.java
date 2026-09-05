package com.fitnote.modules.backup;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.backup.dto.BackupQueryDTO;
import com.fitnote.modules.backup.vo.BackupListVO;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/backup")
@RequiredArgsConstructor
public class BackupController {

    private final BackupService backupService;

    @GetMapping("/list")
    public Result<PageVO<BackupListVO>> list(@ModelAttribute BackupQueryDTO query) {
        return Result.ok(backupService.page(query));
    }

    @GetMapping("/{id}")
    public Result<BackupListVO> detail(@PathVariable Long id) {
        return Result.ok(backupService.detail(id));
    }

    /** 管理端下载指定备份（不校验所属用户，ADMIN 可以下载任意用户备份） */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        return backupService.downloadBackupAsResponse(id);
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        backupService.delete(id);
        return Result.ok();
    }
}
