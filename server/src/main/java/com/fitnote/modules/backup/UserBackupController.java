package com.fitnote.modules.backup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.entity.BackupRecord;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.backup.dto.BackupQueryDTO;
import com.fitnote.modules.backup.support.BackupStatsExtractResult;
import com.fitnote.modules.backup.support.BackupStatsExtractor;
import com.fitnote.modules.backup.vo.BackupListVO;
import com.fitnote.modules.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 普通用户（小程序 / APP / H5）自己的云端备份接口
 * 路径：/api/backup/**（与管理员端 /api/admin/backup/** 独立）
 *
 * 权限：必须是 USER 类型 JWT（由 JwtAuthFilter + anyRequest.authenticated 保证）
 * 所有操作仅能看到 / 操作当前用户自己的备份。
 */
@Slf4j
@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
public class UserBackupController {

    private final BackupService backupService;
    private final UserService userService;
    private final SysUserMapper userMapper;

    @Value("${fitnote.backup.base-dir:./data/backups}")
    private String backupBaseDir;

    /**
     * 当前用户的备份列表（分页）
     */
    @GetMapping("/list")
    public Result<PageVO<BackupListVO>> myList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String keyword
    ) {
        Long userId = com.fitnote.security.SecurityUtils.getUserIdOrThrow();
        BackupQueryDTO q = new BackupQueryDTO();
        q.setPage(page);
        q.setSize(size);
        q.setUserId(userId);
        q.setKeyword(keyword);
        return Result.ok(backupService.page(q));
    }

    /**
     * 上传一份备份（multipart/form-data）
     * 参数：file   —— JSON 文件（由小程序写入临时文件后上传）
     *       note   —— 可选备注
     */
    @PostMapping("/upload")
    public Result<BackupListVO> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "note", required = false) String note,
            HttpServletRequest request
    ) throws Exception {
        Long userId = com.fitnote.security.SecurityUtils.getUserIdOrThrow();

        if (file == null || file.isEmpty()) {
            return Result.fail(com.fitnote.common.ResultCode.BAD_REQUEST, "备份文件为空");
        }
        String originalName = file.getOriginalFilename();
        long size = file.getSize();

        // 存储路径：{baseDir}/{userId}/{yyyyMM}/{uuid}.json
        LocalDateTime now = LocalDateTime.now();
        String monthDir = String.format("%04d%02d", now.getYear(), now.getMonthValue());
        Path userDir = Paths.get(backupBaseDir, String.valueOf(userId), monthDir);
        Files.createDirectories(userDir);

        String storedName = UUID.randomUUID().toString().replace("-", "") + ".json";
        Path target = userDir.resolve(storedName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        // 解析 JSON 提取统计字段（含容量）
        String version = "1.0";
        BackupStatsExtractResult stats = new BackupStatsExtractResult();
        try {
            String content = new String(Files.readAllBytes(target), StandardCharsets.UTF_8);
            ObjectMapper om = new ObjectMapper();
            JsonNode root = om.readTree(content);
            stats = BackupStatsExtractor.extract(root);
            if (root.has("version") && root.get("version").isTextual()) {
                version = root.get("version").asText();
            }
        } catch (Exception e) {
            // 解析失败也允许保存，统计字段保留默认 0
            log.warn("backup upload stats parse failed for userId={}: {}", userId, e.getMessage());
        }

        BackupRecord r = new BackupRecord();
        r.setUserId(userId);
        r.setFileName(originalName == null || originalName.isEmpty() ? storedName : originalName);
        r.setFilePath(target.toAbsolutePath().toString().replace("\\", "/"));
        r.setFileSize(size);
        r.setBackupType(1); // 1 = 用户云端备份
        r.setVersion(version);
        r.setTotalDays(stats.getTotalDays());
        r.setTotalTemplates(stats.getTotalTemplates());
        r.setTotalActions(stats.getTotalActions());
        r.setTotalVolumeKg(stats.getTotalVolumeKg());
        r.setRemark(note);
        BackupListVO saved = backupService.saveMine(r);

        // ---------- 关键点：反写 SysUser 训练统计 ----------
        // 用 GREATEST 原子更新，确保并发安全且不降值
        try {
            userService.updateStatsGreatest(userId, stats.getTotalDays(), stats.getTotalVolumeKg());
        } catch (Exception e) {
            // 反写失败不影响上传成功（后续 Dashboard 兜底 / refresh 可恢复）
            log.warn("backup upload → update sys_user stats greatest failed, userId={}: {}", userId, e.getMessage());
        }

        return Result.ok(saved);
    }

    /**
     * 下载当前用户自己的备份文件（返回 JSON 内容流）
     */
    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long id) throws Exception {
        Long userId = com.fitnote.security.SecurityUtils.getUserIdOrThrow();
        BackupRecord r = backupService.ensureOwned(id, userId);

        File f = new File(r.getFilePath());
        if (!f.exists() || !f.isFile()) {
            return ResponseEntity.notFound().build();
        }
        Resource res = new FileSystemResource(f);
        String name = r.getFileName() == null ? ("backup_" + id + ".json") : r.getFileName();
        String encoded = URLEncoder.encode(name, StandardCharsets.UTF_8.name()).replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/json;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + name + "\"; filename*=UTF-8''" + encoded)
                .contentLength(f.length())
                .body(res);
    }

    /**
     * 当前用户删除自己的备份（逻辑删除 + 同时删除物理文件）
     */
    @DeleteMapping("/{id}")
    public Result<?> deleteMine(@PathVariable Long id) throws Exception {
        Long userId = com.fitnote.security.SecurityUtils.getUserIdOrThrow();
        BackupRecord r = backupService.ensureOwned(id, userId);
        backupService.delete(id);
        try {
            if (r.getFilePath() != null) {
                Files.deleteIfExists(Paths.get(r.getFilePath()));
            }
        } catch (Exception ignore) {}
        return Result.ok();
    }
}
