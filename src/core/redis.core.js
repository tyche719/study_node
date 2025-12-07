/**
 * @file
 * @lastModified 2024-09-14
 */

import config from '../config.js';
import instance from '../instance.js';

/**
 * Redis 서버와의 상호작용을 관리하는 클래스입니다.
 * @class
 */
export default class redisserver {
  /**
   * RedisServer 클래스의 새 인스턴스를 생성합니다.
   * 생성자는 config 객체에서 Redis 연결 정보를 읽어 클라이언트를 초기화합니다.
   */
  constructor() {
    this.redisClient = instance.redis;
    this.connectAsync()
      .then()
      .catch((error) => {
        instance.logger.error('redis core error:', error);
      });
  }

  /**
   * Redis 서버에 비동기적으로 연결합니다.
   *
   * @returns {Promise<boolean>} 연결 성공 여부
   */
  async connectAsync() {
    try {
      await this.redisClient.connect();
      return true;
    } catch (error) {
      instance.logger.error('redis core error:', error);
      return false;
    }
  }

  /**
   * 지정된 키에 해당하는 값을 비동기적으로 가져옵니다.
   *
   * @param {string} key - 가져올 값의 키
   * @returns {Promise<string|null>} 키에 해당하는 값 또는 키가 존재하지 않을 경우 null
   * @throws {Error} Redis 작업 중 오류 발생 시
   */
  async getAsync(key) {
    key = `${config.env}_${key}`;
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      return false;
    }
  }

  /**
   * 지정된 키에 값을 비동기적으로 설정합니다.
   *
   * @param {string} key - 설정할 키
   * @param {string} value - 설정할 값
   * @param {number} [expireTTL=0] - 키의 만료 시간 (초 단위, 기본값 0)
   * @returns {Promise<string|boolean>} 작업 결과 또는 실패 시 false
   * @throws {Error} Redis 작업 중 오류 발생 시
   */
  async setAsync(key, value, expireTTL = config.redis.expireTTL) {
    key = `${config.env}_${key}`;
    try {
      const result = this.redisClient.set(key, value);
      if (expireTTL > 0) {
        await this.redisClient.expire(key, expireTTL);
      }
      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * 지정된 키를 비동기적으로 삭제합니다.
   *
   * @param {string} key - 삭제할 키
   * @returns {Promise<number|boolean>} 삭제된 키의 수 또는 실패 시 false
   * @throws {Error} Redis 작업 중 오류 발생 시
   */
  async delAsync(key) {
    key = `${config.env}_${key}`;
    try {
      return this.redisClient.del(key);
    } catch (error) {
      return false;
    }
  }

  /**
   * 지정된 키의 만료 시간을 비동기적으로 설정합니다.
   *
   * @param {string} key - 만료 시간을 설정할 키
   * @param {number} ttl - 설정할 만료 시간 (초 단위)
   * @returns {Promise<boolean>} 작업 성공 여부
   * @throws {Error} Redis 작업 중 오류 발생 시
   */
  async expireAsync(key, ttl = config.redis.expireTTL) {
    key = `${config.env}_${key}`;
    try {
      return await this.redisClient.expire(key, ttl);
    } catch (error) {
      return false;
    }
  }

  /**
   * 캐시에서 값을 가져오거나, 없을 경우 제공된 함수를 실행하여 값을 설정합니다.
   *
   * @param {string} key - 캐시 키
   * @param {Function} fetchFunction - 캐시 미스 시 실행할 함수
   * @param {number} expireSeconds - 캐시 만료 시간 (초 단위)
   * @returns {Promise<*>} 캐시된 값 또는 fetchFunction의 결과
   * @throws {Error} Redis 작업 또는 fetchFunction 실행 중 오류 발생 시
   */
  async getOrSetCache(key, fetchFunction, expireSeconds) {
    try {
      let result = await this.getAsync(key);
      if (!result) {
        result = await fetchFunction();
        if (result) {
          await this.setAsync(key, JSON.stringify(result), expireSeconds);
        }
      } else {
        result = JSON.parse(result);
      }
      return result;
    } catch (error) {
      instance.logger.error('Redis getOrSetCache error:', error);
      return null;
    }
  }
}
