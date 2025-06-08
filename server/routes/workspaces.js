import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Activity from '../models/Activity.js';
import { authenticateToken, checkWorkspaceAccess } from '../middleware/auth.js';

const router = express.Router();

// Create workspace
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1 }).withMessage('Workspace name is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, description } = req.body;
    const userId = req.user._id;

    // Create workspace
    const workspace = new Workspace({
      name,
      description,
      owner: userId,
      members: [{
        user: userId,
        role: 'owner',
        joinedAt: new Date()
      }],
      inviteToken: uuidv4()
    });

    await workspace.save();

    // Add workspace to user
    const user = await User.findById(userId);
    user.workspaces.push({
      workspace: workspace._id,
      role: 'owner',
      joinedAt: new Date()
    });
    await user.save();

    // Log activity
    const activity = new Activity({
      user: userId,
      workspace: workspace._id,
      action: 'joined_workspace',
      details: `Created workspace "${name}"`
    });
    await activity.save();

    await workspace.populate('owner', 'name email');
    await workspace.populate('members.user', 'name email');

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user workspaces
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'workspaces.workspace',
        populate: {
          path: 'members.user',
          select: 'name email lastActive'
        }
      });

    const workspaces = user.workspaces.map(ws => ({
      ...ws.workspace.toObject(),
      userRole: ws.role,
      joinedAt: ws.joinedAt
    }));

    res.json({ workspaces });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join workspace by invite token
router.post('/join/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findOne({ inviteToken: token });
    if (!workspace) {
      return res.status(404).json({ message: 'Invalid or expired invite link' });
    }

    // Check if user is already a member
    const existingMember = workspace.members.find(
      member => member.user.toString() === userId.toString()
    );

    if (existingMember) {
      return res.status(400).json({ message: 'You are already a member of this workspace' });
    }

    // Add user to workspace
    workspace.members.push({
      user: userId,
      role: workspace.settings.defaultRole,
      joinedAt: new Date()
    });
    await workspace.save();

    // Add workspace to user
    const user = await User.findById(userId);
    user.workspaces.push({
      workspace: workspace._id,
      role: workspace.settings.defaultRole,
      joinedAt: new Date()
    });
    await user.save();

    // Log activity
    const activity = new Activity({
      user: userId,
      workspace: workspace._id,
      action: 'joined_workspace',
      details: `Joined workspace "${workspace.name}"`
    });
    await activity.save();

    await workspace.populate('owner', 'name email');
    await workspace.populate('members.user', 'name email');

    res.json({
      message: 'Successfully joined workspace',
      workspace
    });
  } catch (error) {
    console.error('Join workspace error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get workspace details
router.get('/:workspaceId', authenticateToken, checkWorkspaceAccess, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email lastActive');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    res.json({ workspace });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get workspace activities
router.get('/:workspaceId/activities', authenticateToken, checkWorkspaceAccess, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const activities = await Activity.find({ workspace: workspaceId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Activity.countDocuments({ workspace: workspaceId });

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;