// Required EdgeSpark schema barrel.
export * from './db_schema';
export * from './db_relations';
export * from '../__generated__/sys_schema';
export * from '../__generated__/sys_relations';

import * as buckets from './storage_schema';
export { buckets };

export type VarKey = never;
export type SecretKey = never;

import * as appTables from './db_schema';
import * as appRelations from './db_relations';
import * as systemTables from '../__generated__/sys_schema';
import * as systemRelations from '../__generated__/sys_relations';

export const drizzleSchema = {
  ...appTables,
  ...appRelations,
  ...systemTables,
  ...systemRelations,
};
