package com.docplatform.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One chunk of text from a document, plus its embedding vector.
 * Maps to the document_chunks table created by init.sql.
 *
 * The embedding column is type `vector(1536)` in Postgres —
 * we store it as a float array and convert manually (pgvector
 * doesn't have a native JPA type yet).
 */
@Entity
@Table(name = "document_chunks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "token_count")
    private Integer tokenCount;

    @Column(name = "page_number")
    private Integer pageNumber;

    // We store the embedding as a plain string in pgvector format: "[0.1,0.2,...]"
    // and use a native query for similarity search
    @Column(columnDefinition = "vector(3072)")
    private String embedding;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
