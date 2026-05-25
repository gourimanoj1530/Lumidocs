package com.docplatform.backend.dto;

public record ChatRequest(
    String question,
    String documentId   // optional — null means search all documents
) {}