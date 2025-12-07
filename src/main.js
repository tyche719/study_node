import './common/dotenv.js';
import instance from './instance.js';
import MariaTestModel from './models/test.mysql.js';

const app = async () => {
  const mysqlTestModel = new MariaTestModel();
  const conn = await MariaTestModel.openConnectionAsync();
  const result = await mysqlTestModel.queryAsync(conn, 'SELECT * FROM testtable');
  instance.logger.info(JSON.stringify(result));
  const cnt = await mysqlTestModel.countByFilterAsync(conn);
  instance.logger.info(cnt);
  const a = await mysqlTestModel.insertAsync(conn, { name: 'ccca' }); // INSERT INTO testtable (name) VALUES ('ccca');
  await mysqlTestModel.updateByFilterAsync(conn, { id: a }, { name: 'eee' }); // UPDATE testtable SET name='eee' WHERE id=a;
  await mysqlTestModel.deleteByFilterAsync(conn, { id: a }); // DELETE FROM testtable WHERE id=a;
  const result3 = await mysqlTestModel.findByFilterAsync(conn); // SELECT * FROM testtable;
  instance.logger.info(JSON.stringify(result3));
};

app();

/*
C create
R read
U update
D delete
*/
