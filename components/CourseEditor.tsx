import React, { useState, useEffect, useRef } from 'react';
import { Course, CourseLevel } from '../types';
import { Button } from './Button';

interface CourseEditorProps {
  course: Course;
  onSave: (updatedCourse: Course) => void;
  onCancel: () => void;
  isCreating?: boolean;
}

const EditorToolbarButton = ({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        title={label}
    >
        {icon}
    </button>
);

export const CourseEditor: React.FC<CourseEditorProps> = ({ course, onSave, onCancel, isCreating = false }) => {
  const [formData, setFormData] = useState<Course>(course);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormData(course);
    if (editorRef.current && course.description) {
        editorRef.current.innerHTML = course.description;
    }
  }, [course]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleDescriptionChange = () => {
      if (editorRef.current) {
          setFormData(prev => ({ ...prev, description: editorRef.current?.innerHTML || '' }));
      }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, signatureImage: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveSignature = () => {
      setFormData(prev => ({ ...prev, signatureImage: undefined }));
  };

  const execCmd = (command: string) => {
      document.execCommand(command, false, undefined);
      handleDescriptionChange();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-indigo-900 px-6 py-4 border-b border-indigo-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{isCreating ? 'Create New Training Program' : 'Edit Training Program'}</h2>
          {isCreating ? (
             <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-bold uppercase tracking-wider">New</span>
          ) : (
             <span className="px-2 py-1 bg-indigo-800 text-indigo-200 text-xs rounded font-mono">ID: {formData.id}</span>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Training Program Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g. Advanced Data Visualization"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-shadow">
                  <div className="bg-gray-50 border-b border-gray-200 p-1 flex gap-1">
                      <EditorToolbarButton 
                          onClick={() => execCmd('bold')} 
                          label="Bold"
                          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 100-8H6v8zm0 0h8a4 4 0 110 8H6v-8z" /></svg>} 
                      />
                      <EditorToolbarButton 
                          onClick={() => execCmd('italic')} 
                          label="Italic"
                          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 5h4M8 19h4M12 5l-2 14" /></svg>} 
                      />
                      <EditorToolbarButton 
                          onClick={() => execCmd('insertUnorderedList')} 
                          label="Bullet List"
                          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>} 
                      />
                      <EditorToolbarButton 
                          onClick={() => execCmd('insertOrderedList')} 
                          label="Numbered List"
                          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01" /></svg>} 
                      />
                  </div>
                  <div
                      ref={editorRef}
                      contentEditable
                      className="p-3 min-h-[150px] outline-none text-sm text-gray-900 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                      onInput={handleDescriptionChange}
                      suppressContentEditableWarning
                  />
              </div>
              <p className="text-xs text-gray-500 mt-1">Use the toolbar to format text. Lists and bold text are supported.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor Name</label>
              <input
                type="text"
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g. 8 Weeks"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {Object.values(CourseLevel).map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (GHC)</label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">GHC</span>
                </div>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-md border border-gray-300 pl-12 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={handleTagsChange}
                placeholder="Python, AI, Business"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
             <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Training Program Image URL</label>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                required
                placeholder="https://..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructor Signature (for Certificate)</label>
                <div className="flex items-center gap-4">
                    {formData.signatureImage ? (
                        <div className="relative group">
                            <div className="h-16 w-32 bg-white border border-gray-300 rounded flex items-center justify-center overflow-hidden p-1">
                                <img src={formData.signatureImage} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                            </div>
                            <button 
                                type="button"
                                onClick={handleRemoveSignature}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 focus:outline-none"
                                title="Remove Signature"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="h-16 w-32 bg-gray-100 border border-gray-300 border-dashed rounded flex items-center justify-center text-gray-400 text-xs text-center p-2">
                            No signature uploaded
                        </div>
                    )}
                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/svg+xml"
                            onChange={handleSignatureUpload}
                            className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100 cursor-pointer"
                        />
                         <p className="mt-1 text-xs text-gray-500">Upload a PNG/JPG with transparent background for best results.</p>
                    </div>
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary">{isCreating ? 'Create Training Program' : 'Save Changes'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};