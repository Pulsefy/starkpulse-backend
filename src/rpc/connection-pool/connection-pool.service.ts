import { Injectable } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ConnectionPoolService {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      httpAgent: new http.Agent({ keepAlive: true, maxSockets: 100 }),
      httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 100 }),
      timeout: 10000, // 10 seconds
    });
  }

  async post(url: string, data: any, headers?: any): Promise<any> {
    return this.axiosInstance.post(url, data, { headers });
  }
}
