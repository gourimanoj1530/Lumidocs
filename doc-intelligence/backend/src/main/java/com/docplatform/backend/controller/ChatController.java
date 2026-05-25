package com.docplatform.backend.controller;

import com.docplatform.backend.dto.ChatRequest;
import com.docplatform.backend.dto.ChatResponse;
import com.docplatform.backend.entity.DocumentChunk;
import com.docplatform.backend.service.RagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class ChatController {

    private final RagService ragService;

    /**
     * Ask a question about a document (or all documents).
     *
     * Test with:
     * curl -X POST http://localhost:8080/api/chat \
     *   -H "Content-Type: application/json" \
     *   -H "X-User-Id: 00000000-0000-0000-0000-000000000001" \
     *   -d "{\"question\":\"What is this document about?\",\"documentId\":null}"
     */
    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @RequestBody ChatRequest request,
            @RequestHeader("X-User-Id") String userId) {

        log.info("Chat request: question='{}', documentId={}", request.question(), request.documentId());

        // Get the answer via RAG
        String answer = ragService.answer(request.question(), request.documentId());

        // Get source chunks for citation
        List<DocumentChunk> sources = ragService.getSourceChunks(request.question(), request.documentId());
        List<String> sourceTexts = sources.stream()
            .map(c -> "Page " + c.getPageNumber() + ": " + c.getContent().substring(0, Math.min(150, c.getContent().length())) + "...")
            .toList();

        return ResponseEntity.ok(new ChatResponse(answer, sourceTexts, request.documentId()));
    }
}