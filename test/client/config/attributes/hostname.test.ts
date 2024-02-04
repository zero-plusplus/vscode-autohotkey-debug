import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/string';

createTest('hostname', attributes.hostname.defaultValue, attributes.hostname.validate);
