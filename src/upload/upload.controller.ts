import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  UseGuards,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { PrismaService } from '../prisma/prisma.service'; // Supondo que você tenha um serviço Prisma configurado para acessar o banco
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Response } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    const userId = req.user.userId;
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'Somente arquivos de imagem são permitidos!',
      );
    }

    // Verificar tamanho do arquivo (exemplo de 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('O arquivo é muito grande!');
    }

    const uploadedDocument = await this.uploadService.saveDocument(
      userId,
      file,
    );
    return {
      id: uploadedDocument.id,
      fileName: uploadedDocument.fileName,
      extractedText: uploadedDocument.extractedText,
    };
  }

  @Get()
  async getUserDocuments(@Request() req) {
    const userId = req.user.userId;
    return this.uploadService.getDocumentsByUser(userId);
  }

  @Get(':id')
  async getDocumentById(@Param('id') documentId: string, @Request() req) {
    const userId = req.user.userId;
    const document = await this.uploadService.getDocumentWithMessages(
      userId,
      Number(documentId),
    );
    return document;
  }

  @Post(':id/message')
  async sendMessageToDocument(
    @Param('id') documentId: number,
    @Body('content') content: string,
    @Body('imageExtractedText') imageExtractedText: string,
    @Request() req,
  ) {
    const userId = req.user.userId;

    if (!content || content.trim() === '') {
      throw new BadRequestException('A mensagem não pode estar vazia.');
    }

    const messages = await this.uploadService.addMessage(
      userId,
      Number(documentId),
      content,
      imageExtractedText,
    );
    return messages;
  }

  @Get(':id/download')
  async downloadDocument(
    @Param('id') id: string,
    @Res() res: Response,
    @Request() req,
  ) {
    const userId = req.user.userId;
    const pdfBuffer = await this.uploadService.generatePdfWithMessages(
      userId,
      Number(id),
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="document-${id}.pdf"`,
    });

    res.send(pdfBuffer);
  }
}
