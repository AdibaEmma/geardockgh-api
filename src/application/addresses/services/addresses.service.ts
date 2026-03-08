import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { CreateAddressDto } from '../dtos/create-address.dto.js';
import type { UpdateAddressDto } from '../dtos/update-address.dto.js';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAddressDto, customerId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          customerId,
          label: dto.label,
          street: dto.street,
          city: dto.city,
          region: dto.region,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async findAll(customerId: string) {
    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string, customerId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(id: string, dto: UpdateAddressDto, customerId: string) {
    await this.findById(id, customerId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { customerId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: dto,
      });
    });
  }

  async remove(id: string, customerId: string) {
    await this.findById(id, customerId);
    await this.prisma.address.delete({ where: { id } });
    return { message: 'Address deleted' };
  }
}
