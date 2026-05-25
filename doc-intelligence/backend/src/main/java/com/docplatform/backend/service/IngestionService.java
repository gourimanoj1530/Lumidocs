package com.docplatform.backend.service;

import com.docplatform.backend.entity.Document;
import com.docplatform.backend.entity.DocumentChunk;
import com.docplatform.backend.repository.DocumentChunkRepository;
import com.docplatform.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates the full ingestion pipeline:
 *   1. Download the file from MinIO
 *   2. Parse text from PDF
 *   3. Split into chunks
 *   4. Embed each chunk via OpenAI
 *   5. Save chunks + vectors to pgvector
 *   6. Update document status to "ready"
 *
 * The @Async annotation means this runs in a background thread —
 * the upload API returns immediately (status: "uploaded") and
 * ingestion happens in the background.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IngestionService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final MinioService minioService;
    private final PdfParserService pdfParserService;
    private final ChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final DocxParserService docxParserService;
    private final CsvParserService csvParserService;    

    /**
     * Run the full ingestion pipeline for a document.
     * Called automatically after a successful upload.
     *
     * @Async means the HTTP response returns before this finishes.
     */
    @Async
    public void ingest(UUID documentId) {
        log.info("Starting ingestion for document: {}", documentId);

        // Mark as processing
        Document document = documentRepository.findById(documentId)
            .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));
        document.setStatus("processing");
        documentRepository.save(document);

        try {
            // ── Step 1: Download from MinIO ───────────────────────
            log.info("Downloading file from MinIO: {}", document.getMinioKey());
            InputStream fileStream = minioService.downloadFile(document.getMinioKey());

            // ── Step 2: Parse text from PDF ───────────────────────
            List<PdfParserService.PageText> pages = switch (document.getFileType()) {
                case "pdf"  -> pdfParserService.extractPages(fileStream);
                case "docx" -> docxParserService.extractPages(fileStream);
                case "csv"  -> csvParserService.extractPages(fileStream);
                default -> throw new RuntimeException("Unsupported file type: " + document.getFileType());
            };

            // ── Step 3: Chunk the text ────────────────────────────
            List<ChunkingService.Chunk> chunks = chunkingService.chunkPages(pages);
            log.info("Document {} split into {} chunks", documentId, chunks.size());

            // ── Step 4 & 5: Embed each chunk and save ─────────────
            int saved = 0;
            for (ChunkingService.Chunk chunk : chunks) {
                try {
                    // Call OpenAI embeddings API
                    float[] vector = embeddingService.embed(chunk.content());
                    String vectorString = embeddingService.vectorToString(vector);

                    // Save chunk + embedding to database
                    chunkRepository.saveChunkWithEmbedding(
                        documentId,
                        chunk.index(),
                        chunk.content(),
                        chunk.tokenCount(),
                        chunk.pageNumber(),
                        vectorString
                    );                    
                    saved++;

                    // Small delay to avoid hitting OpenAI rate limits
                    Thread.sleep(100);

                } catch (Exception e) {
                    log.error("Failed to embed chunk {} for document {}: {}",
                        chunk.index(), documentId, e.getMessage());
                    // Continue with remaining chunks even if one fails
                }
            }

            // ── Step 6: Mark document as ready ────────────────────
            document.setStatus("ready");
            documentRepository.save(document);

            log.info("Ingestion complete for document {}. Embedded {}/{} chunks.",
                documentId, saved, chunks.size());

        } catch (Exception e) {
            log.error("Ingestion failed for document {}: {}", documentId, e.getMessage(), e);
            document.setStatus("failed");
            documentRepository.save(document);
        }
    }
}
