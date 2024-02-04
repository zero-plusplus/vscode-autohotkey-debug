import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/string';

createTest('openFileOnExit', attributes.openFileOnExit.defaultValue, attributes.openFileOnExit.validator);
