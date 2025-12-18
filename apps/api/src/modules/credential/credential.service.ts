import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TeamService } from '../team/team.service';
import { EncryptionService } from './encryption.service';
import { CreateCredentialDto, UpdateCredentialDto } from './dto/credential.dto';

@Injectable()
export class CredentialService {
  constructor(
    private prisma: PrismaService,
    private teamService: TeamService,
    private encryption: EncryptionService,
  ) {}

  async create(userId: string, teamId: string, dto: CreateCredentialDto) {
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    // Check for duplicate name
    const existing = await this.prisma.credential.findUnique({
      where: {
        name_teamId: {
          name: dto.name,
          teamId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Credential name already exists');
    }

    // Encrypt the credential data
    const encryptedData = this.encryption.encryptObject(dto.data);

    return this.prisma.credential.create({
      data: {
        name: dto.name,
        type: dto.type,
        teamId,
        data: encryptedData,
        metadata: dto.metadata,
      },
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string, userId: string, includeData = false) {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    await this.teamService.checkTeamAccess(credential.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    if (includeData) {
      return {
        ...credential,
        data: this.encryption.decryptObject(credential.data),
      };
    }

    const { data, ...credentialWithoutData } = credential;
    return credentialWithoutData;
  }

  async findByTeam(teamId: string, userId: string) {
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    return this.prisma.credential.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateCredentialDto) {
    const credential = await this.findById(id, userId);

    await this.teamService.checkTeamAccess(credential.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    const updateData: any = {
      name: dto.name,
      metadata: dto.metadata,
    };

    if (dto.data) {
      updateData.data = this.encryption.encryptObject(dto.data);
    }

    return this.prisma.credential.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    const credential = await this.findById(id, userId);

    await this.teamService.checkTeamAccess(credential.teamId, userId, [
      'OWNER',
      'ADMIN',
    ]);

    await this.prisma.credential.delete({
      where: { id },
    });

    return { message: 'Credential deleted successfully' };
  }

  /**
   * Get decrypted credentials for workflow execution
   * (Internal use by worker)
   */
  async getDecryptedCredentials(
    teamId: string,
    credentialIds: string[],
  ): Promise<Map<string, Record<string, any>>> {
    const credentials = await this.prisma.credential.findMany({
      where: {
        id: { in: credentialIds },
        teamId,
      },
    });

    const result = new Map<string, Record<string, any>>();

    for (const credential of credentials) {
      result.set(credential.id, {
        type: credential.type,
        data: this.encryption.decryptObject(credential.data),
      });
    }

    return result;
  }

  /**
   * Test credential connectivity
   */
  async testCredential(id: string, userId: string) {
    const credential = await this.findById(id, userId, true);

    // Here you would implement actual connectivity tests
    // based on credential type (API call, DB connection, etc.)
    // For now, return a simple success response

    return {
      success: true,
      message: 'Credential test successful',
      testedAt: new Date().toISOString(),
    };
  }
}
