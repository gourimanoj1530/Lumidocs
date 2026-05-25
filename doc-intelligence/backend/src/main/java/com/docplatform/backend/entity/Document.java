package com.docplatform.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID; // still used for document id

/**
 * Maps to the `documents` table created by init.sql.
 * Each row = one uploaded file (PDF, DOCX, CSV etc.)
 */
@Entity
@Table(name = "documents")
@Data                   // Lombok: generates getters, setters, toString, equals
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String filename;          // sanitised filename stored in MinIO

    @Column(name = "original_name", nullable = false)
    private String originalName;      // what the user named the file

    @Column(name = "file_type", nullable = false)
    private String fileType;          // "pdf", "docx", "csv"

    @Column(name = "file_size")
    private Long fileSize;            // bytes

    @Column(name = "minio_bucket", nullable = false)
    private String minioBucket;

    @Column(name = "minio_key", nullable = false)
    private String minioKey;          // path inside the bucket

    @Column
    @Builder.Default
    private String status = "uploaded";  // uploaded | processing | ready | failed

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}