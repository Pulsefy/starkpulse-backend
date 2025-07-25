import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Chain } from '../enums/chain.enum';

@Entity('blockchains')
export class Blockchain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Chain, unique: true })
  chain: Chain;
}
