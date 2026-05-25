package com.docplatform.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class DocxParserService {

    public List<PdfParserService.PageText> extractPages(InputStream inputStream) {
        List<PdfParserService.PageText> pages = new ArrayList<>();

        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            StringBuilder content = new StringBuilder();
            int sectionNumber = 1;

            // Extract paragraphs
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                String text = paragraph.getText().trim();
                if (!text.isEmpty()) {
                    // Treat each heading as a new "page" for chunking purposes
                    if (paragraph.getStyle() != null &&
                        paragraph.getStyle().toLowerCase().contains("heading")) {
                        if (content.length() > 0) {
                            pages.add(new PdfParserService.PageText(sectionNumber++, content.toString().trim()));
                            content = new StringBuilder();
                        }
                    }
                    content.append(text).append("\n");
                }
            }

            // Extract tables as structured text
            for (XWPFTable table : document.getTables()) {
                content.append("\n[TABLE]\n");
                for (XWPFTableRow row : table.getRows()) {
                    List<String> cells = new ArrayList<>();
                    row.getTableCells().forEach(cell -> cells.add(cell.getText().trim()));
                    content.append(String.join(" | ", cells)).append("\n");
                }
                content.append("[/TABLE]\n");
            }

            // Add remaining content
            if (content.length() > 0) {
                pages.add(new PdfParserService.PageText(sectionNumber, content.toString().trim()));
            }

            log.info("Extracted {} sections from DOCX", pages.size());

        } catch (Exception e) {
            log.error("Failed to parse DOCX: {}", e.getMessage(), e);
            throw new RuntimeException("DOCX parsing failed: " + e.getMessage(), e);
        }

        return pages;
    }
}