package personal.project.teamwork_management.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class HtmlToExcelService {

    public byte[] htmlTableToXlsx(String html, String tableSelector) throws Exception {
        var doc = Jsoup.parse(html);

        // 1) Lấy meta theo template hiện tại (và fallback theo id nếu có)
        Map<String, String> meta = extractMeta(doc);

        // 2) Lấy đúng table
        Elements tables = doc.select(tableSelector); // "#report-table"
        if (tables.isEmpty()) {
            throw new IllegalArgumentException("Table not found by selector: " + tableSelector);
        }
        Element table = tables.first();

        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {

            Sheet sheet = wb.createSheet("Report");
            int r = 0;

            // style bold cho meta / header
            CellStyle bold = wb.createCellStyle();
            var font = wb.createFont();
            font.setBold(true);
            bold.setFont(font);

            // 3) Ghi meta lên đầu sheet
            if (!meta.isEmpty()) {
                String title = meta.getOrDefault("Project", "");
                if (!title.isBlank()) {
                    Row row = sheet.createRow(r++);
                    Cell c0 = row.createCell(0);
                    c0.setCellValue(title);
                    c0.setCellStyle(bold);
                }
                // các dòng meta khác
                if (meta.containsKey("Status")) {
                    Row row = sheet.createRow(r++);
                    Cell k = row.createCell(0); k.setCellValue("Status"); k.setCellStyle(bold);
                    row.createCell(1).setCellValue(meta.get("Status"));
                }
                if (meta.containsKey("Progress")) {
                    Row row = sheet.createRow(r++);
                    Cell k = row.createCell(0); k.setCellValue("Progress"); k.setCellStyle(bold);
                    row.createCell(1).setCellValue(meta.get("Progress"));
                }
                if (meta.containsKey("Generated At")) {
                    Row row = sheet.createRow(r++);
                    Cell k = row.createCell(0); k.setCellValue("Generated At"); k.setCellStyle(bold);
                    row.createCell(1).setCellValue(meta.get("Generated At"));
                }
                r++; // dòng trống
            }

            // 4) Ghi header (nếu có)
            Elements ths = table.select("thead tr th");
            int headerColCount = 0;
            if (!ths.isEmpty()) {
                Row row = sheet.createRow(r++);
                int c = 0;
                for (Element th : ths) {
                    Cell cell = row.createCell(c++);
                    cell.setCellValue(th.text());
                    cell.setCellStyle(bold);
                }
                headerColCount = ths.size();
            }

            // 5) Ghi body (hỗ trợ có/không tbody)
            Elements bodyRows = table.select("tbody tr");
            if (bodyRows.isEmpty()) bodyRows = table.select("> tr");

            for (Element tr : bodyRows) {
                Row row = sheet.createRow(r++);
                int c = 0;
                for (Element td : tr.select("td, th")) {
                    row.createCell(c++).setCellValue(td.text());
                }
            }

            // 6) Auto-size cột
            int colCountToSize = headerColCount;
            if (colCountToSize == 0) {
                for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row != null && row.getLastCellNum() > colCountToSize) {
                        colCountToSize = row.getLastCellNum();
                    }
                }
            }
            for (int i = 0; i < colCountToSize; i++) {
                try { sheet.autoSizeColumn(i); } catch (Exception ignored) {}
            }

            wb.write(bos);
            return bos.toByteArray();
        }
    }

    // Phù hợp với template bạn gửi: <h1>Project Name</h1> + <div class="meta">…</div>
    private Map<String, String> extractMeta(org.jsoup.nodes.Document doc) {
        Map<String, String> meta = new LinkedHashMap<>();

        // Project (tên dự án): lấy từ <h1>
        String project = textOrEmpty(doc.selectFirst("body > h1"));
        if (project.isBlank()) {
            // fallback nếu sau này bạn thêm id khác
            project = textOrEmpty(doc.selectFirst("#project-name, #report-title, h1"));
        }
        if (!project.isBlank()) meta.put("Project", project);

        // Khối meta
        Elements metaDivs = doc.select("div.meta > div");
        if (!metaDivs.isEmpty()) {
            // Dòng 1: Status + Progress
            Element line1 = metaDivs.get(0);
            Elements spans1 = line1.select("span");
            if (spans1.size() >= 1) {
                String status = spans1.get(0).text();
                if (!status.isBlank()) meta.put("Status", status);
            }
            if (spans1.size() >= 2) {
                String progress = spans1.get(1).text();
                if (!progress.isBlank()) {
                    // Template đã có dấu %, nhưng nếu không có thì thêm
                    if (!progress.endsWith("%")) progress = progress + "%";
                    meta.put("Progress", progress);
                }
            }

            // Dòng 2: Generated At
            if (metaDivs.size() >= 2) {
                Element line2 = metaDivs.get(1);
                Element span = line2.selectFirst("span");
                if (span != null && !span.text().isBlank()) {
                    meta.put("Generated At", span.text());
                }
            }
        }

        return meta;
    }

    private String textOrEmpty(Element el) {
        return el == null ? "" : el.text();
    }
}
