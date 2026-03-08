import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class Money {
  private readonly value: Decimal;

  constructor(amount: string | number | Decimal) {
    this.value = new Decimal(amount);
  }

  add(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  subtract(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  multiply(factor: string | number | Decimal): Money {
    return new Money(this.value.times(new Decimal(factor)));
  }

  divide(divisor: string | number | Decimal): Money {
    const d = new Decimal(divisor);
    if (d.isZero()) {
      throw new Error('Cannot divide by zero');
    }
    return new Money(this.value.dividedBy(d));
  }

  percentage(percent: string | number | Decimal): Money {
    return this.multiply(new Decimal(percent).dividedBy(100));
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  greaterThan(other: Money): boolean {
    return this.value.greaterThan(other.value);
  }

  toFixed(decimals = 2): string {
    return this.value.toFixed(decimals);
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  toDecimal(): Decimal {
    return this.value;
  }

  static zero(): Money {
    return new Money(0);
  }

  static sum(amounts: Money[]): Money {
    return amounts.reduce((acc, m) => acc.add(m), Money.zero());
  }

  static ceilDivide(numerator: Money, denominator: Money): number {
    if (denominator.isZero()) return 0;
    return Math.ceil(numerator.value.dividedBy(denominator.value).toNumber());
  }
}
