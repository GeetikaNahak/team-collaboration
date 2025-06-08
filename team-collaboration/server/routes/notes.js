wimport express from 'express';
import { body, validationResult } from 'express-validator';
import Note from '../models/Note.js';
import Activity from '../models/Activity.js';
import { authenticateToken, checkWorkspaceAccess } from '../middleware/auth.js';

const router = express.Router();

// Get all notes in workspace
router.get('/:workspaceId', authenticateToken, checkWorkspaceAccess, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const notes = await Note.find({ workspace: workspaceId })
      .populate('author', 'name email')
      .sort({ lastEditedAt: -1 });

    // Separate user's notes and teammates' notes
    const myNotes = notes.filter(note => note.author._id.toString() === userId.toString());
    const teammateNotes = notes.filter(note => note.author._id.toString() !== userId.toString());

    res.json({
      myNotes,
      teammateNotes
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create note
router.post('/:workspaceId', authenticateToken, checkWorkspaceAccess, [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('content').optional(),
  body('allowTeammateEdit').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { workspaceId } = req.params;
    const { title, content = '', allowTeammateEdit = true } = req.body;
    const userId = req.user._id;

    const note = new Note({
      title,
      content,
      author: userId,
      workspace: workspaceId,
      allowTeammateEdit,
      versions: [{
        content,
        savedAt: new Date(),
        version: 1
      }]
    });

    await note.save();
    await note.populate('author', 'name email');

    // Log activity
    const activity = new Activity({
      user: userId,
      workspace: workspaceId,
      action: 'created_note',
      details: `Created note "${title}"`,
      metadata: { noteId: note._id }
    });
    await activity.save();

    res.status(201).json({
      message: 'Note created successfully',
      note
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update note
router.put('/:workspaceId/:noteId', authenticateToken, checkWorkspaceAccess, [
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Title cannot be empty'),
  body('content').optional(),
  body('allowTeammateEdit').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { workspaceId, noteId } = req.params;
    const { title, content, allowTeammateEdit } = req.body;
    const userId = req.user._id;

    const note = await Note.findOne({ 
      _id: noteId, 
      workspace: workspaceId 
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check if user can edit this note
    const isAuthor = note.author.toString() === userId.toString();
    const canEdit = isAuthor || note.allowTeammateEdit;

    if (!canEdit) {
      return res.status(403).json({ message: 'You do not have permission to edit this note' });
    }

    // Update note
    if (title !== undefined) note.title = title;
    if (content !== undefined) {
      note.content = content;
      // Add version
      const latestVersion = note.versions.length;
      note.versions.push({
        content,
        savedAt: new Date(),
        version: latestVersion + 1
      });
    }
    if (allowTeammateEdit !== undefined && isAuthor) {
      note.allowTeammateEdit = allowTeammateEdit;
    }

    await note.save();
    await note.populate('author', 'name email');

    // Log activity
    const activity = new Activity({
      user: userId,
      workspace: workspaceId,
      action: 'updated_note',
      details: `Updated note "${note.title}"`,
      metadata: { noteId: note._id }
    });
    await activity.save();

    res.json({
      message: 'Note updated successfully',
      note
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific note
router.get('/:workspaceId/:noteId', authenticateToken, checkWorkspaceAccess, async (req, res) => {
  try {
    const { workspaceId, noteId } = req.params;

    const note = await Note.findOne({ 
      _id: noteId, 
      workspace: workspaceId 
    }).populate('author', 'name email');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({ note });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete note
router.delete('/:workspaceId/:noteId', authenticateToken, checkWorkspaceAccess, async (req, res) => {
  try {
    const { workspaceId, noteId } = req.params;
    const userId = req.user._id;

    const note = await Note.findOne({ 
      _id: noteId, 
      workspace: workspaceId,
      author: userId 
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied' });
    }

    await Note.findByIdAndDelete(noteId);

    // Log activity
    const activity = new Activity({
      user: userId,
      workspace: workspaceId,
      action: 'deleted_note',
      details: `Deleted note "${note.title}"`,
      metadata: { noteId: note._id }
    });
    await activity.save();

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;