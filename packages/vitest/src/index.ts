/**
 * @since 1.0.0
 */
import type { Tester, TesterContext } from "@vitest/expect"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as TestEnvironment from "effect/TestContext"
import type * as TestServices from "effect/TestServices"
import * as Utils from "effect/Utils"
import type { TestAPI } from "vitest"
import * as V from "vitest"

const runTest = <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    const exit: Exit.Exit<A, E> = yield* Effect.exit(effect)
    if (Exit.isSuccess(exit)) {
      return () => {}
    } else {
      const errors = Cause.prettyErrors(exit.cause)
      for (let i = 1; i < errors.length; i++) {
        yield* Effect.logError(errors[i])
      }
      return () => {
        throw errors[0]
      }
    }
  }).pipe(Effect.runPromise).then((f) => f())

/**
 * @since 1.0.0
 */
export type API = TestAPI<{}>

const TestEnv = TestEnvironment.TestContext.pipe(
  Layer.provide(Logger.remove(Logger.defaultLogger))
)

/** @internal */
function customTester(this: TesterContext, a: unknown, b: unknown, customTesters: Array<Tester>) {
  if (!Equal.isEqual(a) || !Equal.isEqual(b)) {
    return undefined
  }
  return Utils.structuralRegion(
    () => Equal.equals(a, b),
    (x, y) => this.equals(x, y, customTesters.filter((t) => t !== customTester))
  )
}

/**
 * @since 1.0.0
 */
export const addEqualityTesters = () => {
  V.expect.addEqualityTesters([customTester])
}

/**
 * @since 1.0.0
 */
export const effect = (() => {
  const f = <E, A>(
    name: string,
    self: (ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E, TestServices.TestServices>,
    timeout: number | V.TestOptions = 5_000
  ) =>
    it(
      name,
      (c) =>
        pipe(
          Effect.suspend(() => self(c)),
          Effect.provide(TestEnv),
          runTest
        ),
      timeout
    )
  return Object.assign(f, {
    skip: <E, A>(
      name: string,
      self: (ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E, TestServices.TestServices>,
      timeout = 5_000
    ) =>
      it.skip(
        name,
        (c) =>
          pipe(
            Effect.suspend(() => self(c)),
            Effect.provide(TestEnv),
            runTest
          ),
        timeout
      ),
    only: <E, A>(
      name: string,
      self: (ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E, TestServices.TestServices>,
      timeout = 5_000
    ) =>
      it.only(
        name,
        (c) =>
          pipe(
            Effect.suspend(() => self(c)),
            Effect.provide(TestEnv),
            runTest
          ),
        timeout
      )
  })
})()

/**
 * @since 1.0.0
 */
export const live = <E, A>(
  name: string,
  self: (ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E>,
  timeout = 5_000
) =>
  it(
    name,
    (c) =>
      pipe(
        Effect.suspend(() => self(c)),
        runTest
      ),
    timeout
  )

/**
 * @since 1.0.0
 */
export const flakyTest = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout: Duration.DurationInput = Duration.seconds(30)
) =>
  pipe(
    Effect.catchAllDefect(self, Effect.fail),
    Effect.retry(
      pipe(
        Schedule.recurs(10),
        Schedule.compose(Schedule.elapsed),
        Schedule.whileOutput(Duration.lessThanOrEqualTo(timeout))
      )
    ),
    Effect.orDie
  )

/**
 * @since 1.0.0
 */
export const scoped = <E, A>(
  name: string,
  self: (
    ctx: V.TaskContext<V.Test<{}>> & V.TestContext
  ) => Effect.Effect<A, E, Scope.Scope | TestServices.TestServices>,
  timeout = 5_000
) =>
  it(
    name,
    (c) =>
      pipe(
        Effect.suspend(() => self(c)),
        Effect.scoped,
        Effect.provide(TestEnv),
        runTest
      ),
    timeout
  )

/**
 * @since 1.0.0
 */
export const scopedLive = <E, A>(
  name: string,
  self: (ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E, Scope.Scope>,
  timeout = 5_000
) =>
  it(
    name,
    (c) =>
      pipe(
        Effect.suspend(() => self(c)),
        Effect.scoped,
        runTest
      ),
    timeout
  )

const methods = { effect, live, flakyTest, scoped, scopedLive } as const

/**
 * @since 1.0.0
 */
export const it: API & typeof methods = Object.assign(
  V.it,
  methods
)

/**
 * @since 1.0.0
 */
export * from "vitest"
