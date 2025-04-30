/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { RpcProvider, Account, Contract, Calldata, Abi } from 'starknet';
import { getABI } from '../abi-manager';

@Injectable()
export class ContractService {
  private provider: RpcProvider;
  private account: Account;

  constructor() {
    this.provider = new RpcProvider({
      nodeUrl: 'https://starknet-testnet.public.blastapi.io/rpc/v0_6',
    });
    
    this.account = new Account(
      this.provider,
      'YOUR_PUBLIC_ADDRESS',
      'YOUR_PRIVATE_KEY',
    );
  }

  async getContract(address: string, abiName: string): Promise<Contract> {
    const abi = await getABI(abiName) as unknown as Abi;
    return new Contract(abi, address, this.provider);
  }

  async callMethod(address: string, abiName: string, method: string, args: any[]) {
    const contract = await this.getContract(address, abiName);
    return contract.call(method, args);
  }

  async executeMethod(
    address: string,
    abiName: string,
    method: string,
    args: any[],
  ): Promise<string> {
    const contract = new Contract(
      (await this.getContract(address, abiName)).abi,
      address,
      this.account
    );
    if (!contract.populateTransaction || typeof contract.populateTransaction[method] !== 'function') {
      throw new Error(`Method ${method} does not exist on the contract's populateTransaction object.`);
    }
    if (!contract.populateTransaction || !(method in contract.populateTransaction)) {
      throw new Error(`Method ${method} does not exist on the contract's populateTransaction object.`);
    }
    if (!contract.populateTransaction || typeof contract.populateTransaction[method] !== 'function') {
      throw new Error(`Method ${method} does not exist on the contract's populateTransaction object.`);
    }
    const methodFunction = contract.populateTransaction[method] as (...args: unknown[]) => Promise<unknown>;
    const calldata = await methodFunction(...(args as unknown[])) as Calldata | undefined;
    
    const tx = await this.account.execute({
      contractAddress: address,
      entrypoint: method,
      calldata,

    });
    return tx.transaction_hash;
  }
}
