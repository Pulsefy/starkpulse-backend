import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as zlib from "zlib"
import { promisify } from "util"

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)
const deflate = promisify(zlib.deflate)
const inflate = promisify(zlib.inflate)

export interface CompressionStats {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  algorithm: string
}

export enum CompressionAlgorithm {
  GZIP = "gzip",
  DEFLATE = "deflate",
  NONE = "none",
}

@Injectable()
export class CacheCompressionService {
  private readonly logger = new Logger(CacheCompressionService.name)
  private readonly compressionEnabled: boolean
  private readonly compressionThreshold: number
  private readonly defaultAlgorithm: CompressionAlgorithm

  constructor(private readonly configService: ConfigService) {
    this.compressionEnabled = this.configService.get("CACHE_COMPRESSION_ENABLED", true)
    this.compressionThreshold = this.configService.get("CACHE_COMPRESSION_THRESHOLD", 1024) // 1KB
    this.defaultAlgorithm = this.configService.get(
      "CACHE_COMPRESSION_ALGORITHM",
      CompressionAlgorithm.GZIP,
    ) as CompressionAlgorithm
  }

  async compress(
    data: string | Buffer,
    algorithm?: CompressionAlgorithm,
  ): Promise<{
    compressed: Buffer
    stats: CompressionStats
    metadata: string
  }> {
    if (!this.compressionEnabled) {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
      return {
        compressed: buffer,
        stats: {
          originalSize: buffer.length,
          compressedSize: buffer.length,
          compressionRatio: 1,
          algorithm: CompressionAlgorithm.NONE,
        },
        metadata: this.createMetadata(CompressionAlgorithm.NONE),
      }
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
    const originalSize = buffer.length

    // Skip compression for small data
    if (originalSize < this.compressionThreshold) {
      return {
        compressed: buffer,
        stats: {
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          algorithm: CompressionAlgorithm.NONE,
        },
        metadata: this.createMetadata(CompressionAlgorithm.NONE),
      }
    }

    const compressionAlgorithm = algorithm || this.defaultAlgorithm

    try {
      let compressed: Buffer

      switch (compressionAlgorithm) {
        case CompressionAlgorithm.GZIP:
          compressed = await gzip(buffer)
          break
        case CompressionAlgorithm.DEFLATE:
          compressed = await deflate(buffer)
          break
        default:
          compressed = buffer
          break
      }

      const compressedSize = compressed.length
      const compressionRatio = originalSize / compressedSize

      // If compression doesn't provide significant benefit, return original
      if (compressionRatio < 1.1) {
        return {
          compressed: buffer,
          stats: {
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1,
            algorithm: CompressionAlgorithm.NONE,
          },
          metadata: this.createMetadata(CompressionAlgorithm.NONE),
        }
      }

      return {
        compressed,
        stats: {
          originalSize,
          compressedSize,
          compressionRatio,
          algorithm: compressionAlgorithm,
        },
        metadata: this.createMetadata(compressionAlgorithm),
      }
    } catch (error) {
      this.logger.error("Compression failed:", error)
      return {
        compressed: buffer,
        stats: {
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          algorithm: CompressionAlgorithm.NONE,
        },
        metadata: this.createMetadata(CompressionAlgorithm.NONE),
      }
    }
  }

  async decompress(compressedData: Buffer, metadata: string): Promise<Buffer> {
    const algorithm = this.parseMetadata(metadata)

    if (algorithm === CompressionAlgorithm.NONE) {
      return compressedData
    }

    try {
      switch (algorithm) {
        case CompressionAlgorithm.GZIP:
          return await gunzip(compressedData)
        case CompressionAlgorithm.DEFLATE:
          return await inflate(compressedData)
        default:
          return compressedData
      }
    } catch (error) {
      this.logger.error("Decompression failed:", error)
      throw new Error(`Failed to decompress data with algorithm: ${algorithm}`)
    }
  }

  async compressJson(
    obj: any,
    algorithm?: CompressionAlgorithm,
  ): Promise<{
    compressed: Buffer
    stats: CompressionStats
    metadata: string
  }> {
    const jsonString = JSON.stringify(obj)
    return this.compress(jsonString, algorithm)
  }

  async decompressJson<T = any>(compressedData: Buffer, metadata: string): Promise<T> {
    const decompressed = await this.decompress(compressedData, metadata)
    return JSON.parse(decompressed.toString())
  }

  private createMetadata(algorithm: CompressionAlgorithm): string {
    return JSON.stringify({
      algorithm,
      version: "1.0",
      timestamp: Date.now(),
    })
  }

  private parseMetadata(metadata: string): CompressionAlgorithm {
    try {
      const parsed = JSON.parse(metadata)
      return parsed.algorithm || CompressionAlgorithm.NONE
    } catch (error) {
      this.logger.warn("Failed to parse compression metadata:", error)
      return CompressionAlgorithm.NONE
    }
  }

  getCompressionStats(): {
    enabled: boolean
    threshold: number
    algorithm: CompressionAlgorithm
  } {
    return {
      enabled: this.compressionEnabled,
      threshold: this.compressionThreshold,
      algorithm: this.defaultAlgorithm,
    }
  }
}
