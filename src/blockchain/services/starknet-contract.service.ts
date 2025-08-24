/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { RpcProvider, Account, Contract, Abi } from 'starknet';
import { getABI } from '../abi-manager';

@Injectable()
export class StarknetContractService {
  private provider: RpcProvider;
  private account: Account;

  constructor() {
    this.provider = new RpcProvider({
      nodeUrl: process.env.STARKNET_RPC_URL,
    });
    this.account = new Account(
      this.provider,
      process.env.STARKNET_ACCOUNT_ADDRESS || '',
      process.env.STARKNET_ACCOUNT_PRIVATE_KEY || '',
    );
  }

  async getContract(address: string, abiName: string): Promise<Contract> {
    const abi = (await getABI(abiName)) as unknown as Abi;
    return new Contract(abi, address, this.provider);
  }

  async call(
    address: string,
    abiName: string,
    method: string,
    args: any[],
  ): Promise<any> {
    const contract = await this.getContract(address, abiName);
    return contract.call(method, args);
  }

  async execute(
    address: string,
    abiName: string,
    method: string,
      args: string[],
    ): Promise<any> {
      const contract = await this.getContract(address, abiName);
    contract.connect(this.account);
    const calldata: string[] = await contract.populateTransaction[method](...args) as string[];
    await this.account.estimateFee({
      contractAddress: address,
      entrypoint: method,
      calldata,
    });
    const tx = await this.account.execute({
      contractAddress: address,
      entrypoint: method,
      calldata,
      // maxFee: fee.suggestedMaxFee, // Removed as it is not a valid property
    });
    return tx.transaction_hash;
  }
}
