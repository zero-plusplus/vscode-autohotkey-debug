import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/boolean';

createTest('trace', attributes.trace.defaultValue, attributes.trace.validator);
