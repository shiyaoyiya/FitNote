package com.fitnote.modules.preset;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.preset.dto.PresetSaveDTO;
import com.fitnote.modules.preset.vo.PresetVO;
import com.fitnote.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/** 管理端预设模板包（ADMIN 专属）*/
@RestController
@RequestMapping("/api/admin/preset")
@RequiredArgsConstructor
public class AdminPresetController {

    private final PresetPackService presetPackService;

    @GetMapping("/page")
    @PreAuthorize("hasPermission('', 'preset:list')")
    public Result<PageVO<PresetVO>> page(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer enabled,
            @RequestParam(required = false) Integer difficulty,
            @RequestParam(required = false) String keyword) {
        return Result.ok(presetPackService.adminPage(page, size, enabled, difficulty, keyword));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasPermission('', 'preset:list')")
    public Result<PresetVO> detail(@PathVariable Long id) {
        return Result.ok(presetPackService.adminDetail(id));
    }

    @PostMapping
    @PreAuthorize("hasPermission('', 'preset:edit')")
    public Result<Long> saveOrUpdate(@Valid @RequestBody PresetSaveDTO dto) {
        return Result.ok(presetPackService.saveOrUpdate(dto, SecurityUtils.getAdminIdOrThrow()));
    }

    @PutMapping("/{id}/enabled")
    @PreAuthorize("hasPermission('', 'preset:edit')")
    public Result<?> setEnabled(@PathVariable Long id, @RequestParam Integer enabled) {
        presetPackService.setEnabled(id, enabled);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasPermission('', 'preset:edit')")
    public Result<?> delete(@PathVariable Long id) {
        presetPackService.delete(id);
        return Result.ok();
    }
}
