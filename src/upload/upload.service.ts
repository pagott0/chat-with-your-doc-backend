import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Prisma para acesso ao banco
import * as fs from 'fs/promises';
@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async saveDocument(userId: string, file: Express.Multer.File) {
    const fileBuffer = await fs.readFile(file.path);
    return this.prisma.uploadedDocument.create({
      data: {
        userId,
        file: fileBuffer,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    });
  }
}
