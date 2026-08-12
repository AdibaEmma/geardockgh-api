import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service.js';

/**
 * A published product must have a price.
 *
 * `pricePesewas` mirrors ImportBrain's selling price, which is optional there,
 * so an unpriced product arrives here as 0. Checkout charges whatever the field
 * holds, so publishing one lists it at GHS 0.00 and it will be bought at that
 * price. The sync deliberately creates products unpublished; these are the
 * checks that stop the other half of that path.
 */
describe('ProductsService — publishing needs a price', () => {
  const product = {
    id: 'p1',
    name: 'Powerstation',
    pricePesewas: 250_000,
    stockCount: 5,
    isPublished: false,
    variants: [] as Array<{ name: string; pricePesewas: number }>,
  };

  let service: ProductsService;
  let updated: Record<string, unknown> | null;

  const makeService = (existing: typeof product) => {
    updated = null;
    const prisma = {
      product: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockImplementation(({ data }) => {
          updated = data;
          return Promise.resolve({ ...existing, ...data });
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          updated = data;
          return Promise.resolve({ ...data, id: 'new' });
        }),
      },
      productAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    return new ProductsService(
      prisma as never,
      { notifySubscribers: jest.fn().mockResolvedValue(undefined) } as never,
    );
  };

  beforeEach(() => {
    service = makeService(product);
  });

  it('refuses to publish a product with no price', async () => {
    service = makeService({ ...product, pricePesewas: 0 });

    await expect(
      service.update('p1', { isPublished: true }, 't1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updated).toBeNull();
  });

  it('refuses to zero the price of a product that is already published', async () => {
    service = makeService({ ...product, isPublished: true });

    await expect(
      service.update('p1', { pricePesewas: 0 }, 't1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updated).toBeNull();
  });

  it('refuses to publish when a variant has no price', async () => {
    service = makeService({
      ...product,
      variants: [
        { name: 'Black', pricePesewas: 250_000 },
        { name: 'Blue', pricePesewas: 0 },
      ],
    });

    await expect(
      service.update('p1', { isPublished: true }, 't1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows an unpriced product to exist, so long as it stays unpublished', async () => {
    service = makeService({ ...product, pricePesewas: 0 });

    await expect(
      service.update('p1', { stockCount: 10 }, 't1'),
    ).resolves.toBeDefined();
  });

  it('publishes a priced product as before', async () => {
    await expect(
      service.update('p1', { isPublished: true }, 't1'),
    ).resolves.toBeDefined();
    expect(updated).toMatchObject({ isPublished: true });
  });
});
