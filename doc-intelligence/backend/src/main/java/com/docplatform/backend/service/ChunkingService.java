package com.docplatform.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Splits document text into overlapping chunks suitable for embedding.
 *
 * Why chunking?
 *   LLMs have context limits. If you embed an entire 50-page document
 *   as one vector, you lose granularity — the embedding averages everything.
 *   Small chunks (300-500 words) let the vector capture specific ideas.
 *
 * Why overlap?
 *   A sentence at the boundary of two chunks would be split in half.
 *   Overlapping ensures every sentence appears fully in at least one chunk.
 */
@Service
@Slf4j
public class ChunkingService {

    // Target chunk size in words (~500 tokens ≈ 375 words for English text)
    private static final int CHUNK_SIZE_WORDS = 375;

    // How many words to repeat at the start of each new chunk
    private static final int OVERLAP_WORDS = 50;

    /**
     * Splits a list of pages into overlapping text chunks.
     *
     * @param pages  extracted pages from PdfParserService
     * @return list of Chunk objects ready for embedding
     */
    public List<Chunk> chunkPages(List<PdfParserService.PageText> pages) {
        // Combine all page text into one string, tracking page boundaries
        StringBuilder fullText = new StringBuilder();
        for (PdfParserService.PageText page : pages) {
            fullText.append(page.text()).append("\n\n");
        }

        // Split into words
        String[] words = fullText.toString().split("\\s+");
        List<Chunk> chunks = new ArrayList<>();
        int chunkIndex = 0;

        int start = 0;
        while (start < words.length) {
            int end = Math.min(start + CHUNK_SIZE_WORDS, words.length);

            // Build the chunk text from words[start..end]
            StringBuilder chunkText = new StringBuilder();
            for (int i = start; i < end; i++) {
                if (i > start) chunkText.append(" ");
                chunkText.append(words[i]);
            }

            String content = chunkText.toString().trim();
            if (!content.isEmpty()) {
                // Estimate which page this chunk is on (rough heuristic)
                int estimatedPage = estimatePage(pages, start, words.length);

                chunks.add(new Chunk(
                    chunkIndex++,
                    content,
                    content.split("\\s+").length,  // word count as token estimate
                    estimatedPage
                ));
            }

            // Move forward by chunk size minus overlap
            start += (CHUNK_SIZE_WORDS - OVERLAP_WORDS);
        }

        log.info("Created {} chunks from {} pages", chunks.size(), pages.size());
        return chunks;
    }

    /**
     * Rough estimate of which page a word at position `wordIndex` is on.
     * Good enough for citation purposes.
     */
    private int estimatePage(List<PdfParserService.PageText> pages, int wordIndex, int totalWords) {
        if (pages.isEmpty()) return 1;
        double ratio = (double) wordIndex / totalWords;
        int estimatedPage = (int) (ratio * pages.size()) + 1;
        return Math.min(estimatedPage, pages.size());
    }

    /**
     * A single text chunk ready for embedding.
     */
    public record Chunk(
        int index,
        String content,
        int tokenCount,
        int pageNumber
    ) {}
}
