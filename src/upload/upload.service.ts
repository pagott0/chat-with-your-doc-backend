import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Prisma para acesso ao banco
import * as fs from 'fs/promises';
import * as Tesseract from 'tesseract.js';
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
}
