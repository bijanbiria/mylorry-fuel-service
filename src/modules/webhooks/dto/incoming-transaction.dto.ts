import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

/**
 * Incoming transaction payload from fuel station webhook.
 * Note:
 * - `amountCents` is a numeric string in minor currency units (e.g., cents).
 * - `occurredAt` must be an ISO-8601 datetime string (UTC recommended).
 * - `cardNumber` is the raw PAN as received; the service should hash/mask it before use.
 */
export class IncomingTransactionDto {
  @ApiProperty({ example: 'STN-001', description: 'Fuel station code' })
  @IsString()
  @IsNotEmpty()
  stationCode!: string;

  @ApiProperty({
    example: '4242424242424242',
    description:
      'Card PAN as received from the station. Service should hash/mask before lookup.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(8, 32) // allow masked/short test values in dev; adjust as needed
  cardNumber!: string;

  @ApiProperty({
    example: '10000',
    description:
      'Transaction amount in minor units (e.g., cents). Numeric string only.',
  })
  @IsNumberString()
  @IsNotEmpty()
  amountCents!: string;

  @ApiProperty({ example: 'USD', description: 'ISO currency code' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({
    example: '2025-09-03T10:00:00Z',
    description: 'ISO-8601 timestamp when the transaction occurred',
  })
  @IsISO8601()
  occurredAt!: string;

  @ApiPropertyOptional({
    example: 'RRN-123456',
    description: 'Optional external reference from the station/acquirer',
  })
  @IsOptional()
  @IsString()
  externalRef?: string;
}