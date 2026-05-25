package com.docplatform.backend.controller;

import com.docplatform.backend.entity.Document;
import com.docplatform.backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST API for document operations.
 *
 * Endpoints:
 *   POST   /api/documents/upload          — upload a file
 *   GET    /api/documents                 — list all documents for a user
 *   GET    /api/documents/{id}            — get one document
 *   DELETE /api/documents/{id}            — delete a document
 *
 * NOTE: userId is passed as a header for now.
 *       When we add JWT auth, it'll come from the token instead.
 */
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")  // allow the React dev server
public class DocumentController {

    private final DocumentService documentService;

    /**
     * Upload a document.
     *
     * Test with curl:
     *   curl -X POST http://localhost:8080/api/documents/upload \
     *     -H "X-User-Id: 00000000-0000-0000-0000-000000000001" \
     *     -F "file=@/path/to/your/document.pdf"
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("X-User-Id") String userId) {

        log.info("Upload request: file={}, size={}, userId={}", 
            file.getOriginalFilename(), file.getSize(), userId);

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "File is empty"));
        }

        Document document = documentService.uploadDocument(file, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", document.getId(),
            "name", document.getOriginalName(),
            "type", document.getFileType(),
            "size", document.getFileSize(),
            "status", document.getStatus(),
            "uploadedAt", document.getCreatedAt()
        ));
    }

    /**
     * List all documents for a user.
     *
     * Test with curl:
     *   curl http://localhost:8080/api/documents \
     *     -H "X-User-Id: 00000000-0000-0000-0000-000000000001"
     */
    @GetMapping
    public ResponseEntity<List<Document>> listDocuments(
            @RequestHeader("X-User-Id") String userId) {
        List<Document> documents = documentService.getUserDocuments(userId);
        return ResponseEntity.ok(documents);
    }

    /**
     * Get a single document by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDocument(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String userId) {
        Document doc = documentService.getDocument(id, userId);
        return ResponseEntity.ok(doc);
    }

    /**
     * Delete a document (removes from both MinIO and the database).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String userId) {
        documentService.deleteDocument(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Global error handler for this controller.
     * Returns a clean JSON error instead of an HTML stack trace.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleError(Exception e) {
        log.error("Controller error: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", e.getMessage()));
    }
}