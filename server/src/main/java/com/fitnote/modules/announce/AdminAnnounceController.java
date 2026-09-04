package com.fitnote.modules.announce;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.announce.dto.AnnouncePageQuery;
import com.fitnote.modules.announce.dto.AnnounceSaveDTO;
import com.fitnote.modules.announce.vo.AnnounceVO;
import com.fitnote.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/** 管理端接口（ADMIN 专属） */
@RestController
@RequestMapping("/api/admin/announce")
@RequiredArgsConstructor
public class AdminAnnounceController {

    private final AnnouncementServiceImpl announcementService;

    @GetMapping("/page")
    @PreAuthorize("hasPermission('', 'announce:list')")
    public Result<PageVO<AnnounceVO>> page(@ModelAttribute AnnouncePageQuery query) {
        return Result.ok(announcementService.queryAdminPage(query));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasPermission('', 'announce:list')")
    public Result<AnnounceVO> detail(@PathVariable Long id) {
        return Result.ok(announcementService.getAdminDetail(id));
    }

    @PostMapping
    @PreAuthorize("hasPermission('', 'announce:publish')")
    public Result<Long> saveOrUpdate(@Valid @RequestBody AnnounceSaveDTO dto) {
        return Result.ok(announcementService.saveOrUpdate(dto, SecurityUtils.getAdminIdOrThrow()));
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("hasPermission('', 'announce:publish')")
    public Result<?> publish(@PathVariable Long id) {
        announcementService.publish(id, SecurityUtils.getAdminIdOrThrow());
        return Result.ok();
    }

    @PutMapping("/{id}/withdraw")
    @PreAuthorize("hasPermission('', 'announce:publish')")
    public Result<?> withdraw(@PathVariable Long id) {
        announcementService.withdraw(id, SecurityUtils.getAdminIdOrThrow());
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasPermission('', 'announce:publish')")
    public Result<?> delete(@PathVariable Long id) {
        announcementService.delete(id);
        return Result.ok();
    }
}
