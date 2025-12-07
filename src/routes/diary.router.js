import express from 'express';
import DiaryModel from '../models/diary.mysql.js';
import mysqlserver from '../core/mysql.core.js';

const router = express.Router();
const diaryModel = new DiaryModel();

// Get all diary entries
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await mysqlserver.openConnectionAsync();
    const diaries = await diaryModel.allAsync(conn);
    res.json(diaries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (conn) {
      await mysqlserver.closeConnectionAsync(conn);
    }
  }
});

// Get a specific diary entry
router.get('/:id', async (req, res) => {
  let conn;
  try {
    conn = await mysqlserver.openConnectionAsync();
    const diary = await diaryModel.findOneByFilterAsync(conn, { id: req.params.id });
    if (diary) {
      res.json(diary);
    } else {
      res.status(404).json({ message: 'Diary not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (conn) {
      await mysqlserver.closeConnectionAsync(conn);
    }
  }
});

// Create a new diary entry
router.post('/', async (req, res) => {
  let conn;
  try {
    conn = await mysqlserver.openConnectionAsync();
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    const diaryId = await diaryModel.insertAsync(conn, { title, content });
    res.status(201).json({ id: diaryId, title, content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (conn) {
      await mysqlserver.closeConnectionAsync(conn);
    }
  }
});

// Update a diary entry
router.put('/:id', async (req, res) => {
  let conn;
  try {
    conn = await mysqlserver.openConnectionAsync();
    const { title, content } = req.body;
    const updated = await diaryModel.updateByFilterAsync(conn, { id: req.params.id }, { title, content });
    if (updated) {
      res.json({ message: 'Diary updated successfully' });
    } else {
      res.status(404).json({ message: 'Diary not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (conn) {
      await mysqlserver.closeConnectionAsync(conn);
    }
  }
});

// Delete a diary entry
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await mysqlserver.openConnectionAsync();
    const deleted = await diaryModel.deleteByFilterAsync(conn, { id: req.params.id });
    if (deleted) {
      res.json({ message: 'Diary deleted successfully' });
    } else {
      res.status(404).json({ message: 'Diary not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (conn) {
      await mysqlserver.closeConnectionAsync(conn);
    }
  }
});

export default router;
