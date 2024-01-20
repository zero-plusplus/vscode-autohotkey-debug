import { SyntaxKind } from "../types/tools/AELL"
import type * as dbgp from "../types/dbgp/dbgp"
import { create } from "./tools/AELL"
import { Session } from "../dbgp"

export const createAELL = (session: dbgp.Session) => {
  create(session.ahkVersion, {
    [SyntaxKind.AssignExpression]
  })
}