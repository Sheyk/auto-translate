import { left, right, isLeft, isRight, lift, liftAsync, Either } from '../utils';

describe('Either utilities', () => {
  describe('left and right constructors', () => {
    it('should create left value', () => {
      const result = left('error message');
      expect(result).toEqual({ type: 'left', value: 'error message' });
    });

    it('should create right value', () => {
      const result = right('success value');
      expect(result).toEqual({ type: 'right', value: 'success value' });
    });
  });

  describe('isLeft and isRight type guards', () => {
    it('should identify left values', () => {
      const leftValue = left('error');
      expect(isLeft(leftValue)).toBe(true);
      expect(isRight(leftValue)).toBe(false);
    });

    it('should identify right values', () => {
      const rightValue = right('success');
      expect(isRight(rightValue)).toBe(true);
      expect(isLeft(rightValue)).toBe(false);
    });
  });
});

describe('chain function', () => {
  it('should chain successful operations with flatMap', () => {
    const addOne = (x: number) => right(x + 1);
    const multiplyByTwo = (x: number) => right(x * 2);

    const chained = lift(addOne)
      .flatMap(multiplyByTwo);

    const result = chained.result(5);
    
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.value).toBe(12); // (5 + 1) * 2 = 12
    }
  });

  it('should transform values with map', () => {
    const addOne = (x: number) => right(x + 1);
    
    const chained = lift(addOne)
      .map(x => x * 2);

    const result = chained.result(5);
    
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.value).toBe(12); // (5 + 1) * 2 = 12
    }
  });

  it('should transform errors with mapError', () => {
    const failOperation = (x: number) => left(`Failed at value: ${x}`);
    
    const chained = lift(failOperation)
      .mapError(error => `Custom error: ${error}`);

    const result = chained.result(5);
    
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.value).toBe('Custom error: Failed at value: 5');
    }
  });

  it('should handle errors in the middle of the chain', () => {
    const addOne = (x: number) => right(x + 1);
    const failOperation = (x: number) => left(`Failed at value: ${x}`);

    const chained = lift(addOne)
      .flatMap(failOperation);

    const result = chained.result(5);
    
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.value).toBe('Failed at value: 6');
    }
  });

  it('should handle exceptions in the chain', () => {
    const addOne = (x: number) => right(x + 1);
    const throwError = (x: number) => {
      throw new Error(`Exception at value: ${x}`);
    };

    const chained = lift(addOne)
      .flatMap(throwError);

    const result = chained.result(5);
    
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.value).toBeInstanceOf(Error);
      expect((result.value as Error).message).toBe('Exception at value: 6');
    }
  });

  it('should handle empty chain', () => {
    const identity = (x: number) => right(x);
    const chained = lift(identity);

    const result = chained.result(42);
    
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should combine map and andThen', () => {
    const parseNumber = (str: string) : Either<string, number> => {
      const num = parseInt(str, 10);
      return isNaN(num) ? left('Invalid number') : right(num);
    };
    
    const validatePositive = (num: number) : Either<string, number> => {
      return num > 0 ? right(num) : left('Number must be positive');
    };

    const chained = lift(parseNumber)
      .map(num => num * 2) // Transform the number
      .flatMap(validatePositive); // Validate the transformed number

    // Test successful case
    const successResult = chained.result('5');
    expect(isRight(successResult)).toBe(true);
    if (isRight(successResult)) {
      expect(successResult.value).toBe(10);
    }

    // Test validation error
    const validationErrorResult = chained.result('-5');
    expect(isLeft(validationErrorResult)).toBe(true);
    if (isLeft(validationErrorResult)) {
      expect(validationErrorResult.value).toBe('Number must be positive');
    }

    // Test parsing error
    const parseErrorResult = chained.result('abc');
    expect(isLeft(parseErrorResult)).toBe(true);
    if (isLeft(parseErrorResult)) {
      expect(parseErrorResult.value).toBe('Invalid number');
    }
  });

  it('should handle complex transformations', () => {
    const parseNumber = (str: string) : Either<string, number> => {
      const num = parseInt(str, 10);
      return isNaN(num) ? left('Invalid number') : right(num);
    };

    const chained = lift(parseNumber)
      .map(num => num * 2) // Double the number
      .map(num => num + 1) // Add 1
      .mapError(error => `Parsing failed: ${error}`); // Transform error

    // Test successful case
    const successResult = chained.result('5');
    expect(isRight(successResult)).toBe(true);
    if (isRight(successResult)) {
      expect(successResult.value).toBe(11); // (5 * 2) + 1 = 11
    }

    // Test error case with transformed error
    const errorResult = chained.result('abc');
    expect(isLeft(errorResult)).toBe(true);
    if (isLeft(errorResult)) {
      expect(errorResult.value).toBe('Parsing failed: Invalid number');
    }
  });
}); 

