package com.fitnote.modules.feedback;

import com.fitnote.common.PageVO;
import com.fitnote.modules.feedback.dto.FeedbackPageQuery;
import com.fitnote.modules.feedback.dto.HandleFeedbackDTO;
import com.fitnote.modules.feedback.dto.SubmitFeedbackDTO;
import com.fitnote.modules.feedback.vo.FeedbackVO;

public interface FeedbackService {
    Long submit(SubmitFeedbackDTO dto, Long userId);

    PageVO<FeedbackVO> myFeedback(Long userId, Integer page, Integer size);

    PageVO<FeedbackVO> adminPage(FeedbackPageQuery query);

    FeedbackVO detail(Long id, Long adminIdNullable);

    void handle(Long id, HandleFeedbackDTO dto, Long adminId);
}
