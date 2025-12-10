import React, { useState, useEffect } from 'react';
import { View, User, Course, CourseLevel } from './types';
import { COURSES } from './constants';
import { Navbar } from './components/Navbar';
import { CourseCard } from './components/CourseCard';
import { Auth } from './components/Auth';
import { AIChat } from './components/AIChat';
import { Button } from './components/Button';
import { Certificate } from './components/Certificate';
import { CourseEditor } from './components/CourseEditor';
import { NotificationContainer, Notification } from './components/NotificationContainer';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [selectedCertificateCourseId, setSelectedCertificateCourseId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load data on mount
  useEffect(() => {
    // Load all users database
    const storedUsers = localStorage.getItem('deepmetric_users');
    if (storedUsers) {
        try {
            let parsedUsers = JSON.parse(storedUsers);
            if (Array.isArray(parsedUsers)) {
                // Robust Migration: Ensure all user objects have necessary fields
                parsedUsers = parsedUsers.map((u: any) => ({
                    ...u,
                    registeredCourseIds: Array.isArray(u.registeredCourseIds) ? u.registeredCourseIds : [],
                    completedCourseIds: Array.isArray(u.completedCourseIds) ? u.completedCourseIds : [],
                    pendingCourseIds: Array.isArray(u.pendingCourseIds) ? u.pendingCourseIds : [],
                    courseProgress: u.courseProgress || {},
                    role: u.role || 'student'
                }));
                setAllUsers(parsedUsers);
            }
        } catch (e) {
            console.error("Failed to parse users from localStorage", e);
            // Optionally clear bad data
            // localStorage.removeItem('deepmetric_users');
        }
    }

    // Load current session
    const storedUser = localStorage.getItem('deepmetric_user');
    if (storedUser) {
      try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && typeof parsedUser === 'object') {
              // Data migration for session
              if (!Array.isArray(parsedUser.completedCourseIds)) parsedUser.completedCourseIds = [];
              if (!Array.isArray(parsedUser.pendingCourseIds)) parsedUser.pendingCourseIds = [];
              if (!parsedUser.courseProgress) parsedUser.courseProgress = {};
              if (!parsedUser.role) parsedUser.role = 'student';
              
              setUser(parsedUser);
          }
      } catch (e) {
          console.error("Failed to parse session from localStorage", e);
          localStorage.removeItem('deepmetric_user');
      }
    }

    // Load courses persistence
    const storedCourses = localStorage.getItem('deepmetric_courses');
    if (storedCourses) {
        try {
            const parsedCourses = JSON.parse(storedCourses);
            if (Array.isArray(parsedCourses)) {
                setCourses(parsedCourses);
            }
        } catch (e) {
            console.error("Failed to parse courses from localStorage", e);
        }
    }
  }, []);

  const saveAllUsers = (users: User[]) => {
      setAllUsers(users);
      localStorage.setItem('deepmetric_users', JSON.stringify(users));
  };

  // Notification System
  const addNotification = (message: string, type: 'success' | 'info' | 'email' = 'info') => {
      const id = Date.now();
      setNotifications(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
      }, 6000);
  };

  const removeNotification = (id: number) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const sendEmailSimulation = (to: string, subject: string, body: string) => {
      console.log(`%c[EMAIL SIMULATION]\nTo: ${to}\nSubject: ${subject}\nBody: ${body}`, 'color: #4f46e5; font-weight: bold; padding: 4px;');
      addNotification(`Email sent to ${to}: ${subject}`, 'email');
  };

  const handleAuthSuccess = (name: string, email: string, isAdmin: boolean) => {
    let targetUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
        // Create new user if not found
        targetUser = {
            id: Date.now().toString(),
            name,
            email,
            registeredCourseIds: [],
            completedCourseIds: [],
            pendingCourseIds: [],
            courseProgress: {},
            role: isAdmin ? 'admin' : 'student'
        };
        const newAllUsers = [...allUsers, targetUser];
        saveAllUsers(newAllUsers);
        addNotification(`Welcome to Deepmetrics, ${name}!`, 'success');
    } else {
        // Update role if logging in as admin via secret email
        let updated = false;
        if (isAdmin && targetUser.role !== 'admin') {
            targetUser.role = 'admin';
            updated = true;
        }
        // Migration check for existing users logging in
        if (!targetUser.courseProgress) {
            targetUser.courseProgress = {};
            updated = true;
        }

        if (updated) {
             targetUser = { ...targetUser }; // Create new reference
             const newAllUsers = allUsers.map(u => u.id === targetUser!.id ? targetUser! : u);
             saveAllUsers(newAllUsers);
        }
        addNotification(`Welcome back, ${targetUser.name}!`, 'success');
    }

    setUser(targetUser);
    localStorage.setItem('deepmetric_user', JSON.stringify(targetUser));
    setCurrentView(View.COURSES);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('deepmetric_user');
    setCurrentView(View.HOME);
    addNotification('You have successfully logged out.', 'info');
  };

  const handleRegisterCourse = (courseId: string) => {
    if (!user) {
      setCurrentView(View.LOGIN);
      return;
    }

    if (user.registeredCourseIds.includes(courseId)) {
        addNotification("You are already registered for this training program.", "info");
        return;
    }

    const course = courses.find(c => c.id === courseId);
    
    // Create updated user object
    const updatedUser: User = {
      ...user,
      registeredCourseIds: [...user.registeredCourseIds, courseId],
      courseProgress: {
          ...(user.courseProgress || {}),
          [courseId]: 0 // Initialize progress to 0%
      }
    };
    
    // 1. Update local state
    setUser(updatedUser);
    
    // 2. Persist to session storage (active user)
    localStorage.setItem('deepmetric_user', JSON.stringify(updatedUser));
    
    // 3. Persist to global database (all users)
    const updatedAllUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
    saveAllUsers(updatedAllUsers);
    
    addNotification(`Successfully registered for ${course?.title || 'training program'}!`, 'success');
    
    if (course) {
        sendEmailSimulation(
            user.email, 
            "Training Registration Confirmation", 
            `Dear ${user.name},\n\nYou have successfully registered for ${course.title}. We are excited to have you on board!\n\nBest,\nDeepmetrics Team`
        );
    }
  };

  const handleProgressChange = (courseId: string, progress: number) => {
    if (!user) return;

    const updatedUser: User = {
        ...user,
        courseProgress: {
            ...user.courseProgress,
            [courseId]: progress
        }
    };

    setUser(updatedUser);
    localStorage.setItem('deepmetric_user', JSON.stringify(updatedUser));

    const updatedAllUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
    saveAllUsers(updatedAllUsers);
  };

  const handleRequestCompletion = (courseId: string) => {
    if (!user) return;
    
    // Check if already completed or pending
    if (user.completedCourseIds?.includes(courseId)) {
        addNotification('You have already completed this training program.', 'info');
        return;
    }
    
    // Add to pending
    if (user.pendingCourseIds.includes(courseId)) return;

    const updatedUser: User = {
        ...user,
        pendingCourseIds: [...(user.pendingCourseIds || []), courseId]
    };
    
    setUser(updatedUser);
    localStorage.setItem('deepmetric_user', JSON.stringify(updatedUser));

    // Update global DB
    const updatedAllUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
    saveAllUsers(updatedAllUsers);
    
    const course = courses.find(c => c.id === courseId);
    addNotification(`Completion request sent for ${course?.title}`, 'info');
  };

  const handleApproveCompletion = (targetUserId: string, courseId: string) => {
      const targetUser = allUsers.find(u => u.id === targetUserId);
      const course = courses.find(c => c.id === courseId);
      
      if (!targetUser || !course) return;

      const updatedTargetUser: User = {
          ...targetUser,
          pendingCourseIds: (targetUser.pendingCourseIds || []).filter(id => id !== courseId),
          completedCourseIds: Array.from(new Set([...(targetUser.completedCourseIds || []), courseId])), // Ensure unique
          courseProgress: {
              ...(targetUser.courseProgress || {}),
              [courseId]: 100 // Force progress to 100% on completion
          }
      };

      const updatedAllUsers = allUsers.map(u => u.id === targetUserId ? updatedTargetUser : u);
      saveAllUsers(updatedAllUsers);

      // If the admin is approving themselves (testing purpose), update session
      if (user && user.id === targetUserId) {
          setUser(updatedTargetUser);
          localStorage.setItem('deepmetric_user', JSON.stringify(updatedTargetUser));
      }
      
      addNotification(`Approved completion for ${targetUser.name}. Certificate generated.`, 'success');
      
      // Send Congratulatory Email
      sendEmailSimulation(
          targetUser.email,
          `🎉 Congratulations! You have completed ${course.title}`,
          `Dear ${targetUser.name},

We are thrilled to congratulate you on successfully completing the training program "${course.title}" at Deepmetrics Analytics Institute!

Your dedication and hard work have paid off. Your official Certificate of Completion has been generated and is now ready for you.

To download your certificate:
1. Log in to your Deepmetrics Dashboard.
2. Navigate to "My Training Programs".
3. Click the "Download Certificate" button on the course card.

We wish you the very best in your data analytics journey.

Warm regards,
The Deepmetrics Team`
      );
  };

  const handleRejectCompletion = (targetUserId: string, courseId: string) => {
      const targetUser = allUsers.find(u => u.id === targetUserId);
      const course = courses.find(c => c.id === courseId);
      if (!targetUser) return;

      const updatedTargetUser: User = {
          ...targetUser,
          pendingCourseIds: (targetUser.pendingCourseIds || []).filter(id => id !== courseId)
      };

      const updatedAllUsers = allUsers.map(u => u.id === targetUserId ? updatedTargetUser : u);
      saveAllUsers(updatedAllUsers);

      // If the admin is rejecting themselves (testing purpose), update session
      if (user && user.id === targetUserId) {
          setUser(updatedTargetUser);
          localStorage.setItem('deepmetric_user', JSON.stringify(updatedTargetUser));
      }
      
      addNotification(`Rejected completion for ${targetUser.name}`, 'info');
      
      if (course) {
          sendEmailSimulation(
            targetUser.email,
            `Action Required: Training Completion for ${course.title}`,
            `Dear ${targetUser.name},

Thank you for submitting your completion request for "${course.title}".

After reviewing your progress, we are unable to approve your completion request at this time. This usually happens if there are outstanding assignments or if the training criteria haven't been fully met.

Please reach out to your instructor, ${course.instructor}, for specific feedback on what is needed to complete the training.

Best regards,
Deepmetrics Academic Administration`
          );
      }
  };

  const handleViewCertificate = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course && user) {
        // Optional: Analytics or tracking for certificate views
    }
    setSelectedCertificateCourseId(courseId);
    setCurrentView(View.CERTIFICATE);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCurrentView(View.EDIT_COURSE);
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourseToDelete(courseId);
  };

  const confirmDeleteCourse = () => {
    if (courseToDelete) {
        const newCourses = courses.filter(c => c.id !== courseToDelete);
        setCourses(newCourses);
        localStorage.setItem('deepmetric_courses', JSON.stringify(newCourses));
        setCourseToDelete(null);
        addNotification('Training program deleted successfully', 'success');
    }
  };

  const handleSaveCourse = (updatedCourse: Course) => {
    const updatedCourses = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
    setCourses(updatedCourses);
    localStorage.setItem('deepmetric_courses', JSON.stringify(updatedCourses));
    
    // Only navigate away if we are in the editor views.
    // If we are in the Certificate view (Admin updating signature), stay there.
    if (currentView === View.EDIT_COURSE || currentView === View.CREATE_COURSE) {
        setEditingCourse(null);
        setCurrentView(View.COURSES);
    }

    addNotification('Training program updated successfully', 'success');
  };

  const handleSaveNewCourse = (newCourse: Course) => {
    const newCourses = [...courses, newCourse];
    setCourses(newCourses);
    localStorage.setItem('deepmetric_courses', JSON.stringify(newCourses));
    setCurrentView(View.COURSES);
    addNotification('New training program created successfully', 'success');
  };

  // Calculate global pending requests for Admin badge
  const adminPendingCount = (user?.role === 'admin' && allUsers.length > 0)
      ? allUsers.reduce((acc, u) => acc + (u.pendingCourseIds?.length || 0), 0)
      : 0;

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return (
          <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative bg-indigo-900 text-white py-24 sm:py-32 overflow-hidden">
               <div className="absolute inset-0 overflow-hidden">
                 <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2850&q=80" alt="" className="w-full h-full object-cover opacity-10" />
               </div>
               <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                 <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6">
                   Master the Data Future
                 </h1>
                 <p className="mt-6 text-xl text-indigo-100 max-w-3xl mx-auto">
                   Deepmetrics Analytics Institute provides world-class education in Data Science, AI, and Business Intelligence. Transform your career today.
                 </p>
                 <div className="mt-10 flex justify-center gap-4">
                   <Button size="lg" onClick={() => setCurrentView(View.COURSES)}>Browse Training Programs</Button>
                   <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-indigo-900" onClick={() => setCurrentView(View.REGISTER)}>Join Institute</Button>
                 </div>
               </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Why Choose Deepmetrics?</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        <div className="p-6 bg-gray-50 rounded-xl text-center">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">AI-Driven Learning</h3>
                            <p className="text-gray-500">Personalized curriculum recommendations powered by advanced AI to match your career path.</p>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-xl text-center">
                             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Expert Instructors</h3>
                            <p className="text-gray-500">Learn from industry veterans from top tech companies and research institutions.</p>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-xl text-center">
                             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Hands-on Projects</h3>
                            <p className="text-gray-500">Build a portfolio with real-world datasets and capstone projects to showcase to employers.</p>
                        </div>
                    </div>
                </div>
            </section>
          </div>
        );

      case View.COURSES:
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Explore Our Training Programs</h1>
                {user?.role === 'admin' ? (
                    <div className="flex flex-col items-center gap-4 mt-6">
                         <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Admin Mode: Manage Training Programs
                        </div>
                        <Button onClick={() => setCurrentView(View.CREATE_COURSE)} className="flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Create New Training Program
                        </Button>
                    </div>
                ) : (
                    <p className="mt-4 text-xl text-gray-500">Find the perfect program to accelerate your data career.</p>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map(course => (
                <CourseCard 
                    key={course.id} 
                    course={course} 
                    onRegister={handleRegisterCourse}
                    isRegistered={user?.registeredCourseIds.includes(course.id) || false}
                    isCompleted={user?.completedCourseIds?.includes(course.id) || false}
                    isPending={user?.pendingCourseIds?.includes(course.id) || false}
                    progress={user?.courseProgress?.[course.id] || 0}
                    onRequestCompletion={handleRequestCompletion}
                    isAdmin={user?.role === 'admin'}
                    onEdit={user?.role === 'admin' ? handleEditCourse : undefined}
                    onDelete={user?.role === 'admin' ? handleDeleteCourse : undefined}
                />
              ))}
            </div>
          </div>
        );

      case View.LOGIN:
      case View.REGISTER:
        return (
          <div className="animate-fade-in">
             <Auth view={currentView} onSwitch={setCurrentView} onAuthSuccess={handleAuthSuccess} />
          </div>
        );

      case View.DASHBOARD:
        if (!user) return null;
        const myCourses = courses.filter(c => user.registeredCourseIds.includes(c.id));
        
        // Admin specific data
        const pendingRequests = user.role === 'admin' 
          ? allUsers.flatMap(u => (u.pendingCourseIds || []).map(cid => ({
              user: u,
              courseId: cid,
              course: courses.find(c => c.id === cid)
            }))).filter(req => req.course)
          : [];

        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                {user.role === 'admin' && (
                    <Button variant="secondary" onClick={() => setCurrentView(View.COURSES)}>
                        Manage Training Programs
                    </Button>
                )}
            </div>
            
            {/* Admin Section: Pending Requests */}
            {user.role === 'admin' && (
                <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            Completion Requests (Inbox)
                        </h2>
                        {pendingRequests.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {pendingRequests.length} Pending
                            </span>
                        )}
                    </div>
                    
                    {pendingRequests.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {pendingRequests.map((req, idx) => (
                                <li key={`${req.user.id}-${req.courseId}-${idx}`} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                        <div>
                                            <p className="text-sm font-medium text-indigo-600 mb-1">{req.course?.title}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                <span className="font-semibold text-gray-900">{req.user.name}</span> 
                                                <span className="text-gray-400">({req.user.email})</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleRejectCompletion(req.user.id, req.courseId)}>
                                            Reject
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleApproveCompletion(req.user.id, req.courseId)}>
                                            Approve & Send Cert
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <p>No new requests requiring attention.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Admin Section: Student Progress Overview */}
            {user.role === 'admin' && (
                <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Student Progress Overview</h2>
                        <div className="text-sm text-gray-500">
                             Total Students: {allUsers.filter(u => u.registeredCourseIds.length > 0).length}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Program</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {allUsers
                                    .filter(u => u.registeredCourseIds.length > 0)
                                    .flatMap(student => 
                                        student.registeredCourseIds.map(courseId => {
                                            const course = courses.find(c => c.id === courseId);
                                            if (!course) return null;
                                            
                                            const isPending = student.pendingCourseIds?.includes(courseId);
                                            const isCompleted = student.completedCourseIds?.includes(courseId);
                                            const progress = student.courseProgress?.[courseId] || 0;
                                            
                                            return (
                                                <tr key={`${student.id}-${courseId}`} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                                <div className="text-sm text-gray-500">{student.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{course.title}</div>
                                                        <div className="text-xs text-gray-500">{course.level}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5 w-24">
                                                            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                        <span className="text-xs text-gray-500 mt-1">{progress}%</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {isCompleted ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                                Completed
                                                            </span>
                                                        ) : isPending ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 animate-pulse">
                                                                Pending Review
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                In Progress
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        {isPending ? (
                                                            <div className="flex justify-end gap-2">
                                                                <button 
                                                                    onClick={() => handleApproveCompletion(student.id, courseId)} 
                                                                    className="text-green-600 hover:text-green-900 font-semibold text-xs border border-green-200 px-2 py-1 rounded hover:bg-green-50"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRejectCompletion(student.id, courseId)} 
                                                                    className="text-red-600 hover:text-red-900 font-semibold text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )
                                }
                                {allUsers.filter(u => u.registeredCourseIds.length > 0).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                            No students registered yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {myCourses.length > 0 ? (
                <div className="space-y-8">
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                        <div className="px-4 py-5 sm:px-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Information</h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and application status.</p>
                        </div>
                        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                            <dl className="sm:divide-y sm:divide-gray-200">
                                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Full name</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.name} {user.role === 'admin' && '(Admin)'}</dd>
                                </div>
                                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Email address</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.email}</dd>
                                </div>
                                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Training Programs Enrolled</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{myCourses.length}</dd>
                                </div>
                                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Training Programs Completed</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.completedCourseIds?.length || 0}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900">Enrolled Training Programs</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {myCourses.map(course => (
                            <CourseCard 
                                key={course.id} 
                                course={course} 
                                onRegister={() => {}}
                                isRegistered={true}
                                isCompleted={user.completedCourseIds?.includes(course.id)}
                                isPending={user.pendingCourseIds?.includes(course.id)}
                                progress={user.courseProgress?.[course.id] || 0}
                                onProgressChange={(val) => handleProgressChange(course.id, val)}
                                onRequestCompletion={handleRequestCompletion}
                                onViewCertificate={handleViewCertificate}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No training programs registered</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by selecting a training program from our catalog.</p>
                    <div className="mt-6">
                        <Button onClick={() => setCurrentView(View.COURSES)}>View Training Catalog</Button>
                    </div>
                </div>
            )}
          </div>
        );
      
      case View.CERTIFICATE:
         if (!user || !selectedCertificateCourseId) return null;
         const certCourse = courses.find(c => c.id === selectedCertificateCourseId);
         if (!certCourse) return <div>Training Program not found</div>;

         return (
             <Certificate 
                user={user} 
                course={certCourse} 
                onClose={() => setCurrentView(View.DASHBOARD)}
                onUpdateCourse={handleSaveCourse}
                allCourses={courses}
             />
         );
      
      case View.EDIT_COURSE:
        if (!editingCourse || user?.role !== 'admin') return null;
        return (
            <CourseEditor 
                course={editingCourse} 
                onSave={handleSaveCourse}
                onCancel={() => setCurrentView(View.COURSES)}
            />
        );
      
      case View.CREATE_COURSE:
        if (user?.role !== 'admin') return null;
        return (
            <CourseEditor
                course={{
                    id: `c_${Date.now()}`,
                    title: '',
                    description: '',
                    instructor: '',
                    duration: '',
                    level: CourseLevel.BEGINNER,
                    price: 0,
                    tags: [],
                    image: 'https://picsum.photos/seed/new/800/600',
                }}
                onSave={handleSaveNewCourse}
                onCancel={() => setCurrentView(View.COURSES)}
                isCreating={true}
            />
        );

      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      
      {currentView !== View.CERTIFICATE && (
          <Navbar 
            currentView={currentView} 
            onChangeView={setCurrentView} 
            user={user} 
            onLogout={handleLogout}
            pendingRequestCount={adminPendingCount}
          />
      )}
      <main>
        {renderView()}
      </main>
      {currentView !== View.CERTIFICATE && currentView !== View.EDIT_COURSE && currentView !== View.CREATE_COURSE && <AIChat courses={courses} />}
      
      {currentView !== View.CERTIFICATE && (
        <footer className="bg-gray-900 text-white py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                    <span className="text-xl font-bold">Deepmetrics Analytics Institute</span>
                    <p className="text-gray-400 text-sm mt-1">© {new Date().getFullYear()} All rights reserved.</p>
                </div>
                <div className="flex space-x-6">
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
                </div>
            </div>
        </footer>
      )}

      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Training Program?</h3>
              <p className="text-gray-500 mt-2">Are you sure you want to delete this training program? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCourseToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={confirmDeleteCourse}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;