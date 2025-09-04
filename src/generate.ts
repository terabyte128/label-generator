import fontkit from "@pdf-lib/fontkit";

import { PDFDocument, PDFPage, degrees, rgb } from "pdf-lib";
import JsBarcode from "jsbarcode";

import logo from "./assets/logo-white.png";
import roboto from "./assets/Roboto-Medium.ttf";
import template from "./assets/template.pdf";

const labelWidth = 144; // pageWidth  / 144 * 8.5 = 2"
const labelHeight = 54; // pageHeight / 54 * 11 = 0.75"
const labelBorder = 6;

const edgeMarginX = 45; // margin from left/right edge
const edgeMarginY = 45; // margin from top/bottom edge
const interMarginX = 45; // margin between labels horizontally
const interMarginY = 18; // margin between labels vertically

const drawBorders = false;
const debug = false;

async function drawLabel(
  prefix: string,
  page: PDFPage,
  itemId: number,
  x: number,
  y: number
) {
  // Set a compact barcode width for vertical barcode
  const barcodeWidth = 24; // px, adjust as needed for compactness
  const barcodeHeight = labelHeight - 2 * labelBorder;

  // Create canvas for barcode

  const canvas = document.createElement("canvas");
  canvas.width = barcodeWidth;
  canvas.height = barcodeHeight;
  JsBarcode(canvas, String(itemId), {
    format: "CODE128",
    width: barcodeWidth,
    height: barcodeHeight,
    displayValue: false,
    margin: 0,
  });

  const pngBuffer = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve)
  );

  if (!pngBuffer) {
    throw new Error("Failed to create barcode image");
  }

  const fontRsp = await fetch(roboto);
  const fontBuffer = await fontRsp.arrayBuffer();

  const font = await page.doc.embedFont(fontBuffer);
  // Embed barcode image into PDF, rotated 90° and positioned on the right
  const pngImage = await page.doc.embedPng(await pngBuffer.arrayBuffer());

  // Position: flush against right edge, vertical, with labelBorder padding
  // After rotation, width becomes barcodeHeight, height becomes barcodeWidth
  const imageX = x + labelWidth - labelBorder;
  const imageY = y + labelBorder;

  // Load and embed logo-white.png
  const logoRsp = await fetch(logo);
  const logoBuffer = await logoRsp.arrayBuffer();
  const logoImage = await page.doc.embedPng(logoBuffer);
  const logoDims = logoImage.scale(1);

  // Set logo height to fit within label minus vertical borders, but keep aspect ratio
  const maxLogoHeight = labelHeight - 2 * labelBorder;
  const logoHeight = Math.min(logoDims.height, maxLogoHeight);
  const logoWidth = (logoDims.width / logoDims.height) * logoHeight;

  // Vertically center logo in label
  const logoX = x + labelBorder;
  const logoY = y + (labelHeight - logoHeight) / 2;
  const logoBackgroundWidth = logoWidth + labelBorder + 10;

  // Draw logo background (#722918)
  page.drawRectangle({
    x: x - 5,
    y: y - 5,
    width: logoBackgroundWidth,
    height: labelHeight + 10,
    color: rgb(0.447, 0.161, 0.094), // #722918 as rgb
  });

  // Draw logo in white (using tint)
  page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  });

  // Draw text between logo and barcode, vertically and horizontally centered
  const fontSize = 14;
  const lineHeight = fontSize * 1.2;

  // Calculate text box between logo and barcode
  const textBoxX = logoX + logoBackgroundWidth;
  const textBoxWidth = imageX - textBoxX - labelBorder - barcodeWidth;

  // Measure each line's width
  const idText = String(itemId);
  const chtlWidth = font.widthOfTextAtSize(prefix, fontSize);
  const idWidth = font.widthOfTextAtSize(idText, fontSize);

  // Calculate vertical positions for each line
  const totalTextHeight = 2 * font.heightAtSize(fontSize);
  // Vertically center the text block in the label
  const startY = y + (labelHeight - totalTextHeight) / 2 + labelBorder / 2;

  // Draw "CHTL" horizontally centered
  page.drawText(prefix, {
    x: textBoxX + (textBoxWidth - chtlWidth) / 2,
    y: startY + lineHeight,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  // Draw itemId horizontally centered below
  page.drawText(idText, {
    x: textBoxX + (textBoxWidth - idWidth) / 2,
    y: startY,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  // Draw barcode on the right
  page.drawImage(pngImage, {
    x: imageX,
    y: imageY,
    width: barcodeHeight,
    height: barcodeWidth,
    rotate: degrees(90),
  });

  if (debug) {
    page.drawRectangle({
      x: x,
      y: y,
      width: labelWidth,
      height: labelHeight,
      borderColor: rgb(0, 1, 0),
      borderWidth: 1,
    });
  }
}

export async function generateLabels(prefix: string, itemIds: number[]) {
  const rsp = await fetch(template);
  const buf = await rsp.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  doc.registerFontkit(fontkit);

  const page = doc.getPage(0);

  if (!drawBorders) {
    page.drawRectangle({
      color: rgb(1, 1, 1),
      ...page.getSize(),
    });
  }

  const cols = 3;
  const rows = 10;

  let labelIndex = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const itemId = itemIds[labelIndex];
      if (!itemId) {
        break;
      }

      if (itemId == -1) {
        labelIndex++;
        continue;
      }

      console.log({ row, col, itemId });

      const x = edgeMarginX + col * (labelWidth + interMarginX);
      const y =
        page.getHeight() -
        edgeMarginY -
        (row + 1) * labelHeight -
        row * interMarginY;
      await drawLabel(prefix, page, itemId, x, y);
      labelIndex++;
    }
  }

  console.log("done");

  console.log(doc);
  return doc;
}
