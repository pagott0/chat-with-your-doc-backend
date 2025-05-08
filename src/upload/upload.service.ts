import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Prisma para acesso ao banco
import * as fs from 'fs/promises';
import * as Tesseract from 'tesseract.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async saveDocument(userId: string, file: Express.Multer.File) {
    const fileBuffer = await fs.readFile(file.path);
    let extractedText = '';

    try {
      const { data } = await Tesseract.recognize(file.path, 'eng+por');
      extractedText = data.text;
      console.log(extractedText);
    } catch (error) {
      console.error('Erro ao extrair texto com OCR:', error);
    }

    return this.prisma.uploadedDocument.create({
      data: {
        userId,
        file: fileBuffer,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        extractedText,
      },
    });
  }

  async getDocumentsByUser(userId: string) {
    return this.prisma.uploadedDocument.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addMessage(
    userId: string,
    documentId: number,
    content: string,
    imageExtractedText: string,
  ) {
    // Salva a mensagem do usuário
    const userMessage = await this.prisma.message.create({
      data: {
        userId,
        documentId,
        role: 'user',
        content,
      },
    });

    // Chamada para a LLM via OpenRouter
    let assistantResponse = '';
    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant that helps to interpret invoices sent by the user. The text extracted from the document is: ' +
                  imageExtractedText,
              },
              { role: 'user', content },
            ],
          }),
        },
      );

      const data = await response.json();
      console.log(data);
      assistantResponse =
        data.choices?.[0]?.message?.content ||
        'Não consegui gerar uma resposta.';
    } catch (error) {
      console.error('Erro ao chamar LLM:', error);
      throw new InternalServerErrorException('Erro ao gerar resposta da IA');
    }

    // Salva a resposta do assistente
    const assistantMessage = await this.prisma.message.create({
      data: {
        userId,
        documentId,
        role: 'assistant',
        content: assistantResponse,
      },
    });

    return [userMessage, assistantMessage];
  }

  async getDocumentWithMessages(userId: string, documentId: number) {
    const document = await this.prisma.uploadedDocument.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            role: true,
            content: true,
          },
        },
      },
    });

    if (!document) {
      throw new Error('Documento não encontrado ou não pertence ao usuário');
    }

    return document;
  }

  async generatePdfWithMessages(userId: string, documentId: number) {
    const document = await this.prisma.uploadedDocument.findUnique({
      where: { id: documentId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!document || document.userId !== userId) {
      throw new Error('Documento não encontrado ou não pertence ao usuário.');
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const separator =
      '------------------------------------------------------------------------------------------------------------------------';
    const fontSizeTitle = 18;
    const fontSizeText = 12;
    const lineHeight = 16;
    const margin = 50;

    const splitTextIntoLines = (text: string, maxWidth: number) => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSizeText);
        if (testWidth > maxWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // 1. Página com a imagem
    if (document.fileType.startsWith('image/')) {
      const imageBytes = document.file as Buffer;
      const image =
        document.fileType === 'image/png'
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

      const imagePage = pdfDoc.addPage([image.width, image.height]);
      imagePage.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    // 2. Página com texto extraído
    let textPage = pdfDoc.addPage();
    const { width, height } = textPage.getSize();
    let y = height - margin;

    textPage.drawText('Extracted text from the document', {
      x: margin,
      y,
      size: fontSizeTitle,
      font: boldFont,
    });
    y -= lineHeight * 2;

    textPage.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= lineHeight * 1.5;

    const extractedTextLines = splitTextIntoLines(
      document.extractedText.replace(/\n/g, ' '),
      width - margin * 2,
    );

    for (const line of extractedTextLines) {
      if (y - lineHeight < margin) {
        const newPage = pdfDoc.addPage();
        y = height - margin;
        textPage = newPage;
      }
      textPage.drawText(line, {
        x: margin,
        y,
        size: fontSizeText,
        font,
      });
      y -= lineHeight;
    }

    // 3. Páginas com mensagens
    let messagePage = pdfDoc.addPage();
    y = height - margin;

    messagePage.drawText(`Questions and answers related to the document`, {
      x: margin,
      y,
      size: fontSizeTitle,
      font: boldFont,
    });
    y -= lineHeight * 2;

    for (const message of document.messages) {
      const label = message.role === 'user' ? 'Question:' : 'Answer:';
      const cleanText = message.content.replace(/\n/g, ' ');
      const lines = splitTextIntoLines(cleanText, width - margin * 2);
      const spaceNeeded = (lines.length + 3) * lineHeight;

      if (y - spaceNeeded < margin) {
        messagePage = pdfDoc.addPage();
        y = height - margin;
      }

      messagePage.drawText(label, {
        x: margin,
        y,
        size: fontSizeText,
        font: boldFont,
      });
      y -= lineHeight;

      for (const line of lines) {
        messagePage.drawText(line, {
          x: margin,
          y,
          size: fontSizeText,
          font,
        });
        y -= lineHeight;
      }

      y -= lineHeight / 2;

      if (message.role === 'assistant') {
        messagePage.drawText(separator, {
          x: margin,
          y,
          size: fontSizeText,
          font,
          color: rgb(0.7, 0.7, 0.7),
        });
        y -= lineHeight * 1.5;
      }
    }

    return await pdfDoc.save();
  }
}
