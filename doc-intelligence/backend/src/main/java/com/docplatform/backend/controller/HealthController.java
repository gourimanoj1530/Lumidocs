package com.docplatform.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Health check endpoint.
 * Test it with: curl http://localhost:8080/api/health
 * Should return: {"status":"ok","timestamp":"..."}
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "service", "doc-intelligence-backend",
            "timestamp", OffsetDateTime.now().toString()
        ));
    }
}
