package com.docplatform.backend.service;

import com.docplatform.backend.entity.DocumentChunk;
import com.docplatform.backend.repository.DocumentChunkRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {

    private final DocumentChunkRepository chunkRepository;
    private final EmbeddingService embeddingService;

    @Value("${gemini.api-key}")
    private String apiKey;

    private static final String GROQ_URL =
        "https://api.groq.com/openai/v1/chat/completions";

    @Value("${groq.api-key}")
    private String groqApiKey;  
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Full RAG pipeline:
     * 1. Embed the user's question
     * 2. Find the most similar chunks in pgvector
     * 3. Build a prompt with those chunks as context
     * 4. Call Gemini and return the answer
     */
    public String answer(String question, String documentId) {
        // Step 1 — embed the question
        log.info("RAG: embedding question");
        float[] queryVector = embeddingService.embed(question);
        String queryVectorString = embeddingService.vectorToString(queryVector);

        // Step 2 — find top 5 similar chunks
        log.info("RAG: searching pgvector for relevant chunks");
        List<DocumentChunk> chunks = chunkRepository.findSimilarChunks(
            queryVectorString,
            documentId,
            5
        );

        if (chunks.isEmpty()) {
            return "I couldn't find any relevant information in the document to answer your question.";
        }

        log.info("RAG: found {} relevant chunks", chunks.size());

        // Step 3 — build the prompt
        StringBuilder context = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            context.append("--- Excerpt ").append(i + 1)
                   .append(" (page ").append(chunks.get(i).getPageNumber()).append(") ---\n")
                   .append(chunks.get(i).getContent())
                   .append("\n\n");
        }

        String prompt = """
            You are a helpful document assistant. Answer the user's question based ONLY on the document excerpts provided below.
            If the answer is not in the excerpts, say "I don't have enough information in the document to answer that."
            Be concise and precise. Cite page numbers when relevant.
            
            DOCUMENT EXCERPTS:
            %s
            
            USER QUESTION:
            %s
            
            ANSWER:
            """.formatted(context.toString(), question);

        // Step 4 — call Gemini
        log.info("RAG: calling Gemini for answer");
        return callGroq(prompt);
    }

    /**
     * Returns the source chunks used for a given question (for citation UI).
     */
    public List<DocumentChunk> getSourceChunks(String question, String documentId) {
        float[] queryVector = embeddingService.embed(question);
        String queryVectorString = embeddingService.vectorToString(queryVector);
        return chunkRepository.findSimilarChunks(queryVectorString, documentId, 5);
    }

    private String callGroq(String prompt) {
    try {
        Map<String, Object> requestBody = Map.of(
            "model", "llama-3.3-70b-versatile",
            "messages", List.of(
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.3,
            "max_tokens", 1024
        );

        String json = objectMapper.writeValueAsString(requestBody);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GROQ_URL))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + groqApiKey)
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();

        HttpResponse<String> response = httpClient.send(
            request, HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() != 200) {
            log.error("Groq API error: status={}, body={}", response.statusCode(), response.body());
            throw new RuntimeException("Groq API returned " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        return root.path("choices").get(0).path("message").path("content").asText();

    } catch (Exception e) {
        log.error("Groq chat call failed: {}", e.getMessage(), e);
        throw new RuntimeException("Chat failed: " + e.getMessage(), e);
    }
}
    }