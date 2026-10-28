import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportResumeToPdf(elementId, filename = "Resume.pdf") {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Resume element not found.");
  }

  // Hide action buttons during screenshot
  const buttons = element.querySelectorAll(".no-print");
  buttons.forEach(b => (b.style.display = "none"));

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    buttons.forEach(b => (b.style.display = ""));
  }
}
