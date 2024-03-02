import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../types/dbgp/ExtendAutoHotkeyDebugger.types';
import { BinaryExpressionNode, NumberLiteralNode, StringLiteralNode, SyntaxKind } from '../../types/tools/AELL/common.types';
import { EvalFunc } from '../../types/tools/AELL/evaluator.types';
import { createAELLParser } from './parser';

const createEvalFuncMap = <Value, Evaluated extends Promise<Value>, Func extends EvalFunc<Evaluated>, FuncMap extends Record<SyntaxKind, Func>>(version: AutoHotkeyVersion | ParsedAutoHotkeyVersion, overrides?: FuncMap): FuncMap => {
  const funcMap = {
    async [SyntaxKind.StringLiteral](node: StringLiteralNode) {
      return Promise.resolve(node.value);
    },
    async [SyntaxKind.NumberLiteral](node: NumberLiteralNode) {
      return Promise.resolve(node.value);
    },
    async [SyntaxKind.BooleanLiteral](node: StringLiteralNode) {
      return Promise.resolve(node.value ? '1' : '0');
    },
    async [SyntaxKind.BinaryExpression](node: BinaryExpressionNode) {
      const left = await this[node.left.kind](node.left);
      const right = await this[node.right.kind](node.right);

      switch (node.operator) {
        case '+': return checkNumber(Number(left) + Number(right));
        case '-': return checkNumber(Number(left) - Number(right));
        case '*': return checkNumber(Number(left) * Number(right));
        case '/': return checkNumber(Number(left) / Number(right));
        case '//': return checkNumber(Number(left) / Number(right));
        default: break;
      }
      return Promise.resolve('');
    },
    ...overrides,
  } as FuncMap;
  return funcMap;

  function checkNumber(num: number): number | '' {
    if (isNaN(num)) {
      return '';
    }
    return num;
  }
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createEvaluator = <Value, Evaluated extends Promise<Value>, Func extends EvalFunc<Evaluated>, FuncMap extends Record<SyntaxKind, Func>>(version: AutoHotkeyVersion | ParsedAutoHotkeyVersion, overrides?: FuncMap) => {
  const evalFuncMap = createEvalFuncMap(version, overrides);
  const parser = createAELLParser(version);

  return {
    eval: async(text: string): Promise<Evaluated> => {
      const node = parser.parse(text);
      return evalFuncMap[node.kind](node);
    },
  };
};

