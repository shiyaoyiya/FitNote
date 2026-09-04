package com.fitnote.modules.admin;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.admin.dto.AdminSaveDTO;
import com.fitnote.modules.admin.dto.ResetPwdDTO;
import com.fitnote.modules.admin.dto.SaveRoleMenuDTO;
import com.fitnote.modules.admin.vo.AdminVO;
import com.fitnote.modules.admin.vo.MenuTreeVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

/** 管理员体系（ADMIN 专属）*/
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminUserMgmtController {

    private final SysAdminService sysAdminService;

    /* ---------- Admin 列表/CRUD ---------- */

    @GetMapping("/list")
    @PreAuthorize("hasPermission('', 'admin:list')")
    public Result<PageVO<AdminVO>> page(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) Integer status) {
        return Result.ok(sysAdminService.page(page, size, keyword, roleCode, status));
    }

    @PostMapping("/save")
    @PreAuthorize("hasPermission('', 'admin:edit')")
    public Result<Long> saveOrUpdate(@Valid @RequestBody AdminSaveDTO dto) {
        return Result.ok(sysAdminService.saveOrUpdate(dto));
    }

    @PutMapping("/{id}/reset-pwd")
    @PreAuthorize("hasPermission('', 'admin:edit')")
    public Result<?> resetPwd(@PathVariable Long id, @Valid @RequestBody ResetPwdDTO dto) {
        sysAdminService.resetPassword(id, dto);
        return Result.ok();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasPermission('', 'admin:edit')")
    public Result<?> setStatus(@PathVariable Long id, @RequestParam Integer status) {
        sysAdminService.setStatus(id, status);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasPermission('', 'admin:edit')")
    public Result<?> delete(@PathVariable Long id) {
        sysAdminService.delete(id);
        return Result.ok();
    }

    /* ---------- 角色菜单 ---------- */

    @GetMapping("/menu/tree")
    @PreAuthorize("hasPermission('', 'admin:rolemenu')")
    public Result<List<MenuTreeVO>> menuTree() {
        return Result.ok(sysAdminService.menuTree());
    }

    @GetMapping("/role/menu-ids")
    @PreAuthorize("hasPermission('', 'admin:rolemenu')")
    public Result<List<Long>> roleMenuIds(@RequestParam String roleCode) {
        return Result.ok(sysAdminService.getRoleMenuIds(roleCode));
    }

    @PostMapping("/role/menu")
    @PreAuthorize("hasPermission('', 'admin:rolemenu')")
    public Result<?> saveRoleMenu(@Valid @RequestBody SaveRoleMenuDTO dto) {
        sysAdminService.saveRoleMenu(dto);
        return Result.ok();
    }
}
