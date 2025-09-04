import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction-response.dto';

/** Machine-readable error for the envelope. */
export class ApiErrorDto {
  @ApiProperty({ example: 'INSUFFICIENT_FUNDS' })
  code!: string;

  @ApiPropertyOptional({ description: 'Optional debug payload' })
  details?: any;
}

/** Standard envelope returned by the controller. */
export class TransactionEnvelopeDto {
  @ApiProperty({ type: () => TransactionResponseDto, nullable: true })
  data!: TransactionResponseDto | null;

  @ApiProperty({ nullable: true, example: 'Approved' })
  message!: string | null;

  @ApiProperty({ type: () => ApiErrorDto, nullable: true })
  error!: ApiErrorDto | null;
}