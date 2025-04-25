import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PriceService } from './price.service';
import { TokenPrice } from './entities/token-price.entity';
import { NftPrice } from './entities/nft-price.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenPrice, NftPrice]),
    HttpModule,
    ConfigModule,
  ],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}
