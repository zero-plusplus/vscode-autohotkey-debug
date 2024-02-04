import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/string';

createTest('name', attributes.name.defaultValue, attributes.name.validator);
