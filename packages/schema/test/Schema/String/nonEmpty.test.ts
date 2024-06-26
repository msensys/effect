import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("nonEmpty", () => {
  const schema = S.NonEmpty

  it("make", () => {
    Util.expectConstructorSuccess(S.NonEmpty, "a")
    Util.expectConstructorFailure(
      S.NonEmpty,
      "",
      `NonEmpty
└─ Predicate refinement failure
   └─ Expected NonEmpty (a non empty string), actual ""`
    )
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "aa")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `NonEmpty
└─ Predicate refinement failure
   └─ Expected NonEmpty (a non empty string), actual ""`
    )
  })
})
