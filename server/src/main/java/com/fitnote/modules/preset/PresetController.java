package com.fitnote.modules.preset;

import com.fitnote.common.Result;
import com.fitnote.modules.preset.vo.PresetVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 小程序端公开接口（无需登录）*/
@RestController
@RequestMapping("/api/preset")
@RequiredArgsConstructor
public class PresetController {

    private final PresetPackService presetPackService;

    @GetMapping("/list")
    public Result<List<PresetVO>> list() {
        return Result.ok(presetPackService.publicList());
    }

    @GetMapping("/{id}")
    public Result<PresetVO> detail(@PathVariable Long id) {
        return Result.ok(presetPackService.publicDetail(id));
    }
}
