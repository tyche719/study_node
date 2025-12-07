import mysqlserver from '../core/mysql.core.js';
import instance from '../instance.js';

/**
 * CREATE TABLE diaries (
 *  id INT AUTO_INCREMENT PRIMARY KEY,
 *  title VARCHAR(255) NOT NULL,
 *  content TEXT NOT NULL,
 *  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
class DiaryModel extends mysqlserver {
  constructor() {
    super('diaries', 'id');
  }
}

export default DiaryModel;
