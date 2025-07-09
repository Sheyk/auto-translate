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

type Chainable<TIn, TError, TOut> = {
  andThen: <TOutNext>(fn: (value: TOut) => Either<TError, TOutNext>) => Chainable<TIn, TError, TOutNext>,
  map: <TOutNext>(fn: (value: TOut) => TOutNext) => Chainable<TIn, TError, TOutNext>,
  mapError: <TErrorNext>(fn: (error: TError) => TErrorNext) => Chainable<TIn, TErrorNext, TOut>,
  result: (value: TIn) => Either<TError, TOut>
}

export function chain<TIn, TError, TOut>(fn: (value: TIn) => Either<TError, TOut>): Chainable<TIn, TError, TOut> {
  return {
    andThen: <TOutNext>(fn2: (value: TOut) => Either<TError, TOutNext>) => {
      return chain((value: TIn) => {
        const result = fn(value);
        if (isLeft(result)) return result as Either<TError, TOutNext>;
        return fn2(result.value);
      });
    },
    map: <TOutNext>(fn2: (value: TOut) => TOutNext) => {
      return chain((value: TIn) => {
        const result = fn(value);
        if (isLeft(result)) return result as Either<TError, TOutNext>;
        return right(fn2(result.value));
      });
    },
    mapError: <TErrorNext>(fn2: (error: TError) => TErrorNext) => {
      return chain((value: TIn) => {
        const result = fn(value);
        if (isLeft(result)) return left(fn2(result.value));
        return result as Either<TErrorNext, TOut>;
      });
    },
    result: (value: TIn) => {
      try {
        return fn(value);
      } catch (error) {
        return left(error as TError);
      }
    }
  };
}