import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/strings';

createTest('args', attributes.args.defaultValue, attributes.args.validator);
