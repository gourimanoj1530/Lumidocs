package com.docplatform.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables Spring's @Async support so IngestionService.ingest()
 * runs in a background thread pool instead of blocking the HTTP request.
 *
 * Without this, uploading a 50-page PDF would make the user wait
 * 30+ seconds while all the embeddings are generated.
 * With this, the upload returns in <1 second and ingestion happens silently.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
    // Spring uses a default thread pool for @Async methods.
    // For production, configure a custom Executor here with
    // specific pool size and queue limits.
}
