package com.fitnote.modules.template.service;

/**
 * 模板计数服务：浏览/下载/收藏计数的原子自增自减。
 */
public interface TemplateCountService {
    void incrView(Long id);

    void incrDownload(Long id);

    void incrCollect(Long id);

    void decrCollect(Long id);
}
