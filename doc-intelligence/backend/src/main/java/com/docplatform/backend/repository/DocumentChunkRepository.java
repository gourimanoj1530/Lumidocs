package com.docplatform.backend.repository;

import com.docplatform.backend.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    List<DocumentChunk> findByDocumentIdOrderByChunkIndex(UUID documentId);

    void deleteByDocumentId(UUID documentId);

    @Query(value = """
        SELECT * FROM document_chunks
        WHERE (:documentId IS NULL OR document_id = CAST(:documentId AS uuid))
          AND embedding IS NOT NULL
        ORDER BY embedding <=> CAST(:queryVector AS vector)
        LIMIT :topK
        """, nativeQuery = true)
    List<DocumentChunk> findSimilarChunks(
        @Param("queryVector") String queryVector,
        @Param("documentId") String documentId,
        @Param("topK") int topK
    );

    @Modifying
@Transactional
@Query(value = """
    INSERT INTO document_chunks
    (id, document_id, chunk_index, content, token_count, page_number, embedding, created_at)
    VALUES (gen_random_uuid(), CAST(:docId AS uuid), :idx, :content, :tokens, :page,
            CAST(:embedding AS vector), NOW())
    """, nativeQuery = true)
void saveChunkWithEmbedding(
    @Param("docId") UUID docId,
    @Param("idx") int idx,
    @Param("content") String content,
    @Param("tokens") int tokens,
    @Param("page") int page,
    @Param("embedding") String embedding
);

    long countByDocumentIdAndEmbeddingIsNotNull(UUID documentId);
}