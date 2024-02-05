import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/file';

createTest('openFileOnExit', attributes.openFileOnExit.defaultValue, attributes.openFileOnExit.validator);
