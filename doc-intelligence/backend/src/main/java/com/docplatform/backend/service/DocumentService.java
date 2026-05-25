package com.docplatform.backend.service;

import com.docplatform.backend.entity.Document;
import com.docplatform.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Business logic for document operations.
 * Coordinates between MinioService (file storage) and DocumentRepository (database).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final IngestionService ingestionService;
    private final DocumentRepository documentRepository;
    private final MinioService minioService;

    @Value("${minio.bucket.documents}")
    private String documentsBucket;

    // Allowed file types — reject anything else
    private static final Set<String> ALLOWED_TYPES = Set.of(
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  // .docx
        "text/csv",
        "application/csv"
    );

    /**
     * Handles a document upload:
     * 1. Validates the file type
     * 2. Uploads the file to MinIO
     * 3. Saves document metadata to PostgreSQL
     * 4. Returns the saved Document
     */
    public Document uploadDocument(MultipartFile file, String userId) {
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(
                "Unsupported file type: " + contentType +
                ". Allowed: PDF, DOCX, CSV"
            );
        }

        // Determine the simple file type label
        String fileType = detectFileType(contentType);

        // Upload to MinIO — get back the storage key
        String minioKey = minioService.uploadFile(file, userId);

        // Save metadata to PostgreSQL
        Document document = Document.builder()
            .userId(userId)
            .filename(minioKey.substring(minioKey.lastIndexOf('/') + 1))
            .originalName(file.getOriginalFilename())
            .fileType(fileType)
            .fileSize(file.getSize())
            .minioBucket(documentsBucket)
            .minioKey(minioKey)
            .status("uploaded")
            .build();

        Document saved = documentRepository.save(document);
        log.info("Document saved: id={}, name={}, type={}", saved.getId(), saved.getOriginalName(), fileType);

        ingestionService.ingest(saved.getId());
        //       (chunking + embedding) — we'll add this in the next step

        return saved;
    }

    /**
     * Returns all documents belonging to a user, newest first.
     */
    public List<Document> getUserDocuments(String userId) {
        return documentRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Returns a single document by ID.
     * Throws if not found or if it belongs to a different user.
     */
    public Document getDocument(UUID documentId, String userId) {
        Document doc = documentRepository.findById(documentId)
            .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

        if (!doc.getUserId().equals(userId)) {
            throw new RuntimeException("Access denied to document: " + documentId);
        }

        return doc;
    }

    /**
     * Deletes a document from both MinIO and the database.
     */
    public void deleteDocument(UUID documentId, String userId) {
        Document doc = getDocument(documentId, userId);
        minioService.deleteFile(doc.getMinioKey());
        documentRepository.delete(doc);
        log.info("Deleted document: id={}", documentId);
    }

    // ── Helpers ─────────────────────────────────────────────

    private String detectFileType(String contentType) {
        return switch (contentType) {
            case "application/pdf" -> "pdf";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "docx";
            case "text/csv", "application/csv" -> "csv";
            default -> "unknown";
        };
    }
}