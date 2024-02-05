import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/array';

createTest('setBreakpoints', attributes.setBreakpoints.defaultValue, attributes.setBreakpoints.validator);
