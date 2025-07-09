export type Prettify<T> = {
    [K in keyof T]: T[K];
  } & {};

export type Either<L, R> = { type: 'left'; value: L } | { type: 'right'; value: R };

export function left<L, R>(value: L): Either<L, R> {
  return { type: 'left', value };
}

export function right<L, R>(value: R): Either<L, R> {
  return { type: 'right', value };
}

export function isLeft<L, R>(either: Either<L, R>): either is { type: 'left'; value: L } {
  return either.type === 'left';
}

export function isRight<L, R>(either: Either<L, R>): either is { type: 'right'; value: R } {
  return either.type === 'right';
}

type Monad<TIn, TError, TOut> = {
  flatMap: <TOutNext>(fn: (value: TOut) => Either<TError, TOutNext>) => Monad<TIn, TError, TOutNext>,
  flatMapVoid: (fn: (value: TOut) => Either<TError, void>) => Monad<TIn, TError, TOut>,
  map: <TOutNext>(fn: (value: TOut) => TOutNext) => Monad<TIn, TError, TOutNext>,
  mapError: <TErrorNext>(fn: (error: TError) => TErrorNext) => Monad<TIn, TErrorNext, TOut>,
  result: (value: TIn) => Either<TError, TOut>
}

export function lift<TIn, TError, TOut>(fn: (value: TIn) => Either<TError, TOut>): Monad<TIn, TError, TOut> {
  return {
    flatMap: <TOutNext>(fn2: (value: TOut) => Either<TError, TOutNext>) => {
      return lift((value: TIn) => {
        const result = fn(value);
        if (isLeft(result)) return result as Either<TError, TOutNext>;
        return fn2(result.value);
      });
    },
    flatMapVoid: (fn2: (value: TOut) => Either<TError, void>) => {
      return lift((value: TIn) => {
        const result = fn(value);
        if (isLeft(result)) return result as Either<TError, TOut>;
        const voidResult = fn2(result.value);
        if (isLeft(voidResult)) return voidResult as Either<TError, TOut>;
        return right(result.value); // Pass through the original value
      });
    },
    map: <TOutNext>(fn2: (value: TOut) => TOutNext) => {
      return lift((value: TIn) => {
        const result = fn(value);
        if (isLeft(result)) return result as Either<TError, TOutNext>;
        return right(fn2(result.value));
      });
    },
    mapError: <TErrorNext>(fn2: (error: TError) => TErrorNext) => {
      return lift((value: TIn) => {
        const result = fn(value);
        if (isLeft(result)) return left(fn2(result.value));
        return result as Either<TErrorNext, TOut>;
      });
    },
    result: (value?: TIn) => {
      try {
        return fn(value as TIn);
      } catch (error) {
        return left(error as TError);
      }
    }
  };
}

// Async version for Promise<Either>
type AsyncMonad<TIn, TError, TOut> = {
  flatMap: <TOutNext>(fn: (value: TOut) => Promise<Either<TError, TOutNext>>) => AsyncMonad<TIn, TError, TOutNext>,
  flatMapVoid: (fn: (value: TOut) => Promise<Either<TError, void>>) => AsyncMonad<TIn, TError, TOut>,
  map: <TOutNext>(fn: (value: TOut) => TOutNext) => AsyncMonad<TIn, TError, TOutNext>,
  mapError: <TErrorNext>(fn: (error: TError) => TErrorNext) => AsyncMonad<TIn, TErrorNext, TOut>,
  result: (value?: TIn) => Promise<Either<TError, TOut>>
}

export function liftAsync<TIn, TError, TOut>(fn: (value: TIn) => Promise<Either<TError, TOut>>): AsyncMonad<TIn, TError, TOut> {
  return {
    flatMap: <TOutNext>(fn2: (value: TOut) => Promise<Either<TError, TOutNext>>) => {
      return liftAsync(async (value: TIn) => {
        const result = await fn(value);
        if (isLeft(result)) return result as Either<TError, TOutNext>;
        return await fn2(result.value);
      });
    },
    flatMapVoid: (fn2: (value: TOut) => Promise<Either<TError, void>>) => {
      return liftAsync(async (value: TIn) => {
        const result = await fn(value);
        if (isLeft(result)) return result as Either<TError, TOut>;
        const voidResult = await fn2(result.value);
        if (isLeft(voidResult)) return voidResult as Either<TError, TOut>;
        return right(result.value); // Pass through the original value
      });
    },
    map: <TOutNext>(fn2: (value: TOut) => TOutNext) => {
      return liftAsync(async (value: TIn) => {
        const result = await fn(value);
        if (isLeft(result)) return result as Either<TError, TOutNext>;
        return right(fn2(result.value));
      });
    },
    mapError: <TErrorNext>(fn2: (error: TError) => TErrorNext) => {
      return liftAsync(async (value: TIn) => {
        const result = await fn(value);
        if (isLeft(result)) return left(fn2(result.value));
        return result as Either<TErrorNext, TOut>;
      });
    },
    result: async (value?: TIn) => {
      try {
        return await fn(value as TIn);
      } catch (error) {
        return left(error as TError);
      }
    }
  };
}