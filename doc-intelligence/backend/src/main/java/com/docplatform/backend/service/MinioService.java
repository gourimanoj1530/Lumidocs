package com.docplatform.backend.service;

import io.minio.*;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * All MinIO (file storage) operations live here.
 * The rest of the app calls this service — nothing talks to MinIO directly.
 */
@Service
@RequiredArgsConstructor   // Lombok: generates constructor with all final fields
@Slf4j                     // Lombok: gives us a `log` variable for logging
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket.documents}")
    private String documentsBucket;

    /**
     * Uploads a file to MinIO and returns the key (path) it was stored under.
     *
     * @param file     the uploaded file from the HTTP request
     * @param userId   used to namespace files per user (userId/filename)
     * @return the MinIO key — store this in the database to retrieve the file later
     */
    public String uploadFile(MultipartFile file, String userId) {
        // Build a unique key so two users uploading "report.pdf" don't collide
        String originalFilename = file.getOriginalFilename();
        String extension = getExtension(originalFilename);
        String uniqueKey = userId + "/" + UUID.randomUUID() + "." + extension;

        try {
            // Make sure the bucket exists (MinioInit already created it, but just in case)
            ensureBucketExists(documentsBucket);

            // Upload the file
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(documentsBucket)
                    .object(uniqueKey)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build()
            );

            log.info("Uploaded file to MinIO: bucket={}, key={}", documentsBucket, uniqueKey);
            return uniqueKey;

        } catch (Exception e) {
            log.error("Failed to upload file to MinIO: {}", e.getMessage(), e);
            throw new RuntimeException("File upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Downloads a file from MinIO as a stream.
     * Use this to serve files back to the user or pass to the PDF parser.
     */
    public InputStream downloadFile(String key) {
        try {
            return minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(documentsBucket)
                    .object(key)
                    .build()
            );
        } catch (Exception e) {
            log.error("Failed to download file from MinIO: key={}", key, e);
            throw new RuntimeException("File download failed: " + e.getMessage(), e);
        }
    }

    /**
     * Deletes a file from MinIO (called when user deletes a document).
     */
    public void deleteFile(String key) {
        try {
            minioClient.removeObject(
                RemoveObjectArgs.builder()
                    .bucket(documentsBucket)
                    .object(key)
                    .build()
            );
            log.info("Deleted file from MinIO: key={}", key);
        } catch (Exception e) {
            log.error("Failed to delete file from MinIO: key={}", key, e);
            throw new RuntimeException("File deletion failed: " + e.getMessage(), e);
        }
    }

    // ── Helpers ─────────────────────────────────────────────

    private void ensureBucketExists(String bucket) throws Exception {
        boolean exists = minioClient.bucketExists(
            BucketExistsArgs.builder().bucket(bucket).build()
        );
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            log.info("Created MinIO bucket: {}", bucket);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "bin";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
