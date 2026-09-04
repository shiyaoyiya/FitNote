package com.fitnote.modules.template.service;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fitnote.entity.SharedTemplate;
import com.fitnote.mapper.SharedTemplateMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TemplateCountServiceImpl implements TemplateCountService {

    private final SharedTemplateMapper sharedTemplateMapper;

    @Override
    public void incrView(Long id) {
        sharedTemplateMapper.update(null, new LambdaUpdateWrapper<SharedTemplate>()
                .eq(SharedTemplate::getId, id)
                .setSql("view_count = view_count + 1"));
    }

    @Override
    public void incrDownload(Long id) {
        sharedTemplateMapper.update(null, new LambdaUpdateWrapper<SharedTemplate>()
                .eq(SharedTemplate::getId, id)
                .setSql("download_count = download_count + 1"));
    }

    @Override
    public void incrCollect(Long id) {
        sharedTemplateMapper.update(null, new LambdaUpdateWrapper<SharedTemplate>()
                .eq(SharedTemplate::getId, id)
                .setSql("collect_count = collect_count + 1"));
    }

    @Override
    public void decrCollect(Long id) {
        // 不低于 0
        sharedTemplateMapper.update(null, new LambdaUpdateWrapper<SharedTemplate>()
                .eq(SharedTemplate::getId, id)
                .setSql("collect_count = GREATEST(collect_count - 1, 0)"));
    }
}
