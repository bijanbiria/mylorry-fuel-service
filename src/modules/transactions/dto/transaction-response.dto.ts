import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standardized response for a processed fuel transaction.
 * Used by WebhooksController to respond to station callbacks.
 */
export class TransactionResponseDto {
  @ApiProperty({ example: 'approved', description: 'Transaction status' })
  status!: 'approved' | 'rejected';

  @ApiPropertyOptional({
    example: 'd3c1f9b6-2f2a-42a9-9f0f-1f91a6f7465d',
    description: 'Internal transaction ID (when approved)',
  })
  transactionId?: string;

  @ApiPropertyOptional({
    example: 'Limit exceeded',
    description: 'Reason for rejection (if applicable)',
  })
  reason?: string;

  constructor(partial?: Partial<TransactionResponseDto>) {
    if (partial) Object.assign(this, partial);
  }
}