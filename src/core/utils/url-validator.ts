import { BadRequestException } from '@nestjs/common';

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
];

export function validateExternalUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('Invalid URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new BadRequestException('Only HTTPS URLs are allowed for external services');
  }

  const hostname = parsed.hostname;
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      throw new BadRequestException('Requests to private networks are not allowed');
    }
  }
}
