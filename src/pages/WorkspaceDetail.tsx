import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Users, 
  Link as LinkIcon, 
  Edit3, 
  Eye, 
  Save,
  Trash2,
  Lock,
  Unlock,
  Settings
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Note {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  allowTeammateEdit: boolean;
  lastEditedAt: string;
  versions: Array<{
    content: string;
    savedAt: string;
    version: number;
  }>;
}

interface Workspace {
  _id: string;
  name: string;
  description?: string;
  members: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
      lastActive: string;
    };
    role: string;
    joinedAt: string;
  }>;
  inviteToken: string;
}

const WorkspaceDetail: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [teammateNotes, setTeammateNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'my' | 'teammate'>('my');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editAllowTeammateEdit, setEditAllowTeammateEdit] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteAllowEdit, setNewNoteAllowEdit] = useState(true);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceData();
    }
  }, [workspaceId]);

  const fetchWorkspaceData = async () => {
    try {
      const [workspaceRes, notesRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get(`/notes/${workspaceId}`)
      ]);

      setWorkspace(workspaceRes.data.workspace);
      setMyNotes(notesRes.data.myNotes);
      setTeammateNotes(notesRes.data.teammateNotes);
    } catch (error) {
      console.error('Error fetching workspace data:', error);
      toast.error('Failed to load workspace data');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createNewNote = async () => {
    if (!newNoteTitle.trim()) {
      toast.error('Note title is required');
      return;
    }

    try {
      const response = await api.post(`/notes/${workspaceId}`, {
        title: newNoteTitle.trim(),
        content: '',
        allowTeammateEdit: newNoteAllowEdit
      });

      const newNote = response.data.note;
      setMyNotes(prev => [newNote, ...prev]);
      setSelectedNote(newNote);
      setIsEditing(true);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
      setEditAllowTeammateEdit(newNote.allowTeammateEdit);
      setViewMode('my');
      
      // Reset modal
      setShowCreateModal(false);
      setNewNoteTitle('');
      setNewNoteAllowEdit(true);
      
      toast.success('Note created successfully!');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const saveNote = async () => {
    if (!selectedNote) return;

    setSaving(true);
    try {
      const response = await api.put(`/notes/${workspaceId}/${selectedNote._id}`, {
        title: editTitle,
        content: editContent,
        allowTeammateEdit: editAllowTeammateEdit
      });

      const updatedNote = response.data.note;
      setMyNotes(prev => prev.map(note => 
        note._id === updatedNote._id ? updatedNote : note
      ));
      setSelectedNote(updatedNote);
      setIsEditing(false);
      
      toast.success('Note saved successfully!');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.delete(`/notes/${workspaceId}/${noteId}`);
      
      setMyNotes(prev => prev.filter(note => note._id !== noteId));
      if (selectedNote?._id === noteId) {
        setSelectedNote(null);
        setIsEditing(false);
      }
      
      toast.success('Note deleted successfully!');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const selectNote = (note: Note, isMyNote: boolean) => {
    setSelectedNote(note);
    setIsEditing(false);
    setViewMode(isMyNote ? 'my' : 'teammate');
    
    if (isMyNote) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditAllowTeammateEdit(note.allowTeammateEdit);
    }
  };

  const startEditing = () => {
    if (selectedNote) {
      const isAuthor = selectedNote.author._id === user?._id;
      const canEdit = isAuthor || selectedNote.allowTeammateEdit;
      
      if (canEdit) {
        setIsEditing(true);
        setEditTitle(selectedNote.title);
        setEditContent(selectedNote.content);
        setEditAllowTeammateEdit(selectedNote.allowTeammateEdit);
      } else {
        toast.error('You do not have permission to edit this note');
      }
    }
  };

  const copyInviteLink = () => {
    if (workspace) {
      const inviteUrl = `${window.location.origin}/join/${workspace.inviteToken}`;
      navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard!');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const canEditNote = (note: Note) => {
    const isAuthor = note.author._id === user?._id;
    return isAuthor || note.allowTeammateEdit;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Workspace not found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-gray-600 mt-1">{workspace.description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowInviteLink(!showInviteLink)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Invite Link</span>
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {showInviteLink && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-md">
            <p className="text-sm text-emerald-800 mb-2">Share this link to invite teammates:</p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-2 bg-white rounded border text-sm">
                {`${window.location.origin}/join/${workspace.inviteToken}`}
              </code>
              <button
                onClick={copyInviteLink}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Note</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Title
                </label>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter note title"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="editPermission"
                      checked={newNoteAllowEdit}
                      onChange={() => setNewNoteAllowEdit(true)}
                      className="mr-2"
                    />
                    <Unlock className="w-4 h-4 mr-2 text-emerald-600" />
                    <span className="text-sm">Allow teammates to edit</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="editPermission"
                      checked={!newNoteAllowEdit}
                      onChange={() => setNewNoteAllowEdit(false)}
                      className="mr-2"
                    />
                    <Lock className="w-4 h-4 mr-2 text-orange-600" />
                    <span className="text-sm">Read-only for teammates</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewNoteTitle('');
                  setNewNoteAllowEdit(true);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewNote}
                disabled={!newNoteTitle.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Members */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Team Members ({workspace.members.length})
            </h3>
            <div className="space-y-2">
              {workspace.members.map((member) => (
                <div key={member.user._id} className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-indigo-600">
                      {member.user.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.user.name}
                      {member.user._id === user?._id && ' (you)'}
                    </p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* My Notes */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              My Notes ({myNotes.length})
            </h3>
            <div className="space-y-2">
              {myNotes.map((note) => (
                <button
                  key={note._id}
                  onClick={() => selectNote(note, true)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedNote?._id === note._id && viewMode === 'my'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate flex-1">{note.title}</p>
                    {note.allowTeammateEdit ? (
                      <Unlock className="w-3 h-3 text-emerald-600 ml-1" />
                    ) : (
                      <Lock className="w-3 h-3 text-orange-600 ml-1" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDate(note.lastEditedAt)}
                  </p>
                </button>
              ))}
              {myNotes.length === 0 && (
                <p className="text-sm text-gray-500">No notes yet</p>
              )}
            </div>
          </div>

          {/* Teammate Notes */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              Teammate Notes ({teammateNotes.length})
            </h3>
            <div className="space-y-2">
              {teammateNotes.map((note) => (
                <button
                  key={note._id}
                  onClick={() => selectNote(note, false)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedNote?._id === note._id && viewMode === 'teammate'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate flex-1">{note.title}</p>
                    {note.allowTeammateEdit ? (
                      <Unlock className="w-3 h-3 text-emerald-600 ml-1" />
                    ) : (
                      <Lock className="w-3 h-3 text-orange-600 ml-1" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    by {note.author.name} • {formatDate(note.lastEditedAt)}
                  </p>
                </button>
              ))}
              {teammateNotes.length === 0 && (
                <p className="text-sm text-gray-500">No teammate notes yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm h-full">
            {selectedNote ? (
              <div className="h-full flex flex-col">
                {/* Editor Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      {isEditing ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-lg font-medium"
                          placeholder="Note title"
                        />
                      ) : (
                        selectedNote.title
                      )}
                    </h2>
                    
                    <div className="flex items-center space-x-2">
                      {viewMode === 'teammate' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          by {selectedNote.author.name}
                        </span>
                      )}
                      
                      {selectedNote.allowTeammateEdit ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <Unlock className="w-3 h-3 mr-1" />
                          Editable
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Lock className="w-3 h-3 mr-1" />
                          Read-only
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {canEditNote(selectedNote) && (
                      <>
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveNote}
                              disabled={saving}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors disabled:opacity-50"
                            >
                              {saving ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setIsEditing(false)}
                              className="text-gray-600 hover:text-gray-800 px-3 py-1 rounded text-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={startEditing}
                            className="text-indigo-600 hover:text-indigo-800 px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </>
                    )}
                    
                    {selectedNote.author._id === user?._id && (
                      <button
                        onClick={() => deleteNote(selectedNote._id)}
                        className="text-red-600 hover:text-red-800 px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Permission Settings (only for author when editing) */}
                {isEditing && selectedNote.author._id === user?._id && (
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <Settings className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Permissions:</span>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="editPermission"
                          checked={editAllowTeammateEdit}
                          onChange={() => setEditAllowTeammateEdit(true)}
                          className="mr-2"
                        />
                        <Unlock className="w-4 h-4 mr-1 text-emerald-600" />
                        <span className="text-sm">Allow teammates to edit</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="editPermission"
                          checked={!editAllowTeammateEdit}
                          onChange={() => setEditAllowTeammateEdit(false)}
                          className="mr-2"
                        />
                        <Lock className="w-4 h-4 mr-1 text-orange-600" />
                        <span className="text-sm">Read-only for teammates</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Editor Content */}
                <div className="flex-1 p-4">
                  {isEditing && canEditNote(selectedNote) ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full resize-none border border-gray-300 rounded p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Start typing your note..."
                    />
                  ) : (
                    <div className="h-full">
                      {selectedNote.content ? (
                        <div className="prose max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-gray-900">
                            {selectedNote.content}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">This note is empty</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Note Info */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="text-xs text-gray-500">
                    Last edited: {formatDate(selectedNote.lastEditedAt)}
                    {selectedNote.versions.length > 1 && (
                      <span className="ml-4">
                        Version {selectedNote.versions.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No note selected</h3>
                  <p className="mt-2 text-gray-500">
                    Select a note from the sidebar or create a new one to get started.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceDetail;