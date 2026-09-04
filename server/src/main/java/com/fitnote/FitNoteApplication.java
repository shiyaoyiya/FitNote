package com.fitnote;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
@MapperScan("com.fitnote.mapper")
public class FitNoteApplication {
    public static void main(String[] args) {
        SpringApplication.run(FitNoteApplication.class, args);
    }
}
