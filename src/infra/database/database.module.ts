import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import dataSource from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSource.options,
      autoLoadEntities: true,
    }),
  ],
})
export class DatabaseModule {}