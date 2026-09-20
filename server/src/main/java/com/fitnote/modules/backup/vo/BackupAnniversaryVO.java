package com.fitnote.modules.backup.vo;

import lombok.Data;

/**
 * 备份中纪念日 VO
 */
@Data
public class BackupAnniversaryVO {
    private String id;
    private String title;
    private String date;
    private String type;
    private String emoji;
}
