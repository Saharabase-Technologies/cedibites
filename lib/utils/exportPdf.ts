interface ExportElementToPdfOptions {
  element: HTMLElement;
  filename: string;
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-');

  if (cleaned.toLowerCase().endsWith('.pdf')) {
    return cleaned;
  }

  return `${cleaned}.pdf`;
}

export async function exportElementToPdf(options: ExportElementToPdfOptions): Promise<void> {
  const { element, filename } = options;
  const [{ toPng }, { jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ]);

  const imageData = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    filter: (node) => {
      if (!(node instanceof HTMLElement)) {
        return true;
      }

      if (node.hasAttribute('data-export-ignore')) {
        return false;
      }

      return true;
    },
  });

  const image = new Image();
  image.src = imageData;
  await image.decode();

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const imageHeight = (image.height * contentWidth) / image.width;

  let heightLeft = imageHeight;
  let position = margin;

  pdf.addImage(imageData, 'PNG', margin, position, contentWidth, imageHeight);
  heightLeft -= contentHeight;

  while (heightLeft > 0) {
    pdf.addPage();
    position = margin - (imageHeight - heightLeft);
    pdf.addImage(imageData, 'PNG', margin, position, contentWidth, imageHeight);
    heightLeft -= contentHeight;
  }

  pdf.save(sanitizeFilename(filename));
}
