/**
 * @file
 * @lastModified 2024-09-16
 */
import instance from '../instance.js';
import redisServer from './redis.core.js';

/**
 * MySQL 데이터베이스와 상호 작용하기 위한 클래스입니다.
 * @class
 */
export default class mysqlserver {
  /**
   * mysqlserver 인스턴스를 생성합니다.
   * @param {string} [tableName=''] - 작업할 테이블의 이름
   * @param {string} [primaryField=''] - 테이블의 기본 키 필드
   * @param {string} [sortKey=''] - 결과 정렬에 사용할 필드
   */
  static mysqlPool = instance.mysql;

  constructor(tableName = '', primaryField = '', sortKey = '') {
    this.tableName = tableName;
    this.primaryField = primaryField;
    this.sortKey = sortKey;
  }

  static {
    mysqlserver.mysqlPool.on('error', (error) => {
      instance.logger.error(error);
    });
  }

  /**
   * 필드 이름을 이스케이프 처리합니다.
   * @param {string} fieldName - 이스케이프 처리할 필드 이름
   * @returns {string} 이스케이프 처리된 필드 이름
   * @private
   */
  _escapeFieldName(fieldName) {
    return `\`${fieldName.replace(/`/g, '``')}\``;
  }

  /**
   * WHERE 절을 생성합니다. LIKE 검색을 지원합니다.
   * @param {Object} filter - 필터 조건
   * @param {Array} likeFields - LIKE 검색을 사용할 필드 이름 배열
   * @returns {Object} WHERE 절과 바인딩할 값들
   * @private
   */
  _buildWhereClause(filter, likeFields = []) {
    if (Object.keys(filter).length === 0) {
      return { where: '', values: [] };
    }

    const conditions = [];
    const values = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        if (likeFields.includes(key)) {
          conditions.push(`${this._escapeFieldName(key)} LIKE ?`);
          values.push(`%${value}%`);
        } else {
          conditions.push(`${this._escapeFieldName(key)} = ?`);
          values.push(value);
        }
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, values };
  }

  /**
   * ORDER BY 절을 생성합니다.
   * @param {Object|string} orderBy - 정렬 조건
   * @returns {string} ORDER BY 절
   * @private
   */
  _buildOrderByClause(orderBy) {
    if (typeof orderBy === 'string' && orderBy.trim() !== '') {
      return `ORDER BY ${orderBy}`;
    } else if (typeof orderBy === 'object' && Object.keys(orderBy).length > 0) {
      const sortFields = Object.entries(orderBy).map(
        ([key, value]) =>
          `${this._escapeFieldName(key)} ${value === -1 || String(value).toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`
      );
      return `ORDER BY ${sortFields.join(', ')}`;
    } else {
      return `ORDER BY ${this._escapeFieldName(this.primaryField)} DESC`;
    }
  }

  /**
   * 풀에서 연결을 가져옵니다.
   * @returns {Promise<Object>} 데이터베이스 연결 객체
   * @throws {Error} 연결을 가져오지 못한 경우
   */
  static async openConnectionAsync() {
    let connection;
    try {
      connection = await mysqlserver.mysqlPool.getConnection();
      return connection;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 데이터베이스 연결을 풀로 반환합니다.
   * @param {Object} connection - 반환할 연결
   */
  static async closeConnectionAsync(connection) {
    if (connection) connection.release();
  }

  /**
   * 데이터베이스 트랜잭션을 시작합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @returns {Promise<boolean>} 트랜잭션이 성공적으로 시작되면 true
   * @throws {Error} 트랜잭션을 시작하지 못한 경우
   */
  async startTransactionAsync(connection) {
    try {
      await connection.query('START TRANSACTION');
      return true;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 데이터베이스 트랜잭션을 롤백합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @returns {Promise<boolean>} 롤백이 성공적으로 수행되면 true
   * @throws {Error} 트랜잭션을 롤백하지 못한 경우
   */
  async rollbackTransactionAsync(connection) {
    try {
      await connection.query('ROLLBACK');
      return true;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 데이터베이스 트랜잭션을 커밋합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @returns {Promise<boolean>} 커밋이 성공적으로 수행되면 true
   * @throws {Error} 트랜잭션을 커밋하지 못한 경우
   */
  async commitTransactionAsync(connection) {
    try {
      await connection.query('COMMIT');
      return true;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * SQL 쿼리를 실행합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {string} sql - 실행할 SQL 쿼리
   * @param {Array} values - 쿼리에 바인딩할 값들
   * @returns {Promise<Array>} 쿼리 결과 행들
   * @throws {Error} 쿼리 실행 중 오류 발생시
   */
  async queryAsync(connection, sql, values = {}) {
    if (connection === false) {
      return false;
    }

    instance.logger.debug('[query]', sql);
    instance.logger.debug('[values]', JSON.stringify(values));

    let [rows] = [];
    try {
      [rows] = await connection.query(sql, values);
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }

    return rows;
  }

  /**
   * 저장 프로시저를 실행합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {string} sql - 저장 프로시저 이름
   * @param {Array} values - 프로시저 매개변수들
   * @returns {Promise<Array>} 프로시저 실행 결과
   * @throws {Error} 프로시저 실행 중 오류 발생시
   */
  async callProcedureAsync(connection, sql, values) {
    try {
      const [rows] = await connection.query(`call ${sql}`, values);

      return rows[0];
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 테이블의 모든 데이터를 조회합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {string} [select='*'] - 조회할 필드들
   * @param {string} [orderBy=''] - 정렬 조건
   * @returns {Promise<Array|boolean>} 조회 결과 행들 또는 실패시 false
   * @throws {Error} 조회 중 오류 발생시
   */
  async allAsync(connection, select = '*', orderBy = '') {
    const orderByClause = this._buildOrderByClause(orderBy);
    const sql = `SELECT ${select} FROM ${this._escapeFieldName(this.tableName)} ${orderByClause}`;
    try {
      const result = await this.queryAsync(connection, sql);
      return result.length === 0 ? false : result;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 캐시에서 테이블의 모든 데이터를 조회합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {string} [select='*'] - 조회할 필드들
   * @param {string} [orderBy=''] - 정렬 조건
   * @param {number} [expireSeconds=60] - 캐시 만료 시간(초)
   * @returns {Promise<Array|boolean>} 조회 결과 행들 또는 실패시 false
   * @throws {Error} 조회 중 오류 발생시
   */
  async allFromCacheAsync(connection, select = '*', orderBy = '', expireSeconds = 60) {
    const cacheKey = ['mysql', this.tableName, select, orderBy].join('__');
    return redisServer.getOrSetCache(cacheKey, () => this.allAsync(connection, select, orderBy), expireSeconds);
  }

  /**
   * 주어진 필터 조건으로 단일 행을 조회합니다. LIKE 검색을 지원합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} [filter={}] - 조회 조건
   * @param {Array} [likeFields=[]] - LIKE 검색을 사용할 필드 이름 배열
   * @param {string} [select='*'] - 조회할 필드들
   * @returns {Promise<Object|boolean>} 조회된 행 또는 실패시 false
   * @throws {Error} 조회 중 오류 발생시
   */
  async findOneByFilterAsync(connection, filter = {}, likeFields = [], select = '*') {
    if (typeof filter !== 'object' || Array.isArray(filter)) {
      throw new Error('Filter must be an object');
    }

    const { where, values } = this._buildWhereClause(filter, likeFields);
    const sql = `SELECT ${select} FROM ${this._escapeFieldName(this.tableName)} ${where} LIMIT 1`;

    try {
      const result = await this.queryAsync(connection, sql, values);
      return result.length > 0 ? result[0] : false;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 주어진 필터 조건으로 캐시에서 단일 행을 조회합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} [filter={}] - 조회 조건
   * @param {Array} [likeFields=[]] - LIKE 검색을 사용할 필드 이름 배열
   * @param {string} [select='*'] - 조회할 필드들
   * @param {number} [expireSeconds=60] - 캐시 만료 시간(초)
   * @returns {Promise<Object|boolean>} 조회된 행 또는 실패시 false
   * @throws {Error} 조회 중 오류 발생시
   */
  async findOneByFilterFromCacheAsync(connection, filter = {}, likeFields = [], select = '*', expireSeconds = 60) {
    if (typeof filter !== 'object' || Array.isArray(filter)) {
      throw new Error('Data must be an object');
    }

    const cacheKey = ['mysql', this.tableName, JSON.stringify(filter), select].join('__');
    return redisServer.getOrSetCache(
      cacheKey,
      () => this.findOneByFilterAsync(connection, filter, likeFields, select),
      expireSeconds
    );
  }

  /**
   * 주어진 필터 조건으로 여러 행을 조회합니다. LIKE 검색을 지원합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} [filter={}] - 조회 조건
   * @param {Array} [likeFields=[]] - LIKE 검색을 사용할 필드 이름 배열
   * @param {string} [select='*'] - 조회할 필드들
   * @param {string} [orderBy=''] - 정렬 조건
   * @returns {Promise<Array>} 조회된 행들
   * @throws {Error} 조회 중 오류 발생시
   */
  async findByFilterAsync(connection, filter = {}, likeFields = [], select = '*', orderBy = '') {
    if (typeof filter !== 'object' || Array.isArray(filter)) {
      throw new Error('Filter must be an object');
    }

    const { where, values } = this._buildWhereClause(filter, likeFields);
    const orderByClause = this._buildOrderByClause(orderBy);
    const sql = `SELECT ${select} FROM ${this._escapeFieldName(this.tableName)} ${where} ${orderByClause}`;

    try {
      return await this.queryAsync(connection, sql, values);
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 주어진 필터 조건으로 캐시에서 여러 행을 조회합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} [filter={}] - 조회 조건
   * @param {Array} [likeFields=[]] - LIKE 검색을 사용할 필드 이름 배열
   * @param {string} [select='*'] - 조회할 필드들
   * @param {string} [orderBy=''] - 정렬 조건
   * @param {number} [expireSeconds=60] - 캐시 만료 시간(초)
   * @returns {Promise<Array>} 조회된 행들
   * @throws {Error} 조회 중 오류 발생시
   */
  async findByFilterFromCacheAsync(
    connection,
    filter = {},
    likeFields = [],
    select = '*',
    orderBy = '',
    expireSeconds = 60
  ) {
    if (typeof filter !== 'object' || Array.isArray(filter)) {
      throw new Error('Data must be an object');
    }

    const cacheKey = ['mysql', this.tableName, JSON.stringify(filter), select, orderBy].join('__');
    return redisServer.getOrSetCache(
      cacheKey,
      () => this.findByFilterAsync(connection, filter, likeFields, select, orderBy),
      expireSeconds
    );
  }

  /**
   * 주어진 필터 조건에 맞는 행의 수를 조회합니다. LIKE 검색을 지원합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} [filter={}] - 조회 조건
   * @param {Array} [likeFields=[]] - LIKE 검색을 사용할 필드 이름 배열
   * @returns {Promise<number>} 조회된 행의 수
   * @throws {Error} 조회 중 오류 발생시
   */
  async countByFilterAsync(connection, filter = {}, likeFields = []) {
    if (typeof filter !== 'object' || Array.isArray(filter)) {
      throw new Error('Filter must be an object');
    }

    const { where, values } = this._buildWhereClause(filter, likeFields);
    const sql = `SELECT COUNT(${this._escapeFieldName(this.primaryField)}) AS CNT FROM ${this._escapeFieldName(
      this.tableName
    )} ${where}`;

    try {
      const result = await this.queryAsync(connection, sql, values);
      return result.length > 0 ? parseInt(result[0].CNT) : 0;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 주어진 필터 조건에 맞는 행의 수를 캐시에서 조회합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} [filter={}] - 조회 조건
   * @param {Array} [likeFields=[]] - LIKE 검색을 사용할 필드 이름 배열
   * @param {number} [expireSeconds=60] - 캐시 만료 시간(초)
   * @returns {Promise<number>} 조회된 행의 수
   * @throws {Error} 조회 중 오류 발생시
   */
  async countByFilterFromCacheAsync(connection, filter = {}, likeFields = [], expireSeconds = 60) {
    if (typeof filter !== 'object' || Array.isArray(filter)) {
      throw new Error('Data must be an object');
    }

    const cacheKey = ['mysql', this.tableName, JSON.stringify(filter)].join('__');
    return redisServer.getOrSetCache(
      cacheKey,
      () => this.countByFilterAsync(connection, filter, likeFields),
      expireSeconds
    );
  }

  /**
   * 페이징된 결과를 반환하는 MySQL 쿼리 함수
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} filter - 필터 조건
   * @param {Array} [likeFields=[]] - LIKE 검색을 사용할 필드 이름 배열
   * @param {string} [select='*'] - 선택할 컬럼 (쉼표로 구분)
   * @param {number} [page=1] - 페이지 번호
   * @param {number} [pageSize=25] - 페이지당 항목 수
   * @param {Object} [sort={}] - 정렬 조건
   * @returns {Promise<Object>} 페이징된 결과
   * @throws {Error} 쿼리 실행 중 오류 발생시
   */
  async findByPageAsync(connection, filter = {}, likeFields = [], select = '*', page = 1, pageSize = 25, sort = {}) {
    try {
      const { where, values } = this._buildWhereClause(filter, likeFields);
      const offset = (page - 1) * pageSize;

      const orderByClause = this._buildOrderByClause(sort);

      const sql = `
      SELECT ${select} FROM ${this._escapeFieldName(this.tableName)}
      ${where}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

      const countSql = `
      SELECT COUNT(*) as CNT FROM ${this._escapeFieldName(this.tableName)}
      ${where}
    `;

      const documents = await this.queryAsync(connection, sql, [...values, pageSize, offset]);
      const result = await this.queryAsync(connection, countSql, values);
      const totalCount = result.length > 0 ? parseInt(result[0].CNT) : 0;

      return {
        documents,
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      };
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 페이징된 결과를 캐시에서 가져오거나, 없으면 DB에서 조회 후 캐시에 저장합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} [filter={}] - 필터 조건
   * @param {Array} [likeFields=[]] - LIKE 검색을 사용할 필드 이름 배열
   * @param {string} [select='*'] - 선택할 컬럼 (쉼표로 구분)
   * @param {number} [page=1] - 페이지 번호
   * @param {number} [pageSize=25] - 페이지당 항목 수
   * @param {Object} [sort={}] - 정렬 조건
   * @param {number} [expireSeconds=60] - 캐시 만료 시간(초)
   * @returns {Promise<Object>} 페이징된 결과
   * @throws {Error} 쿼리 실행 중 오류 발생시
   */
  async findByPageFromCacheAsync(
    connection,
    filter = {},
    likeFields = [],
    select = '*',
    page = 1,
    pageSize = 25,
    sort = {},
    expireSeconds = 60
  ) {
    const cacheKey = [
      'mysql',
      this.tableName,
      'page',
      JSON.stringify(filter),
      JSON.stringify(likeFields),
      select,
      page,
      pageSize,
      JSON.stringify(sort)
    ].join('__');

    return redisServer.getOrSetCache(
      cacheKey,
      async () => {
        const result = await this.findByPageAsync(connection, filter, likeFields, select, page, pageSize, sort);

        // 캐시에 저장하기 전에 결과가 유효한지 확인
        if (result && result.documents) {
          return result;
        } else {
          throw new Error('Invalid result from findByPageAsync');
        }
      },
      expireSeconds
    );
  }

  /**
   * 새로운 데이터를 삽입합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object} datas - 삽입할 데이터
   * @returns {Promise<number>} 삽입된 행의 ID
   * @throws {Error} 삽입 중 오류 발생시
   */
  async insertAsync(connection, datas) {
    if (typeof datas !== 'object' || Array.isArray(datas)) {
      throw new Error('Data must be an object');
    }
    if (Object.keys(datas).length === 0) {
      throw new Error('Data object cannot be empty');
    }

    const columns = Object.keys(datas).map(this._escapeFieldName);
    const placeholders = columns.map(() => '?');
    const values = Object.values(datas);

    const sql = `INSERT INTO ${this._escapeFieldName(this.tableName)} (${columns.join(
      ', '
    )}) VALUES (${placeholders.join(', ')})`;

    try {
      const result = await this.queryAsync(connection, sql, values);
      if (!result) {
        return false;
      }

      return result.insertId;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * 주어진 필터 조건에 맞는 데이터를 업데이트합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object|string} filter - 업데이트할 행을 필터링하는 조건
   * @param {Object} datas - 업데이트할 데이터
   * @returns {Promise<boolean>} 업데이트 성공 여부
   * @throws {Error} 파라미터 오류 또는 업데이트 중 오류 발생시
   */
  async updateByFilterAsync(connection, filter, datas) {
    try {
      if (typeof datas !== 'object' || Array.isArray(datas) || Object.keys(datas).length === 0) {
        throw new Error('Data must be an object');
      }

      const setClause = Object.keys(datas)
        .map((key) => `${this._escapeFieldName(key)} = ?`)
        .join(', ');
      const values = Object.values(datas);

      let whereClause = '';
      if (typeof filter === 'object' && !Array.isArray(filter)) {
        whereClause = `WHERE ${Object.keys(filter)
          .map((key) => `${this._escapeFieldName(key)} = ?`)
          .join(' AND ')}`;
        values.push(...Object.values(filter));
      } else if (typeof filter === 'string' && filter.trim() !== '') {
        whereClause = filter;
      } else {
        throw new Error('A valid filter condition must be provided.');
      }

      const sql = `UPDATE ${this._escapeFieldName(this.tableName)} SET ${setClause} ${whereClause}`;

      const result = await this.queryAsync(connection, sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }

  /**
   * MySQL 테이블에 upsert 작업을 수행합니다.
   * 주어진 필터 조건에 맞는 레코드가 있으면 업데이트하고, 없으면 새 레코드를 삽입합니다.
   *
   * @async
   * @param {Object} connection - MySQL 데이터베이스 연결 객체
   * @param {Object} filter - upsert 작업을 위한 필터 조건. 반드시 유니크 또는 프라이머리 키를 포함해야 합니다.
   * @param {Object} data - 삽입하거나 업데이트할 데이터
   * @returns {Promise<boolean>} 작업 성공 여부를 나타내는 불리언 값
   * @throws {Error} 필터나 데이터가 올바르지 않은 경우 또는 데이터베이스 작업 중 오류 발생 시
   */
  async upsertAsync(connection, filter, data) {
    if (typeof filter !== 'object' || Array.isArray(filter) || Object.keys(filter).length === 0) {
      throw new Error('Filter must be a non-empty object');
    }
    if (typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
      throw new Error('Data must be a non-empty object');
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const updateSet = columns
      .map((col) => `${this._escapeFieldName(col)} = VALUES(${this._escapeFieldName(col)})`)
      .join(', ');

    const sql = `
    INSERT INTO ${this._escapeFieldName(this.tableName)}
    (${columns.map(this._escapeFieldName).join(', ')})
    VALUES (${columns.map(() => '?').join(', ')})
    ON DUPLICATE KEY UPDATE
    ${updateSet}
  `;

    try {
      const [result] = await connection.query(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      instance.logger.error('MySQL upsertAsync error:', error);
      throw error;
    }
  }

  /**
   * 주어진 필터 조건에 맞는 데이터를 삭제합니다.
   * @param {Object} connection - 데이터베이스 연결
   * @param {Object|string} filter - 삭제할 행을 필터링하는 조건
   * @returns {Promise<boolean>} 삭제 성공 여부
   * @throws {Error} 파라미터 오류 또는 삭제 중 오류 발생시
   */
  async deleteByFilterAsync(connection, filter) {
    try {
      let whereClause = '';
      let values = [];

      if (typeof filter === 'object' && !Array.isArray(filter)) {
        whereClause = `WHERE ${Object.keys(filter)
          .map((key) => `${this._escapeFieldName(key)} = ?`)
          .join(' AND ')}`;
        values = Object.values(filter);
      } else if (typeof filter === 'string' && filter.trim() !== '') {
        whereClause = `WHERE ${filter}`;
      } else {
        throw new Error('유효한 필터 조건이 제공되어야 합니다');
      }

      const sql = `DELETE FROM ${this._escapeFieldName(this.tableName)} ${whereClause}`;

      const result = await this.queryAsync(connection, sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      instance.logger.error('mysql core error:', error);
      throw new Error(error);
    }
  }
}
