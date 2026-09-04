package com.fitnote.modules.announce;

import com.fitnote.common.PageVO;
import com.fitnote.common.Result;
import com.fitnote.modules.announce.vo.AnnounceVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** 小程序端公开接口：无需登录 */
@RestController
@RequestMapping("/api/announce")
@RequiredArgsConstructor
public class AnnounceController {

    private final AnnouncementServiceImpl announcementService;

    @GetMapping("/list")
    public Result<PageVO<AnnounceVO>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer type) {
        return Result.ok(announcementService.queryPublicPage(page, size, type));
    }

    @GetMapping("/{id}")
    public Result<AnnounceVO> detail(@PathVariable Long id) {
        return Result.ok(announcementService.getPublicDetail(id));
    }
}
