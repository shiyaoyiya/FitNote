package com.fitnote.modules.backup;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.backup.dto.BackupQueryDTO;
import com.fitnote.modules.backup.vo.BackupListVO;
import com.fitnote.modules.backup.vo.BackupPreviewVO;
import com.fitnote.modules.backup.vo.BackupTemplateVO;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    /** 获取备份完整预览数据（概览、模板、训练数据、动作、纪念日） */
    @GetMapping("/{id}/preview")
    public Result<BackupPreviewVO> preview(@PathVariable Long id) {
        return Result.ok(backupService.getBackupPreview(id));
    }

    /** 获取备份中的模板列表（用于在线预览） */
    @GetMapping("/{id}/templates")
    public Result<List<BackupTemplateVO>> getTemplates(@PathVariable Long id) {
        return Result.ok(backupService.getBackupTemplates(id));
    }

    /** 导出备份中的模板为 JSON 格式（兼容备份导入格式） */
    @GetMapping("/{id}/export-templates")
    public ResponseEntity<Resource> exportTemplates(@PathVariable Long id) {
        return backupService.exportTemplatesAsText(id);
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        backupService.delete(id);
        return Result.ok();
    }
}
