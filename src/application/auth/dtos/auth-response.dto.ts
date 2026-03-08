import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;
}

export class CustomerProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'Kwame' })
  firstName!: string;

  @ApiProperty({ example: 'Mensah' })
  lastName!: string;

  @ApiProperty({ example: 'kwame@example.com' })
  email!: string;

  @ApiProperty({ example: '+233201234567', required: false })
  phone?: string;

  @ApiProperty({ example: 'CUSTOMER' })
  role!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;
}
