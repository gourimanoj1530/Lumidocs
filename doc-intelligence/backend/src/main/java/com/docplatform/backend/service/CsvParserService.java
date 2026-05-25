package com.docplatform.backend.service;

import com.opencsv.CSVReader;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@Slf4j
public class CsvParserService {

    private static final int ROWS_PER_CHUNK = 50;

    public List<PdfParserService.PageText> extractPages(InputStream inputStream) {
        List<PdfParserService.PageText> pages = new ArrayList<>();

        try (CSVReader reader = new CSVReader(new InputStreamReader(inputStream))) {
            List<String[]> allRows = reader.readAll();

            if (allRows.isEmpty()) {
                return pages;
            }

            // First row is the header
            String[] headers = allRows.get(0);
            String headerLine = String.join(" | ", headers);

            // Split into chunks of ROWS_PER_CHUNK rows
            int chunkNumber = 1;
            StringBuilder chunk = new StringBuilder();
            chunk.append("Columns: ").append(headerLine).append("\n\n");

            for (int i = 1; i < allRows.size(); i++) {
                String[] row = allRows.get(i);

                // Build a readable row: "ColumnName: value, ColumnName: value"
                StringBuilder rowText = new StringBuilder("Row ").append(i).append(": ");
                for (int j = 0; j < headers.length && j < row.length; j++) {
                    if (j > 0) rowText.append(", ");
                    rowText.append(headers[j]).append(": ").append(row[j]);
                }
                chunk.append(rowText).append("\n");

                // Start a new chunk every ROWS_PER_CHUNK rows
                if ((i % ROWS_PER_CHUNK) == 0) {
                    pages.add(new PdfParserService.PageText(chunkNumber++, chunk.toString().trim()));
                    chunk = new StringBuilder();
                    chunk.append("Columns: ").append(headerLine).append("\n\n");
                }
            }

            // Add remaining rows
            if (chunk.length() > 0 && !chunk.toString().trim().equals("Columns: " + headerLine)) {
                pages.add(new PdfParserService.PageText(chunkNumber, chunk.toString().trim()));
            }

            log.info("Extracted {} chunks from CSV with {} total rows",
                pages.size(), allRows.size() - 1);

        } catch (Exception e) {
            log.error("Failed to parse CSV: {}", e.getMessage(), e);
            throw new RuntimeException("CSV parsing failed: " + e.getMessage(), e);
        }

        return pages;
    }
}