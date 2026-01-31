import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, ArrowRight, CheckCircle, Globe, Video, Phone, Mail, MapPin, ChevronDown, MessageCircle } from 'lucide-react';

const PublicHome = () => {
    const [isMediaOpen, setIsMediaOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-800">
            {/* Navigation */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2">
                            {/* Placeholder Logo if not available, replacing with text style */}
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-teal-700 leading-none">Samastha</span>
                                <span className="text-sm text-teal-600 tracking-wider">E-Learning</span>
                            </div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden lg:flex items-center space-x-6 text-[15px] font-medium">
                            <a href="#home" className="text-teal-600 hover:text-teal-800 transition-colors">Home</a>
                            <a href="#online-madrasa" className="text-gray-700 hover:text-teal-700 transition-colors">Online Madrasa</a>
                            <a href="#ongoing-education" className="text-gray-700 hover:text-teal-700 transition-colors">Ongoing Education</a>
                            <a href="#smart-madrasa" className="text-gray-700 hover:text-teal-700 transition-colors">Smart Madrasa</a>
                            <a href="#about" className="text-gray-700 hover:text-teal-700 transition-colors">About Us</a>

                            <div className="relative group">
                                <button
                                    className="flex items-center text-gray-700 hover:text-teal-700 transition-colors"
                                    onMouseEnter={() => setIsMediaOpen(true)}
                                    onMouseLeave={() => setIsMediaOpen(false)}
                                >
                                    Media <ChevronDown className="w-4 h-4 ml-1" />
                                </button>
                                {/* Dropdown would go here, simplified for now */}
                            </div>

                            <a href="#public-exams" className="text-gray-700 hover:text-teal-700 transition-colors">Public Exams</a>
                            <a href="#career" className="text-gray-700 hover:text-teal-700 transition-colors">Career</a>

                            <Link to="/login" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg">
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div id="home" className="relative bg-teal-50 overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-teal-100/50 rounded-l-[100px] transform translate-x-20"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-teal-100 text-teal-800 text-sm font-semibold tracking-wide uppercase">
                                Empowering Quality Education
                            </div>
                            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                                Realizing The <br />
                                <span className="text-teal-600">Real Path</span>
                            </h1>
                            <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                                Samastha E-Learning provides a global platform for value-based education, connecting students with qualified tutors for a comprehensive learning experience.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-2">
                                <Link to="/login" className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                                    Get Started
                                </Link>
                                <a href="#smart-madrasa" className="px-8 py-3.5 bg-white border border-gray-200 hover:border-teal-200 text-gray-700 hover:text-teal-700 rounded-lg font-bold text-lg shadow-sm hover:shadow-md transition-all">
                                    Learn More
                                </a>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-teal-600 rounded-3xl rotate-3 opacity-10"></div>
                            <img
                                src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80"
                                alt="E-Learning"
                                className="relative rounded-3xl shadow-2xl w-full object-cover transform -rotate-2 hover:rotate-0 transition-transform duration-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Features / Smart Madrasa Section */}
            <div id="smart-madrasa" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-teal-600 font-bold tracking-wide uppercase text-sm mb-3">Core Features</h2>
                        <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Smart Madrasa Digital Classroom</h3>
                        <div className="w-24 h-1.5 bg-teal-500 mx-auto rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Globe, title: "Global Reach", desc: "Connecting students across the globe with efficient digital learning tools." },
                            { icon: Video, title: "Interactive Classes", desc: "Live and recorded sessions to suit flexible learning schedules." },
                            { icon: BookOpen, title: "Islamic Curriculum", desc: "Structured moral and academic curriculum preserved by Samastha." }
                        ].map((feature, i) => (
                            <div key={i} className="bg-gray-50 p-8 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-teal-100 group">
                                <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-600 transition-colors duration-300">
                                    <feature.icon className="w-7 h-7 text-teal-700 group-hover:text-white transition-colors" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Online Madrasa Section */}
            <div id="online-madrasa" className="py-20 bg-teal-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-3xl lg:text-4xl font-bold mb-6">Join Online Madrasa Today</h2>
                    <p className="text-teal-100 max-w-2xl mx-auto mb-10 text-lg">
                        Access comprehensive study materials, track attendance, and participate in exams through our dedicated portal.
                    </p>
                    <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-teal-900 rounded-lg font-bold text-lg shadow-lg transition-transform hover:scale-105">
                        Enrol Now <CheckCircle className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-2xl font-bold text-teal-700">Samastha E-Learning</span>
                            </div>
                            <p className="text-gray-500 leading-relaxed max-w-sm">
                                Advancing moral education through technology.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-gray-900 font-bold mb-6">Quick Links</h3>
                            <ul className="space-y-3 text-gray-600">
                                <li><a href="#home" className="hover:text-teal-600 transition-colors">Home</a></li>
                                <li><a href="#about" className="hover:text-teal-600 transition-colors">About Us</a></li>
                                <li><a href="#smart-madrasa" className="hover:text-teal-600 transition-colors">Features</a></li>
                                <li><Link to="/login" className="hover:text-teal-600 transition-colors">Login</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-gray-900 font-bold mb-6">Contact</h3>
                            <ul className="space-y-3 text-gray-600">
                                <li className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-teal-500" />
                                    <span>info@samasthaelearning.com</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-teal-500" />
                                    <span>+91 123 456 7890</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-teal-500" />
                                    <span>Kerala, India</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                        <p>&copy; 2026 Samastha E-Learning. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-teal-600">Privacy Policy</a>
                            <a href="#" className="hover:text-teal-600">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* WhatsApp Floating Button */}
            <a
                href="https://wa.me/918590518541"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center"
                aria-label="Chat on WhatsApp"
            >
                <MessageCircle className="w-8 h-8 fill-current" />
            </a>
        </div>
    );
};

export default PublicHome;
