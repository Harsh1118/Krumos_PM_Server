import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environmental variables from .env
config();

const connectionString = process.env.DATABASE_URL;
const useSSL = connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: connectionString,
  entities: [path.join(__dirname, '/../../../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/*{.ts,.js}')],
  synchronize: false, // Must be false for migration CLI operations
  ssl: useSSL ? { rejectUnauthorized: false } : false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
