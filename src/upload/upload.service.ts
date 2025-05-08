import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
        },
      },
    });

    if (!document) {
      throw new Error('Documento não encontrado ou não pertence ao usuário');
    }

    return document;
  }
}