it('should handle Promises', async () => {
  const readFile = () : Promise<Either<string, string>> => Promise.resolve(right('file content'));
  const uppercase = (str: string) => str.toUpperCase();

  const result = await liftAsync(readFile)
    .map(uppercase)
    .result();

  expect(isRight(result)).toBe(true);
  if (isRight(result)) {
    expect(result.value).toBe('FILE CONTENT');
  }
});

it('should handle functions that do nothing', async () => {
  const readFile = () : Promise<Either<string, string>> => Promise.resolve(right('file content'));
  const uppercase = (str: string) => str.toUpperCase();
  const writeFile = (str: string) : Promise<Either<string, void>> => Promise.resolve(right(undefined));

  const result = await liftAsync(readFile)
    .map(uppercase)
    .flatMapVoid(writeFile)
    .result();

  expect(isRight(result)).toBe(true);
  if (isRight(result)) {
    expect(result.value).toBe('FILE CONTENT');
  }
});

describe('AsyncMonad flatMapAll', () => {
  it('should collect all right values when all succeed', async () => {
    const start = liftAsync(async (x: number) => right(x));
    const double = (n: number) => Promise.resolve(right(n * 2));
    const triple = (n: number) => Promise.resolve(right(n * 3));
    const result = await start
      .flatMapAll(n => [double(n), triple(n)])
      .result(5);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.value).toEqual([10, 15]);
    }
  });

  it('should return left if any promise is left', async () => {
    const start = liftAsync(async (x: number) => right(x));
    const double = (n: number) => Promise.resolve(right(n * 2));
    const fail = (_: number) => Promise.resolve(left('error'));
    const result = await start
      .flatMapAll(n => [double(n), fail(n)])
      .result(5);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.value).toBe('error');
    }
  });

  it('should work with an empty array', async () => {
    const start = liftAsync(async (x: number) => right(x));
    const result = await start
      .flatMapAll(_ => [])
      .result(5);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.value).toEqual([]);
    }
  });
});

describe('AsyncMonad flatMapAllVoid', () => {
  it('should pass through original value if all succeed', async () => {
    const start = liftAsync(async (x: number) => right(x));
    const succeed = (_: number) => Promise.resolve(right(undefined));
    const result = await start
      .flatMapAllVoid(n => [succeed(n), succeed(n)])
      .result(42);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should return left if any promise is left', async () => {
    const start = liftAsync(async (x: number) => right(x));
    const succeed = (_: number) => Promise.resolve(right<string, void>(undefined));
    const fail = (_: number) => Promise.resolve(left<string, void>('error'));
    const result = await start
      .flatMapAllVoid(n => [succeed(n), fail(n)])
      .result(42);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.value).toBe('error');
    }
  });

  it('should work with an empty array', async () => {
    const start = liftAsync(async (x: number) => right(x));
    const result = await start
      .flatMapAllVoid(_ => [])
      .result(42);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should allow chaining after flatMapAllVoid', async () => {
    const start = liftAsync(async (x: number) => right(x));
    const succeed = (_: number) => Promise.resolve(right(undefined));
    const result = await start
      .flatMapAllVoid(n => [succeed(n)])
      .map(n => n + 1)
      .result(10);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.value).toBe(11);
    }
  });
});