package personal.project.teamwork_management.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.jsoup.Jsoup;
import org.jsoup.helper.W3CDom;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.DocumentType;
import org.jsoup.nodes.Entities;
import org.jsoup.parser.Parser;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;

@Service
public class HtmlToPdfService {

    public void writePdf(String html, Path out) throws Exception {
        if (html == null || html.isBlank()) {
            throw new IllegalArgumentException("HTML is empty.");
        }

        Files.createDirectories(out.getParent());

        // 1) Loại BOM + trim
        html = stripBom(html).strip();

        // 2) Parse bằng XML parser (ép well-formed)
        Document doc = Jsoup.parse(html, "", Parser.xmlParser());
        doc.outputSettings()
                .syntax(Document.OutputSettings.Syntax.xml)
                .escapeMode(Entities.EscapeMode.xhtml)
                .charset("UTF-8")
                .prettyPrint(true);

        // 3) Bỏ DOCTYPE an toàn (không dùng removeIf vì list có thể unmodifiable)
        for (org.jsoup.nodes.Node n : new ArrayList<>(doc.childNodes())) {
            if (n instanceof DocumentType) {
                n.remove();
            }
        }

        // 4) Đảm bảo có <html> + namespace XHTML
        if (doc.selectFirst("html") == null) {
            String body = doc.body() != null ? doc.body().html() : doc.html();
            doc = Jsoup.parse(
                    "<html xmlns=\"http://www.w3.org/1999/xhtml\">" +
                            "<head><meta charset=\"UTF-8\"/></head><body>" +
                            body +
                            "</body></html>", "", Parser.xmlParser());
        } else {
            doc.selectFirst("html").attr("xmlns", "http://www.w3.org/1999/xhtml");
        }

        // 5) Meta charset
        if (doc.selectFirst("meta[charset]") == null) {
            doc.head().prependElement("meta").attr("charset", "UTF-8");
        }

        // 6) Ghi file debug (hữu ích khi lỗi HTML)
        Path debugHtml = out.getParent().resolve("_debug-latest.html");
        Files.writeString(debugHtml, doc.outerHtml(),
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

        // 7) Render PDF
        org.w3c.dom.Document w3cDoc = new W3CDom().fromJsoup(doc);

        try (OutputStream os = Files.newOutputStream(out,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {

            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();

            // Nếu có ảnh/CSS tương đối, truyền baseUri (ví dụ: "file:/absolute/path/to/assets/")
            String baseUri = null;
            builder.withW3cDocument(w3cDoc, baseUri);

            // Đăng ký font Unicode (nếu có trong resources/fonts)
            registerFontIfPresent(builder, "/fonts/NotoSans-Regular.ttf", "NotoSans", 400);
            registerFontIfPresent(builder, "/fonts/NotoSans-Bold.ttf", "NotoSans", 700);

            builder.toStream(os);
            builder.run();
        }
    }

    private void registerFontIfPresent(PdfRendererBuilder builder, String classpathTtf, String family, int weight) {
        InputStream in = getClass().getResourceAsStream(classpathTtf);
        if (in != null) {
            builder.useFont(() -> getClass().getResourceAsStream(classpathTtf), family, weight, PdfRendererBuilder.FontStyle.NORMAL, true);
        }
        // nếu null thì bỏ qua, tránh NPE
    }

    private static String stripBom(String s) {
        if (s == null || s.isEmpty()) return s;
        if (s.startsWith("\uFEFF")) return s.substring(1); // UTF-8 BOM char
        if (s.length() >= 3 &&
                s.charAt(0) == '\u00EF' && s.charAt(1) == '\u00BB' && s.charAt(2) == '\u00BF') {
        return s.substring(3); // BOM bytes -> string
    }
        return s;
    }


}
