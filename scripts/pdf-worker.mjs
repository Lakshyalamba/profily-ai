// Isolated, time-limited extraction process. No secrets are passed into its environment.
import { getDocumentProxy } from "unpdf";
let size = 0;
const chunks = [];
try {
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) throw Error("too large");
    chunks.push(chunk);
  }
  const pdf = await getDocumentProxy(new Uint8Array(Buffer.concat(chunks)), {
    verbosity: 0,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    maxImageSize: 0,
    stopAtErrors: true,
  });
  try {
    if (pdf.numPages > 10) throw Error("TOO_MANY_PAGES");
    const pages = [];
    let chars = 0;
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      chars += text.length;
      if (chars > 60000 || text.length > 16000) throw Error("TOO_MUCH_TEXT");
      pages.push(text);
      page.cleanup();
    }
    process.stdout.write(JSON.stringify({ pages }));
  } finally {
    await pdf.loadingTask.destroy();
  }
} catch (e) {
  process.stdout.write(
    JSON.stringify({
      error:
        e instanceof Error && /^TOO_/.test(e.message)
          ? e.message
          : "UNREADABLE_PDF",
    }),
  );
  process.exitCode = 1;
}
