package com.docplatform.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class PdfParserService {

    public List<PageText> extractPages(InputStream inputStream) {
        List<PageText> pages = new ArrayList<>();
        try {
            byte[] pdfBytes = inputStream.readAllBytes();
            try (PDDocument document = Loader.loadPDF(pdfBytes)) {
                int pageCount = document.getNumberOfPages();
                log.info("Parsing PDF with {} pages", pageCount);
                PDFTextStripper stripper = new PDFTextStripper();
                for (int i = 1; i <= pageCount; i++) {
                    stripper.setStartPage(i);
                    stripper.setEndPage(i);
                    String text = stripper.getText(document).trim();
                    if (!text.isEmpty()) {
                        pages.add(new PageText(i, text));
                    }
                }
                log.info("Extracted text from {} non-empty pages", pages.size());
            }
        } catch (Exception e) {
            log.error("Failed to parse PDF", e);
            throw new RuntimeException("PDF parsing failed: " + e.getMessage(), e);
        }
        return pages;
    }

    public record PageText(int pageNumber, String text) {}
}