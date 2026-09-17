/**
 * imageQuality.js - Lightweight Backend Image Inspection Utility
 * 
 * Inspects image buffer properties (format, dimensions, resolution) in pure Node.js
 * without requiring large native image libraries or modifying the buffer.
 * 
 * Advisory pre-check only. Does NOT modify the image buffer or interfere with ML inference.
 */

const QUALITY_THRESHOLDS = {
  MIN_WIDTH: 224,
  MIN_HEIGHT: 224,
  MAX_FILE_SIZE: 5 * 1024 * 1024 // 5 MB
};

/**
 * Parses image dimensions from buffer for JPEG, PNG, and WebP.
 * @param {Buffer} buffer 
 * @returns {{ width: number, height: number, format: string } | null}
 */
function parseImageDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) {
    return null;
  }

  // 1. PNG Check (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    if (buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height, format: 'png' };
    }
  }

  // 2. JPEG Check (FF D8)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xFF) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // Baseline SOF0 (0xC0), Extended SOF1 (0xC1), Progressive SOF2 (0xC2)
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height, format: 'jpeg' };
      }
      // Skip segment
      if (offset + 3 >= buffer.length) break;
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }

  // 3. WebP Check (RIFF .... WEBP)
  if (
    buffer.length >= 30 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const chunkHeader = buffer.toString('ascii', 12, 16);
    if (chunkHeader === 'VP8 ') {
      // Lossy VP8
      if (buffer.length >= 30) {
        const width = buffer.readUInt16LE(26) & 0x3FFF;
        const height = buffer.readUInt16LE(28) & 0x3FFF;
        return { width, height, format: 'webp' };
      }
    } else if (chunkHeader === 'VP8L') {
      // Lossless VP8L
      if (buffer.length >= 25) {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3F) << 8) | b0);
        const height = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6));
        return { width, height, format: 'webp' };
      }
    } else if (chunkHeader === 'VP8X') {
      // Extended VP8X
      if (buffer.length >= 30) {
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height, format: 'webp' };
      }
    }
  }

  return null;
}

/**
 * Evaluates image buffer quality properties.
 * Non-destructive: does not modify or re-encode the buffer.
 * @param {Buffer} buffer - Image file buffer
 * @returns {Object} Quality assessment report
 */
function assessImageQuality(buffer) {
  const defaultFailure = {
    valid: false,
    width: 0,
    height: 0,
    format: 'unknown',
    sizeBytes: buffer && Buffer.isBuffer(buffer) ? buffer.length : 0,
    resolution: {
      passed: false,
      label: 'Could not determine'
    },
    overallStatus: 'Unknown',
    warnings: ['Image format or dimensions could not be verified.']
  };

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      ...defaultFailure,
      warnings: ['Invalid or empty image buffer provided.']
    };
  }

  try {
    const parsed = parseImageDimensions(buffer);
    if (!parsed || parsed.width === 0 || parsed.height === 0) {
      return defaultFailure;
    }

    const { width, height, format } = parsed;
    const resolutionPassed =
      width >= QUALITY_THRESHOLDS.MIN_WIDTH &&
      height >= QUALITY_THRESHOLDS.MIN_HEIGHT;
    const resolutionLabel = resolutionPassed ? 'Passed' : 'Needs improvement';

    const warnings = [];
    if (!resolutionPassed) {
      warnings.push(
        `Image resolution (${width}×${height}) is below recommended ${QUALITY_THRESHOLDS.MIN_WIDTH}×${QUALITY_THRESHOLDS.MIN_HEIGHT} pixels.`
      );
    }

    const overallStatus = resolutionPassed ? 'Good' : 'Needs improvement';

    return {
      valid: true,
      width,
      height,
      format,
      sizeBytes: buffer.length,
      resolution: {
        passed: resolutionPassed,
        label: resolutionLabel
      },
      overallStatus,
      warnings
    };
  } catch (err) {
    return {
      ...defaultFailure,
      warnings: [`Image quality inspection error: ${err.message}`]
    };
  }
}

module.exports = {
  QUALITY_THRESHOLDS,
  parseImageDimensions,
  assessImageQuality
};
