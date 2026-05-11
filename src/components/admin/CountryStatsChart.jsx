import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card } from '../ui/Card';
import { MapPin, Users, Globe as GlobeIcon } from 'lucide-react';
import Globe from 'react-globe.gl';
import { Country } from 'country-state-city';

const COLORS = ['#4f46e5', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

const CountryStatsChart = ({ students }) => {
    const globeRef = useRef();
    const [containerWidth, setContainerWidth] = useState(400);
    const [webglSupported, setWebglSupported] = useState(true);
    const containerRef = useRef(null);

    useEffect(() => {
        // WebGL Support Check
        const checkWebGL = () => {
            try {
                const canvas = document.createElement('canvas');
                const isSupported = !!(
                    window.WebGLRenderingContext && 
                    (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
                );
                setWebglSupported(isSupported);
            } catch (e) {
                setWebglSupported(false);
            }
        };
        checkWebGL();
    }, []);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const data = useMemo(() => {
        if (!students || students.length === 0) return [];
        
        const countryCounts = {};
        
        students.forEach(student => {
            const country = student.livingCountry || student.country || 'Unknown';
            if (country !== 'Unknown' && country !== 'test country' && country !== 'Test Country') {
                countryCounts[country] = (countryCounts[country] || 0) + 1;
            }
        });

        const chartData = Object.keys(countryCounts).map((countryName, index) => {
            const countryObj = Country.getAllCountries().find(c => c.name === countryName);
            return {
                name: countryName,
                value: countryCounts[countryName],
                lat: countryObj ? parseFloat(countryObj.latitude) : 0,
                lng: countryObj ? parseFloat(countryObj.longitude) : 0,
                color: COLORS[index % COLORS.length]
            };
        }).sort((a, b) => b.value - a.value); // Sort by highest count

        return chartData;
    }, [students]);

    useEffect(() => {
        if (globeRef.current) {
            // Auto-rotate
            globeRef.current.controls().autoRotate = true;
            globeRef.current.controls().autoRotateSpeed = 0.5;
            
            // Set initial point of view to fit the markers roughly
            if (data.length > 0) {
                // Focus roughly on the center of mass or just a nice angle
                globeRef.current.pointOfView({ altitude: 2.8 }, 1000);
            }
        }
    }, [data]);

    if (data.length === 0) return null;

    const totalCountries = data.length;
    const totalAssigned = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="w-full relative overflow-hidden bg-white border border-gray-100 shadow-sm">
            <div className="flex flex-col lg:flex-row min-h-[500px]">
                
                {/* 3D Globe Section */}
                <div 
                    ref={containerRef}
                    className="flex-1 relative cursor-move flex items-center justify-center min-h-[400px] lg:min-h-full"
                >
                    <div className="absolute top-4 left-4 z-10">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 drop-shadow-sm">
                            <span className="p-2 bg-indigo-100 rounded-lg">
                                <GlobeIcon className="w-5 h-5 text-indigo-600" />
                            </span>
                            Global Network
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 pl-1">Interactive 3D Enrollment Map</p>
                    </div>

                    {webglSupported ? (
                        <Globe
                            ref={globeRef}
                            width={containerWidth}
                            height={500}
                            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                            backgroundColor="rgba(0,0,0,0)"
                            
                            pointsData={data}
                            pointLat="lat"
                            pointLng="lng"
                            pointColor="color"
                            pointAltitude={d => Math.max(0.1, Math.min(d.value * 0.05, 0.5))}
                            pointRadius={d => Math.max(0.5, Math.min(d.value * 0.2, 2))}
                            pointsMerge={false}
                            pointResolution={32}
                            
                            labelsData={data}
                            labelLat="lat"
                            labelLng="lng"
                            labelDotRadius={0}
                            labelText={d => `${d.name} (${d.value})`}
                            labelSize={1.5}
                            labelColor={() => 'rgba(255, 255, 255, 1)'}
                            labelResolution={2}
                            labelAltitude={d => Math.max(0.1, Math.min(d.value * 0.05, 0.5)) + 0.02}
                            onGlobeClick={() => {}} // dummy to prevent focus issues
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                            <div className="p-6 bg-orange-50 rounded-full mb-4">
                                <GlobeIcon className="w-16 h-16 text-orange-400 opacity-50" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">WebGL Not Supported</h3>
                            <p className="text-sm text-gray-500 max-w-xs">
                                Your browser or device doesn't support 3D rendering. 
                                You can still view the distribution list on the right.
                            </p>
                        </div>
                    )}
                </div>

                {/* Statistics List Section */}
                <div className="w-full lg:w-96 bg-gray-50 border-l border-gray-100 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                        <div>
                            <p className="text-xs text-indigo-600 uppercase tracking-wider font-bold mb-1">Total Countries</p>
                            <h3 className="text-3xl font-black text-gray-900">{totalCountries}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-indigo-600 uppercase tracking-wider font-bold mb-1">Students Mapped</p>
                            <h3 className="text-3xl font-black text-gray-900">{totalAssigned}</h3>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 max-h-[400px]">
                        {data.map((country, idx) => (
                            <div 
                                key={country.name}
                                className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all group cursor-pointer shadow-sm"
                                onClick={() => {
                                    if (globeRef.current) {
                                        globeRef.current.pointOfView({ lat: country.lat, lng: country.lng, altitude: 1.5 }, 1000);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-3 h-3 rounded-full shadow-sm" 
                                        style={{ backgroundColor: country.color }}
                                    />
                                    <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{country.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md font-semibold text-sm border border-indigo-100">
                                    <Users className="w-3 h-3" />
                                    {country.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CountryStatsChart;
