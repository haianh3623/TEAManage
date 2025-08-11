package personal.project.teamwork_management.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HtmlReportRenderer {

    private final TemplateEngine templateEngine; // Thymeleaf

    public String renderHtml(String template, Map<String, Object> model) {
        Context ctx = new Context(Locale.forLanguageTag("vi"));
        ctx.setVariables(model);
        return templateEngine.process(template, ctx);
    }
}
