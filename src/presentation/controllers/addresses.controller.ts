import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AddressesService } from '../../application/addresses/services/addresses.service.js';
import { CreateAddressDto } from '../../application/addresses/dtos/create-address.dto.js';
import { UpdateAddressDto } from '../../application/addresses/dtos/update-address.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  async create(
    @Body() dto: CreateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addressesService.create(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all addresses' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an address by ID' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addressesService.findById(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addressesService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addressesService.remove(id, user.userId);
  }
}
