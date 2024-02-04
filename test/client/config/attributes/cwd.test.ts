import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/string';

createTest('cwd', attributes.cwd.defaultValue, attributes.cwd.validator);
