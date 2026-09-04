package com.fitnote.modules.announce;

import com.fitnote.modules.announce.dto.AnnounceSaveDTO;

public interface AnnouncementService {
    Long saveOrUpdate(AnnounceSaveDTO dto, Long adminId);

    void publish(Long id, Long adminId);

    void withdraw(Long id, Long adminId);

    void delete(Long id);
}
