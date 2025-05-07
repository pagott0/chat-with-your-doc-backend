import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { PrismaService } from '../prisma/prisma.service'; // Supondo que você tenha um serviço Prisma configurado para acessar o banco
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

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
    return uploadedDocument;
  }
}
