package com.docplatform.backend.dto;

import java.util.List;

public record ChatResponse(
    String answer,
    List<String> sourceChunks,   // the text chunks used to answer
    String documentId
) {}