import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/boolean';

createTest('useAutoJumpToError', attributes.useAutoJumpToError.defaultValue, attributes.useAutoJumpToError.validator);
